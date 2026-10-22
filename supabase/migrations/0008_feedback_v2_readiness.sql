
alter table recommendation_candidates
  add column if not exists selection_probability numeric,
  add column if not exists selection_policy text;

create table if not exists recommendation_impressions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  recommendation_run_id uuid not null references recommendation_runs(id) on delete cascade,
  recommendation_item_id uuid not null references recommendation_items(id) on delete cascade,
  article_id uuid not null references articles(id) on delete cascade,
  feedback_surface text not null check (feedback_surface in ('email','web_app','mobile_web','admin_test')),
  impression_type text not null default 'viewport' check (impression_type in ('viewport')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists recommendation_impressions_user_idx
  on recommendation_impressions(user_id, created_at desc);
create index if not exists recommendation_impressions_item_idx
  on recommendation_impressions(recommendation_item_id, created_at desc);
create index if not exists recommendation_impressions_run_idx
  on recommendation_impressions(recommendation_run_id, created_at desc);

alter table recommendation_impressions enable row level security;

drop policy if exists "Users can read own impressions" on recommendation_impressions;
create policy "Users can read own impressions" on recommendation_impressions
  for select using (auth.uid() = user_id);

drop policy if exists "Users can create own impressions" on recommendation_impressions;
create policy "Users can create own impressions" on recommendation_impressions
  for insert with check (auth.uid() = user_id);

grant select, insert on recommendation_impressions to authenticated;
grant all privileges on recommendation_impressions to service_role;

create or replace function public.upsert_feedback_assumption(
  p_user_id uuid,
  p_type text,
  p_label text,
  p_delta numeric,
  p_qcode text default null,
  p_tag text default null,
  p_knowledge_delta numeric default 0
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing user_assumptions%rowtype;
  v_evidence integer;
  v_old_weight numeric;
  v_new_weight numeric;
  v_old_level numeric;
  v_new_level numeric;
  v_structured jsonb;
begin
  select * into v_existing
  from user_assumptions
  where user_id = p_user_id
    and assumption_type = p_type
    and source = 'feedback'
    and label = p_label
    and active = true
  order by created_at desc
  limit 1;

  v_evidence := coalesce(v_existing.evidence_count, 0) + 1;
  v_old_weight := coalesce(v_existing.weight, 0);
  v_new_weight := greatest(-1, least(1, v_old_weight + p_delta));

  begin
    v_old_level := coalesce((v_existing.structured_value ->> 'level')::numeric, 1.5);
  exception when others then
    v_old_level := 1.5;
  end;
  v_new_level := greatest(0, least(3, v_old_level + coalesce(p_knowledge_delta, 0)));

  v_structured := coalesce(v_existing.structured_value, '{}'::jsonb) || jsonb_build_object(
    'weight', v_new_weight,
    'evidence_count', v_evidence,
    'last_signal', p_delta,
    'learned_from_feedback', true
  );
  if p_type = 'knowledge' then
    v_structured := v_structured || jsonb_build_object('level', v_new_level);
  end if;

  if v_existing.id is not null then
    update user_assumptions
    set
      weight = v_new_weight,
      confidence = least(0.95, 0.35 + v_evidence * 0.08),
      structured_value = v_structured,
      topic_qcode = coalesce(p_qcode, v_existing.topic_qcode),
      atlus_tag = coalesce(p_tag, v_existing.atlus_tag),
      evidence_count = v_evidence,
      last_evidence_at = now(),
      updated_at = now()
    where id = v_existing.id;
  else
    insert into user_assumptions (
      user_id, assumption_type, label, structured_value, confidence, source,
      user_confirmed, active, weight, topic_qcode, atlus_tag, evidence_count,
      last_evidence_at
    ) values (
      p_user_id, p_type, p_label, v_structured, 0.43, 'feedback',
      false, true, v_new_weight, p_qcode, p_tag, 1, now()
    );
  end if;
end;
$$;

create or replace function public.record_feedback_event_atomic(
  p_user_id uuid,
  p_article_id uuid,
  p_recommendation_item_id uuid,
  p_recommendation_run_id uuid,
  p_feedback_type text,
  p_feedback_surface text,
  p_metadata jsonb default '{}'::jsonb
) returns table(event_id uuid, inserted boolean, preference_changed boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_id uuid;
  v_event_id uuid;
  v_item recommendation_items%rowtype;
  v_article articles%rowtype;
  v_publisher_name text;
  v_metadata jsonb;
  v_tag text;
  v_topic_label text;
  v_pref_delta numeric;
  v_publisher_delta numeric;
  v_knowledge_delta numeric;
  v_pref_changed boolean := false;
begin
  if auth.role() <> 'service_role' and auth.uid() is distinct from p_user_id then
    raise exception 'Cannot record feedback for another user' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(concat_ws('|',
    p_user_id::text,
    coalesce(p_recommendation_run_id::text, '-'),
    coalesce(p_recommendation_item_id::text, '-'),
    p_feedback_type
  ), 0));

  select id into v_existing_id
  from feedback_events
  where user_id = p_user_id
    and recommendation_run_id is not distinct from p_recommendation_run_id
    and recommendation_item_id is not distinct from p_recommendation_item_id
    and feedback_type = p_feedback_type
  order by created_at asc
  limit 1;

  if v_existing_id is not null then
    return query select v_existing_id, false, false;
    return;
  end if;

  if p_recommendation_item_id is not null then
    select * into v_item
    from recommendation_items
    where id = p_recommendation_item_id;

    if v_item.id is null
       or v_item.user_id is distinct from p_user_id
       or v_item.recommendation_run_id is distinct from p_recommendation_run_id
       or (p_article_id is not null and v_item.article_id is distinct from p_article_id) then
      raise exception 'Recommendation item does not match feedback payload' using errcode = '22023';
    end if;
  end if;

  if p_article_id is not null then
    select * into v_article
    from articles
    where id = p_article_id;
  end if;

  if v_article.publisher_id is not null then
    select name into v_publisher_name from publishers where id = v_article.publisher_id;
  end if;

  v_metadata := coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
    'slot_type', v_item.slot_type,
    'rank_position', v_item.rank_position,
    'model_version', v_item.model_version,
    'recommendation_features', coalesce(v_item.feature_snapshot, '{}'::jsonb),
    'article_topic', v_article.primary_topic,
    'article_iptc_qcode', v_article.primary_iptc_qcode,
    'article_tags', coalesce(to_jsonb(v_article.atlus_tags), '[]'::jsonb)
  );

  insert into feedback_events (
    user_id, article_id, recommendation_item_id, recommendation_run_id,
    feedback_type, feedback_surface, metadata
  ) values (
    p_user_id, p_article_id, p_recommendation_item_id, p_recommendation_run_id,
    p_feedback_type, p_feedback_surface, v_metadata
  ) returning id into v_event_id;

  if p_feedback_type = 'save' and p_article_id is not null then
    insert into saved_articles (user_id, article_id, recommendation_item_id)
    values (p_user_id, p_article_id, p_recommendation_item_id)
    on conflict (user_id, article_id) do update
      set recommendation_item_id = coalesce(excluded.recommendation_item_id, saved_articles.recommendation_item_id);
  end if;

  if p_feedback_type = 'could_not_access' and p_article_id is not null then
    insert into source_access_issues (user_id, article_id, source_id, recommendation_item_id)
    values (p_user_id, p_article_id, v_article.source_id, p_recommendation_item_id);
  end if;

  if p_article_id is not null then
    v_tag := case when cardinality(v_article.atlus_tags) > 0 then v_article.atlus_tags[1] else null end;
    v_topic_label := coalesce(v_tag, v_article.primary_topic, 'General');

    v_pref_delta := case p_feedback_type
      when 'good_pick' then 0.22
      when 'save' then 0.28
      when 'more_like_this' then 0.32
      when 'not_for_me' then -0.38
      when 'less_like_this' then -0.28
      else null
    end;

    if v_pref_delta is not null then
      perform public.upsert_feedback_assumption(
        p_user_id, 'preference', v_topic_label, v_pref_delta,
        v_article.primary_iptc_qcode, v_tag, 0
      );
      v_pref_changed := true;
    end if;

    if p_feedback_type in ('good_pick','save','more_like_this','not_for_me','less_like_this')
       and v_publisher_name is not null then
      v_publisher_delta := case
        when p_feedback_type in ('good_pick','save','more_like_this') then 0.12
        else -0.16
      end;
      perform public.upsert_feedback_assumption(
        p_user_id, 'source_preference', v_publisher_name, v_publisher_delta,
        null, null, 0
      );
    end if;

    if p_feedback_type in ('too_basic','too_advanced','already_knew_this') then
      v_knowledge_delta := case p_feedback_type
        when 'too_advanced' then -0.45
        when 'too_basic' then 0.42
        else 0.28
      end;
      perform public.upsert_feedback_assumption(
        p_user_id, 'knowledge', v_topic_label, 0.08,
        v_article.primary_iptc_qcode, v_tag, v_knowledge_delta
      );
    end if;
  end if;

  return query select v_event_id, true, v_pref_changed;
end;
$$;

revoke all on function public.record_feedback_event_atomic(uuid,uuid,uuid,uuid,text,text,jsonb) from public, authenticated;
grant execute on function public.record_feedback_event_atomic(uuid,uuid,uuid,uuid,text,text,jsonb) to service_role;
revoke all on function public.upsert_feedback_assumption(uuid,text,text,numeric,text,text,numeric) from public;

create or replace view latest_slate_feedback with (security_invoker = true) as
select distinct on (user_id, recommendation_run_id)
  id, user_id, recommendation_run_id, feedback_type, feedback_surface, metadata, created_at
from feedback_events
where feedback_type in ('slate_great','slate_okay','slate_poor')
  and recommendation_run_id is not null
order by user_id, recommendation_run_id, created_at desc;

revoke all on latest_slate_feedback from public, authenticated;
grant select on latest_slate_feedback to service_role;

update model_versions
set status = 'retired'
where model_name = 'atlus_recommender'
  and status = 'production'
  and model_version <> 'recommender_v1.4_feedback_v2_ready';

insert into model_versions (
  model_name,
  model_version,
  model_type,
  config,
  status,
  deployed_at
)
values (
  'atlus_recommender',
  'recommender_v1.4_feedback_v2_ready',
  'precomputed_embedding_full_iptc_hierarchy',
  '{
    "ranking_external_api_calls": 0,
    "post_selection_explanation_calls": 1,
    "semantic_more_less_like_this": true,
    "too_similar_is_diversity_not_dislike": true,
    "source_access_penalty": true,
    "transactional_feedback": true,
    "viewport_impressions": true,
    "selection_propensity_logging": true,
    "email_feedback_confirmation": true,
    "candidate_logging": true
  }'::jsonb,
  'production',
  now()
)
on conflict (model_name, model_version) do update set
  model_type = excluded.model_type,
  config = excluded.config,
  status = excluded.status,
  deployed_at = excluded.deployed_at;

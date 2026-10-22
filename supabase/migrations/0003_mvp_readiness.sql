
alter table user_profiles
  add column if not exists perspective_preferences jsonb not null default '{}'::jsonb,
  add column if not exists geography_preferences jsonb not null default '{}'::jsonb,
  add column if not exists source_exposure text[] not null default '{}',
  add column if not exists topic_exclusions text[] not null default '{}',
  add column if not exists onboarding_version text not null default 'v1';

alter table user_assumptions
  add column if not exists weight numeric not null default 1.0,
  add column if not exists topic_qcode text,
  add column if not exists atlus_tag text,
  add column if not exists override_active boolean not null default false,
  add column if not exists evidence_count integer not null default 0,
  add column if not exists last_evidence_at timestamptz;

alter table articles
  add column if not exists primary_iptc_qcode text,
  add column if not exists secondary_iptc_qcodes text[] not null default '{}',
  add column if not exists atlus_tags text[] not null default '{}',
  add column if not exists geographies text[] not null default '{}',
  add column if not exists quality_components jsonb not null default '{}'::jsonb,
  add column if not exists content_depth text not null default 'metadata_only',
  add column if not exists processing_confidence numeric not null default 0.5,
  add column if not exists processing_attempts integer not null default 0,
  add column if not exists last_processing_attempt timestamptz;

alter table sources
  add column if not exists next_retry_at timestamptz,
  add column if not exists last_error text,
  add column if not exists last_item_count integer not null default 0;

alter table recommendation_runs
  add column if not exists user_state_snapshot jsonb not null default '{}'::jsonb;

alter table recommendation_items
  drop constraint if exists recommendation_items_user_id_article_id_key;
create unique index if not exists recommendation_items_run_article_unique
  on recommendation_items(recommendation_run_id, article_id);

create table if not exists recommendation_candidates (
  id uuid primary key default gen_random_uuid(),
  recommendation_run_id uuid not null references recommendation_runs(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  article_id uuid not null references articles(id) on delete cascade,
  slot_type text not null check (slot_type in ('core','stretch','discovery')),
  raw_score numeric not null default 0,
  final_score numeric not null default 0,
  eligible boolean not null default true,
  rank_before_slate integer,
  selected boolean not null default false,
  exploration boolean not null default false,
  feature_snapshot jsonb not null default '{}'::jsonb,
  model_version text not null,
  created_at timestamptz not null default now(),
  unique(recommendation_run_id, article_id, slot_type)
);

create table if not exists email_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  recommendation_run_id uuid references recommendation_runs(id) on delete set null,
  local_delivery_date date not null,
  status text not null default 'pending' check (status in ('pending','sent','failed','skipped')),
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, local_delivery_date)
);

create table if not exists source_access_issues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  article_id uuid references articles(id) on delete set null,
  source_id uuid references sources(id) on delete set null,
  recommendation_item_id uuid references recommendation_items(id) on delete set null,
  status text not null default 'open' check (status in ('open','resolved','ignored')),
  created_at timestamptz not null default now()
);

create index if not exists articles_iptc_idx on articles(primary_iptc_qcode);
create index if not exists articles_published_idx on articles(published_at desc);
create index if not exists article_content_hash_idx on articles(content_hash) where content_hash is not null;
create index if not exists source_retry_idx on sources(status, next_retry_at);
create index if not exists user_assumptions_topic_idx on user_assumptions(user_id, topic_qcode, active);
create index if not exists candidates_run_idx on recommendation_candidates(recommendation_run_id, slot_type, rank_before_slate);
create index if not exists candidates_user_idx on recommendation_candidates(user_id, created_at desc);
create index if not exists deliveries_due_idx on email_deliveries(user_id, local_delivery_date);

drop view if exists recommendation_items_view;
drop view if exists articles_admin_view;
drop view if exists articles_for_ranking_view;

create view articles_for_ranking_view as
select
  a.id,
  a.title,
  a.subtitle,
  a.canonical_url,
  a.publisher_id,
  a.source_id,
  coalesce(p.name, 'Unknown publisher') as publisher_name,
  a.author,
  a.published_at,
  a.reading_time_minutes,
  a.primary_topic,
  a.secondary_topics,
  a.primary_iptc_qcode,
  a.secondary_iptc_qcodes,
  a.atlus_tags,
  a.geographies,
  a.entities,
  a.article_type,
  a.complexity_level,
  a.content_depth,
  a.processing_confidence,
  a.quality_score,
  a.quality_components,
  a.freshness_score,
  a.evergreen_score,
  a.status,
  e.embedding
from articles a
left join publishers p on p.id = a.publisher_id
left join article_embeddings e on e.article_id = a.id and e.embedding_version = 'v1';

create view articles_admin_view as
select
  a.*,
  coalesce(p.name, 'Unknown publisher') as publisher_name,
  s.name as source_name,
  s.status as source_status,
  s.error_count as source_error_count,
  s.last_successful_sync,
  s.last_failed_sync,
  s.next_retry_at,
  s.last_error
from articles a
left join publishers p on p.id = a.publisher_id
left join sources s on s.id = a.source_id;

create view recommendation_items_view as
select
  ri.id,
  ri.recommendation_run_id,
  ri.user_id,
  ri.article_id,
  ri.slot_type,
  ri.rank_position,
  ri.score,
  ri.explanation_text,
  ri.explanation_reason_codes,
  ri.feature_snapshot,
  ri.model_version,
  ri.created_at,
  jsonb_build_object(
    'id', a.id,
    'title', a.title,
    'subtitle', a.subtitle,
    'canonical_url', a.canonical_url,
    'publisher_id', a.publisher_id,
    'source_id', a.source_id,
    'publisher_name', coalesce(p.name, 'Unknown publisher'),
    'author', a.author,
    'published_at', a.published_at,
    'reading_time_minutes', a.reading_time_minutes,
    'primary_topic', a.primary_topic,
    'secondary_topics', a.secondary_topics,
    'primary_iptc_qcode', a.primary_iptc_qcode,
    'secondary_iptc_qcodes', a.secondary_iptc_qcodes,
    'atlus_tags', a.atlus_tags,
    'geographies', a.geographies,
    'entities', a.entities,
    'article_type', a.article_type,
    'complexity_level', a.complexity_level,
    'content_depth', a.content_depth,
    'processing_confidence', a.processing_confidence,
    'quality_score', a.quality_score,
    'quality_components', a.quality_components,
    'freshness_score', a.freshness_score,
    'evergreen_score', a.evergreen_score
  ) as article
from recommendation_items ri
join articles a on a.id = ri.article_id
left join publishers p on p.id = a.publisher_id;

alter table recommendation_candidates enable row level security;
alter table email_deliveries enable row level security;
alter table source_access_issues enable row level security;

drop policy if exists "Users can read own candidates" on recommendation_candidates;
create policy "Users can read own candidates" on recommendation_candidates
  for select using (auth.uid() = user_id);

drop policy if exists "Users can read own deliveries" on email_deliveries;
create policy "Users can read own deliveries" on email_deliveries
  for select using (auth.uid() = user_id);

grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on profiles to service_role;
grant select, insert, update, delete on user_profiles to authenticated, service_role;
grant select, insert, update, delete on user_assumptions to authenticated, service_role;
grant select on publishers, sources, articles, article_embeddings to authenticated;
grant all privileges on publishers, sources, articles, article_embeddings, temporary_article_texts to service_role;
grant select on recommendation_runs, recommendation_items, recommendation_candidates, email_deliveries to authenticated;
grant all privileges on recommendation_runs, recommendation_items, recommendation_candidates, feedback_events, saved_articles, email_deliveries, source_access_issues, admin_logs to service_role;
grant select on articles_for_ranking_view, articles_admin_view, recommendation_items_view to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

update model_versions set status = 'retired' where model_name = 'atlus_recommender' and status = 'production' and model_version <> 'recommender_v1.2_mvp';

insert into model_versions (model_name, model_version, model_type, config, status, deployed_at)
values (
  'atlus_recommender',
  'recommender_v1.2_mvp',
  'interpretable_embedding_taxonomy_hybrid',
  '{
    "core":{"preference":0.55,"goal":0.08,"quality":0.12,"knowledge":0.08,"freshness_or_evergreen":0.07,"source":0.04,"reading_time":0.03,"geography":0.03,"min_preference":0.12},
    "stretch":{"goal":0.55,"preference":0.08,"quality":0.12,"knowledge":0.10,"freshness_or_evergreen":0.07,"source":0.03,"reading_time":0.02,"geography":0.03,"min_goal":0.12},
    "discovery":{"bridge":0.30,"novelty":0.25,"quality":0.18,"knowledge":0.08,"freshness_or_evergreen":0.08,"source":0.04,"geography":0.04,"goal":0.03,"min_connection":0.12,"min_quality":0.50},
    "candidate_logging":true,
    "controlled_exploration_rate":0.08,
    "iptc_backbone":true
  }'::jsonb,
  'production',
  now()
)
on conflict (model_name, model_version) do update set
  config = excluded.config,
  status = excluded.status,
  deployed_at = excluded.deployed_at;

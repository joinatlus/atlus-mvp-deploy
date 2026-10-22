
alter table articles
  add column if not exists concepts text[] not null default '{}';

create table if not exists user_assumption_embeddings (
  id uuid primary key default gen_random_uuid(),
  assumption_id uuid not null references user_assumptions(id) on delete cascade,
  embedding_kind text not null check (embedding_kind in ('semantic','concepts')),
  embedding vector(1536) not null,
  source_text text not null,
  embedding_model text not null,
  embedding_version text not null default 'v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(assumption_id, embedding_kind, embedding_version)
);

create table if not exists user_recommendation_embeddings (
  user_id uuid not null references profiles(id) on delete cascade,
  embedding_kind text not null check (embedding_kind in ('preferences','goals','avoidances')),
  embedding vector(1536) not null,
  source_text text not null,
  embedding_model text not null,
  embedding_version text not null default 'v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id, embedding_kind, embedding_version)
);

create index if not exists user_assumption_embeddings_assumption_idx
  on user_assumption_embeddings(assumption_id, embedding_kind);
create index if not exists user_recommendation_embeddings_user_idx
  on user_recommendation_embeddings(user_id, embedding_kind);

alter table user_assumption_embeddings enable row level security;
alter table user_recommendation_embeddings enable row level security;

drop policy if exists "Users can manage own assumption embeddings" on user_assumption_embeddings;
create policy "Users can manage own assumption embeddings" on user_assumption_embeddings
  for all
  using (
    exists (
      select 1 from user_assumptions ua
      where ua.id = assumption_id and ua.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from user_assumptions ua
      where ua.id = assumption_id and ua.user_id = auth.uid()
    )
  );

drop policy if exists "Users can manage own recommendation embeddings" on user_recommendation_embeddings;
create policy "Users can manage own recommendation embeddings" on user_recommendation_embeddings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on user_assumption_embeddings to authenticated;
grant select, insert, update, delete on user_recommendation_embeddings to authenticated;
grant all privileges on user_assumption_embeddings, user_recommendation_embeddings to service_role;

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
  a.concepts,
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
  content_embedding.embedding as embedding,
  concept_embedding.embedding as concept_embedding
from articles a
left join publishers p on p.id = a.publisher_id
left join article_embeddings content_embedding
  on content_embedding.article_id = a.id
  and content_embedding.embedding_version = 'v1'
left join article_embeddings concept_embedding
  on concept_embedding.article_id = a.id
  and concept_embedding.embedding_version = 'concept_v1';

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
    'concepts', a.concepts,
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

grant select on articles_for_ranking_view, articles_admin_view, recommendation_items_view
  to authenticated, service_role;

update model_versions
set status = 'retired'
where model_name = 'atlus_recommender'
  and status = 'production'
  and model_version <> 'recommender_v1.3_precomputed_concepts';

insert into model_versions (model_name, model_version, model_type, config, status, deployed_at)
values (
  'atlus_recommender',
  'recommender_v1.3_precomputed_concepts',
  'precomputed_embedding_taxonomy_concept_hybrid',
  '{
    "slate_time_external_api_calls":0,
    "preserves_v1_2_aggregate_query_embeddings":true,
    "article_content_embedding":true,
    "article_concept_embedding":true,
    "per_goal_semantic_embedding":true,
    "per_goal_concept_embedding":true,
    "core":{"preference":0.55,"aggregate_goal":0.08,"quality":0.12,"knowledge":0.08,"freshness_or_evergreen":0.07,"source":0.04,"reading_time":0.03,"geography":0.03,"min_preference":0.12},
    "stretch":{"specific_goal":0.55,"preference":0.07,"quality":0.11,"knowledge":0.09,"freshness_or_evergreen":0.05,"source":0.02,"reading_time":0.01,"geography":0.01,"concept_bonus":0.09,"min_semantic":0.18,"min_concept":0.22,"min_total_goal":0.28,"concept_bridge":0.32,"taxonomy_bridge":0.62},
    "candidate_logging":true,
    "iptc_backbone":true
  }'::jsonb,
  'production',
  now()
)
on conflict (model_name, model_version) do update set
  config = excluded.config,
  status = excluded.status,
  deployed_at = excluded.deployed_at;

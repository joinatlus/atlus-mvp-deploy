create or replace view articles_for_ranking_view as
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
  a.entities,
  a.article_type,
  a.complexity_level,
  a.quality_score,
  a.freshness_score,
  a.evergreen_score,
  a.status,
  e.embedding
from articles a
left join publishers p on p.id = a.publisher_id
left join article_embeddings e on e.article_id = a.id and e.embedding_version = 'v1';

grant select on articles_for_ranking_view to authenticated;
grant select on articles_for_ranking_view to service_role;

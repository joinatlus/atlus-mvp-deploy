insert into publishers (name, website_url, partner_status, rights_agreement_status)
values ('Works in Progress', 'https://worksinprogress.co', 'prospect', 'temporary_processing_allowed')
on conflict (name) do nothing;

insert into sources (publisher_id, name, source_type, rights_status, status)
select id, 'WIP manual seed', 'manual_import', 'temporary_content_processing_allowed', 'active'
from publishers where name = 'Works in Progress'
on conflict (publisher_id, name) do nothing;

insert into articles (
  publisher_id, source_id, canonical_url, title, subtitle, rights_status, status,
  reading_time_minutes, primary_topic, secondary_topics, entities, article_type,
  complexity_level, quality_score, freshness_score, evergreen_score, summary
)
select p.id, s.id, 'https://worksinprogress.co/example-ai-policy', 'How to think clearly about AI policy', 'A durable primer on regulation without hype.', 'temporary_content_processing_allowed', 'active',
  8, 'Artificial Intelligence', array['Politics & Government','Science & Technology'], array['OpenAI','AI Act'], 'explainer', 'intermediate', 0.82, 0.55, 0.88, 'A clear article on AI policy tradeoffs.'
from publishers p join sources s on s.publisher_id = p.id where p.name='Works in Progress'
on conflict (canonical_url) do nothing;

insert into publishers (name, website_url, partner_status, rights_agreement_status)
values ('The Guardian', 'https://www.theguardian.com', 'none', 'metadata_only')
on conflict (name) do update set rights_agreement_status = excluded.rights_agreement_status;

insert into sources (publisher_id, name, source_type, endpoint_url, rights_status, ingestion_frequency, status, processing_rules)
select p.id, source_name, 'rss', endpoint_url, 'metadata_only', '6h', 'active', '{"metadata_only":true}'::jsonb
from publishers p
cross join (values
  ('Guardian World RSS', 'https://www.theguardian.com/world/rss'),
  ('Guardian UK RSS', 'https://www.theguardian.com/uk/rss'),
  ('Guardian Politics RSS', 'https://www.theguardian.com/politics/rss'),
  ('Guardian Technology RSS', 'https://www.theguardian.com/technology/rss'),
  ('Guardian Business RSS', 'https://www.theguardian.com/business/rss'),
  ('Guardian Science RSS', 'https://www.theguardian.com/science/rss'),
  ('Guardian Environment RSS', 'https://www.theguardian.com/environment/rss'),
  ('Guardian Culture RSS', 'https://www.theguardian.com/culture/rss')
) as feeds(source_name, endpoint_url)
where p.name = 'The Guardian'
on conflict (publisher_id, name) do update set endpoint_url = excluded.endpoint_url, status = 'active', rights_status = 'metadata_only';

update articles
set primary_iptc_qcode = '13000000',
    atlus_tags = array['Artificial intelligence','Technology policy'],
    content_depth = 'short_excerpt',
    processing_confidence = 0.7,
    quality_components = '{"depth":0.7,"substance":0.85,"clarity":0.9,"originality":0.72}'::jsonb
where canonical_url = 'https://worksinprogress.co/example-ai-policy';

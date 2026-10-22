insert into publishers (
  name,
  website_url,
  partner_status,
  rights_agreement_status
)
values (
  'The Guardian',
  'https://www.theguardian.com',
  'none',
  'metadata_only'
)
on conflict (name) do update set
  website_url = excluded.website_url,
  partner_status = excluded.partner_status,
  rights_agreement_status = excluded.rights_agreement_status;

insert into sources (
  publisher_id,
  name,
  source_type,
  endpoint_url,
  rights_status,
  ingestion_frequency,
  status,
  processing_rules
)
select
  id,
  source_name,
  'rss',
  endpoint_url,
  'metadata_only',
  'daily',
  'active',
  jsonb_build_object(
    'note', 'Guardian RSS source. Use metadata/excerpts only unless separate rights are agreed.'
  )
from publishers
cross join (
  values
    ('Guardian World RSS', 'https://www.theguardian.com/world/rss'),
    ('Guardian UK RSS', 'https://www.theguardian.com/uk/rss'),
    ('Guardian Politics RSS', 'https://www.theguardian.com/politics/rss'),
    ('Guardian Technology RSS', 'https://www.theguardian.com/technology/rss'),
    ('Guardian Business RSS', 'https://www.theguardian.com/business/rss'),
    ('Guardian Science RSS', 'https://www.theguardian.com/science/rss'),
    ('Guardian Environment RSS', 'https://www.theguardian.com/environment/rss'),
    ('Guardian Culture RSS', 'https://www.theguardian.com/culture/rss')
) as guardian_sources(source_name, endpoint_url)
where publishers.name = 'The Guardian'
on conflict (publisher_id, name) do update set
  source_type = excluded.source_type,
  endpoint_url = excluded.endpoint_url,
  rights_status = excluded.rights_status,
  ingestion_frequency = excluded.ingestion_frequency,
  status = excluded.status,
  processing_rules = excluded.processing_rules;
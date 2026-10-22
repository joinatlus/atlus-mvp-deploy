create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Replace these once before running the schedules.
select vault.create_secret('https://YOUR-SITE.netlify.app', 'atlus_app_url');
select vault.create_secret('REPLACE_WITH_YOUR_CRON_SECRET', 'atlus_cron_secret');

select cron.schedule(
  'atlus-ingest-articles',
  '15 0,6,12,18 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'atlus_app_url' limit 1)
      || '/api/jobs/ingest-articles?limitPerSource=30&processLimit=40',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'atlus_cron_secret' limit 1)
    ),
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'atlus-daily-email',
  '0 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'atlus_app_url' limit 1)
      || '/api/jobs/daily-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'atlus_cron_secret' limit 1)
    ),
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'atlus-cleanup-old-embeddings',
  '30 3 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'atlus_app_url' limit 1)
      || '/api/jobs/cleanup-old-embeddings?retentionDays=180&batchSize=500',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'atlus_cron_secret' limit 1)
    ),
    body := '{}'::jsonb
  );
  $$
);

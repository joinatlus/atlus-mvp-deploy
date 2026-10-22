# Deployment

The current production setup is designed to stay on free tiers for as long as the beta fits within their allowances:

- Netlify: Next.js app and background functions
- Supabase: Auth, Postgres, pgvector and Cron
- Resend: email
- OpenAI: usage-based processing

## 1. Check the app locally

```bash
npm ci
npm run typecheck
npm run build
```

## 2. Apply Supabase migrations

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase migration list
supabase db push --dry-run
supabase db push
```

Do not run `db reset` against production.

Make sure the `publishers` and `sources` tables contain the feeds you actually want to run in production and that each source has the correct rights setting.

## 3. Configure Supabase Auth

Set the production Site URL and add this redirect URL:

```text
https://YOUR_DOMAIN/auth/callback
```

Keep localhost as an additional redirect for development.

## 4. Configure Resend

Verify the sending domain and create an API key. A typical sender is:

```text
EMAIL_FROM=Atlus <hello@YOUR_DOMAIN>
```

## 5. Deploy to Netlify

Import the repository from GitHub. `netlify.toml` contains the build/function configuration.

Set these environment variables in Netlify:

```text
NEXT_PUBLIC_APP_URL=https://YOUR_DOMAIN
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_CLASSIFICATION_MODEL=gpt-4o-mini
OPENAI_EXPLANATION_MODEL=gpt-4o-mini
RESEND_API_KEY=...
EMAIL_FROM=Atlus <hello@YOUR_DOMAIN>
SIGNING_SECRET=...
CRON_SECRET=...
ADMIN_EMAILS=you@example.com
```

Generate separate signing and cron secrets, for example:

```bash
openssl rand -hex 32
```

Redeploy after changing `NEXT_PUBLIC_APP_URL`.

## 6. Schedule the jobs

Open `supabase/snippets/Configure Free Deployment Cron.sql`, replace the Netlify URL and `CRON_SECRET` placeholders, then run it once in the Supabase SQL editor.

The default schedule is:

```text
00:15, 06:15, 12:15, 18:15 UTC  article ingestion and processing
Every hour                        due-email check
03:30 UTC                         old-embedding cleanup
```

## 7. Smoke test production

Trigger a small ingest:

```bash
curl -i -X POST \
  "https://YOUR_DOMAIN/api/jobs/ingest-articles?limitPerSource=5&processLimit=5" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Check Netlify logs and confirm new articles reach `active` status in Supabase.

Create a real account, complete onboarding and verify Today, Profile, Settings, Archive and feedback.

To test email delivery, set the test account's delivery time near the current local hour and call:

```bash
curl -i -X POST \
  "https://YOUR_DOMAIN/api/jobs/daily-email" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Confirm the message in Resend and the delivery row in Supabase. Calling the job again for the same user/local date should not send another edition.

## 8. Watch the free-tier limits

Keep an eye on Netlify function usage, Supabase database size, source errors, Resend sends/bounces and OpenAI spend. The cleanup job removes eligible old embeddings while retaining article metadata and recommendation history.

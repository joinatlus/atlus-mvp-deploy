# Atlus

Atlus is a personalised reading product built around a small daily edition rather than an infinite feed.

## Stack

- Next.js 14, React and TypeScript
- Supabase Auth, Postgres and pgvector
- OpenAI for article classification, embeddings and recommendation explanations
- Resend for email delivery
- Netlify for the app and background jobs
- Supabase Cron for scheduling

## Local development

To explore the UX without Supabase or any account, run:

```bash
npm ci
npm run dev
```

For the full visitor flow, also run the `marketing-site` development server
at `http://localhost:8080` (or use the `Atlus: website + demo` VS Code task).
Start there, then choose **Start onboarding** and **Join Atlus** to reach
`http://localhost:3000/onboarding`. Opening `http://localhost:3000` also
redirects to the marketing page. To inspect the product alone, open
`http://localhost:3000/today`.

Development mode uses sample content when Supabase
keys are absent. The `Local demo` label identifies these screens. Onboarding,
settings and feedback can be explored, but demo submissions do not save data or
contact Supabase. Demo mode is disabled in production builds.

To explore the public website and product together in VS Code, run the
`Atlus: website + demo` task. The website opens at `http://localhost:8080`;
its local `Explore onboarding` button opens this app at `http://localhost:3000/onboarding`.

To connect a separate Supabase project for real local data, run:

```bash
npm ci
cp .env.example .env.local
supabase start
supabase db reset
npm run dev
```

Set `ATLUS_DEMO_MODE=false` and fill in the Supabase values in `.env.local`.
Never point the local app at a production Supabase project just to try the UX.

`npm run sync:iptc` refreshes the local IPTC Media Topics snapshot. It also runs automatically before development, type-checking and production builds.

## Environment

The required variables are listed in `.env.example`. For the real data-backed app you will need Supabase credentials, `SIGNING_SECRET`, `CRON_SECRET` and `NEXT_PUBLIC_APP_URL`.

OpenAI is required for production-quality article processing. Resend is required for daily email delivery.

## Main flow

1. A user creates an account and completes onboarding.
2. RSS sources are fetched on a schedule.
3. New articles are classified and embedded once.
4. Atlus ranks a daily edition from stored article and user representations.
5. The edition is available on the web and can be sent by email.
6. Feedback updates the learned part of the user's profile without overwriting explicit preferences.

## Background jobs

Production uses three protected background endpoints:

```text
POST /api/jobs/ingest-articles
POST /api/jobs/daily-email
POST /api/jobs/cleanup-old-embeddings
```

Supabase Cron calls them using `CRON_SECRET`. The default schedule is four ingestion runs per day, an hourly delivery check and one daily storage cleanup.

See `DEPLOYMENT.md` for the production setup.

## Database

Migrations are in `supabase/migrations`. For an existing Supabase project, apply pending migrations with `supabase db push`; do not reset a live database.

Article rights are stored per source. Metadata-only sources should not retain full article text. Sources that allow temporary processing have their temporary text removed after processing.

## Recommender

The ranker works from stored profile signals and embeddings. It does not call a model while ranking a slate. Once selection is complete, Atlus can make one optional model call to turn the stored selection reasons into short article-specific explanations.

The detailed recommender, feedback and taxonomy notes are in `docs/`.

## Checks

Before deploying:

```bash
npm run typecheck
npm run build
```

Then smoke-test signup, onboarding, article ingestion, Today, feedback, email delivery and the scheduled jobs against the production database.

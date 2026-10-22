# Atlus MVP Database Schema

## 1. Overview

Use Postgres as the source of truth.

Use pgvector or equivalent vector support for article embeddings.

The schema should support:

- users;
- user profiles;
- visible user assumptions;
- publishers and sources;
- articles;
- article features and embeddings;
- recommendation runs;
- recommendation items;
- feedback events;
- saved articles;
- admin logs.

The schema should be simple enough for the MVP but not disposable.

## 2. Tables

## 2.1 users

Stores account-level user information.

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  account_status text not null default 'active',
  email_verified boolean not null default false,
  subscription_status text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

If using Supabase Auth, this table can either mirror `auth.users` or be called `profiles` and reference Supabase auth IDs.

## 2.2 user_profiles

Stores current recommendation settings.

```sql
create table user_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  reading_mode text not null default 'standard',
  delivery_time time not null default '08:00',
  timezone text not null default 'Europe/London',
  preferred_article_length text default 'medium',
  novelty_tolerance text default 'medium',
  onboarding_status text not null default 'not_started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reading_mode_check check (reading_mode in ('light', 'standard', 'deep')),
  constraint novelty_tolerance_check check (novelty_tolerance in ('low', 'medium', 'high'))
);
```

## 2.3 user_assumptions

Stores visible assumptions Atlus uses for personalisation.

```sql
create table user_assumptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  assumption_type text not null,
  label text not null,
  structured_value jsonb not null default '{}',
  confidence numeric not null default 1.0,
  source text not null default 'onboarding',
  user_confirmed boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  retired_at timestamptz,
  constraint assumption_type_check check (
    assumption_type in ('preference', 'goal', 'knowledge', 'avoidance', 'source_preference')
  ),
  constraint assumption_source_check check (
    source in ('onboarding', 'feedback', 'user_edit', 'model_update', 'admin')
  )
);
```

Examples:

```text
preference: interested in AI policy
goal: wants to understand economics better
knowledge: advanced in basic machine learning
avoidance: wants less celebrity news
```

## 2.4 publishers

Stores the organisation/publication that produced an article.

```sql
create table publishers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  website_url text,
  logo_url text,
  description text,
  partner_status text not null default 'none',
  rights_agreement_status text not null default 'unknown',
  dashboard_enabled boolean not null default false,
  default_attribution_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_status_check check (partner_status in ('none', 'prospect', 'partner')),
  constraint rights_agreement_status_check check (
    rights_agreement_status in ('unknown', 'metadata_only', 'temporary_processing', 'licensed', 'blocked')
  )
);
```

## 2.5 sources

Stores the specific feed/API/manual source that provides articles.

```sql
create table sources (
  id uuid primary key default gen_random_uuid(),
  publisher_id uuid not null references publishers(id) on delete cascade,
  name text not null,
  source_type text not null,
  endpoint_url text,
  auth_required boolean not null default false,
  ingestion_frequency text default 'manual',
  rights_status text not null default 'unknown',
  status text not null default 'active',
  last_successful_sync timestamptz,
  last_failed_sync timestamptz,
  error_count integer not null default 0,
  processing_rules jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint source_type_check check (source_type in ('manual', 'rss', 'api', 'partner_feed')),
  constraint source_status_check check (status in ('active', 'inactive', 'failed', 'blocked')),
  constraint source_rights_check check (
    rights_status in ('unknown', 'metadata_only', 'temporary_processing', 'licensed', 'blocked')
  )
);
```

## 2.6 articles

Stores canonical article metadata.

```sql
create table articles (
  id uuid primary key default gen_random_uuid(),
  publisher_id uuid not null references publishers(id),
  source_id uuid references sources(id),
  canonical_url text not null unique,
  title text not null,
  subtitle text,
  author text,
  published_at timestamptz,
  retrieved_at timestamptz not null default now(),
  language text default 'en',
  section text,
  reading_time_minutes integer,
  paywall_status text not null default 'unknown',
  rights_status text not null default 'unknown',
  content_hash text,
  duplicate_group_id uuid,
  quality_score numeric,
  freshness_score numeric,
  evergreen_score numeric,
  complexity_level text,
  article_type text,
  status text not null default 'pending',
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint article_status_check check (status in ('pending', 'processing', 'active', 'failed', 'rejected', 'blocked', 'archived')),
  constraint paywall_status_check check (paywall_status in ('free', 'metered', 'paid', 'unknown')),
  constraint article_rights_check check (
    rights_status in ('unknown', 'metadata_only', 'temporary_processing', 'licensed', 'blocked')
  ),
  constraint complexity_level_check check (complexity_level in ('introductory', 'intermediate', 'advanced') or complexity_level is null)
);
```

## 2.7 article_topics

Stores topic labels.

```sql
create table article_topics (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles(id) on delete cascade,
  topic text not null,
  is_primary boolean not null default false,
  confidence numeric not null default 1.0,
  created_at timestamptz not null default now()
);

create index article_topics_article_id_idx on article_topics(article_id);
create index article_topics_topic_idx on article_topics(topic);
```

## 2.8 article_entities

Stores named people, organisations, places, laws, products, technologies, or events mentioned in the article.

```sql
create table article_entities (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles(id) on delete cascade,
  entity_name text not null,
  entity_type text,
  confidence numeric not null default 1.0,
  created_at timestamptz not null default now()
);

create index article_entities_article_id_idx on article_entities(article_id);
create index article_entities_name_idx on article_entities(entity_name);
```

## 2.9 article_embeddings

Stores article embedding vectors.

If using pgvector:

```sql
create extension if not exists vector;

create table article_embeddings (
  article_id uuid primary key references articles(id) on delete cascade,
  embedding vector(1536) not null,
  embedding_model text not null,
  embedding_version text not null default 'v1',
  generated_at timestamptz not null default now()
);
```

Create an index when the table grows large enough:

```sql
create index article_embeddings_embedding_idx
on article_embeddings
using hnsw (embedding vector_cosine_ops);
```

## 2.10 recommendation_runs

Stores each daily recommendation run for each user.

```sql
create table recommendation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  model_version text not null,
  reading_mode text not null,
  run_for_date date not null,
  status text not null default 'pending',
  requested_count integer not null,
  generated_count integer not null default 0,
  fallback_used boolean not null default false,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(user_id, run_for_date),
  constraint recommendation_run_status_check check (status in ('pending', 'completed', 'failed', 'skipped'))
);
```

## 2.11 recommendation_items

Stores individual articles shown to users.

```sql
create table recommendation_items (
  id uuid primary key default gen_random_uuid(),
  recommendation_run_id uuid not null references recommendation_runs(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  article_id uuid not null references articles(id),
  slot_type text not null,
  rank_position integer not null,
  score numeric,
  explanation text,
  explanation_reason_codes text[] not null default '{}',
  feature_snapshot jsonb not null default '{}',
  model_version text not null,
  created_at timestamptz not null default now(),
  constraint slot_type_check check (slot_type in ('core', 'stretch', 'discovery')),
  unique(user_id, article_id)
);

create index recommendation_items_user_id_idx on recommendation_items(user_id);
create index recommendation_items_article_id_idx on recommendation_items(article_id);
```

## 2.12 feedback_events

Stores all feedback as append-only events.

```sql
create table feedback_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  article_id uuid not null references articles(id),
  recommendation_item_id uuid references recommendation_items(id) on delete set null,
  recommendation_run_id uuid references recommendation_runs(id) on delete set null,
  feedback_type text not null,
  feedback_surface text not null,
  model_version text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  constraint feedback_type_check check (
    feedback_type in (
      'read_article',
      'good_pick',
      'not_for_me',
      'save',
      'more_like_this',
      'less_like_this',
      'too_basic',
      'too_advanced',
      'already_knew_this',
      'too_similar',
      'could_not_access',
      'slate_great',
      'slate_okay',
      'slate_poor'
    )
  ),
  constraint feedback_surface_check check (feedback_surface in ('email', 'web_app', 'mobile_web', 'admin_test'))
);

create index feedback_events_user_id_idx on feedback_events(user_id);
create index feedback_events_article_id_idx on feedback_events(article_id);
```

## 2.13 saved_articles

Convenience table for saved articles.

```sql
create table saved_articles (
  user_id uuid not null references users(id) on delete cascade,
  article_id uuid not null references articles(id) on delete cascade,
  recommendation_item_id uuid references recommendation_items(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, article_id)
);
```

Still also store `save` as a feedback event.

## 2.14 email_feedback_tokens

Stores signed/hashed feedback links if not using stateless JWTs.

```sql
create table email_feedback_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  user_id uuid not null references users(id) on delete cascade,
  recommendation_item_id uuid not null references recommendation_items(id) on delete cascade,
  feedback_type text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
```

For MVP, stateless signed tokens are simpler. This table is optional if tokens are stateless.

## 2.15 admin_logs

Stores admin actions.

```sql
create table admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references users(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
```

## 3. MVP data rules

- Only articles with `status = 'active'` can be recommended.
- Only articles with clear `rights_status` can become active.
- Do not show a user the same article twice.
- Store feedback as append-only events.
- Store recommendation feature snapshots at recommendation time.
- Keep personalisation assumptions visible and editable.
- Use hard filters before ranking.

## 4. Initial seed data

Create initial publishers:

```text
Works in Progress
The Guardian
Manual Import
```

Create initial top-level topics:

```text
Politics & Government
Economics & Business
Science & Technology
Artificial Intelligence
Climate & Energy
International Affairs
Culture & Ideas
Health & Society
History
Progress & Innovation
Media & Internet
Law & Institutions
```

## v1.3 representation additions

Migration `0004_precomputed_representations.sql` adds the semantic state used by recommender v1.3:

- `articles.concepts`: compact, disambiguated concepts extracted once during article processing;
- `article_embeddings` row `embedding_version = 'concept_v1'`: concept-only article vector alongside the existing `v1` content vector;
- `user_assumption_embeddings`: per-learning-goal semantic and concept vectors, keyed by assumption;
- `user_recommendation_embeddings`: cached aggregate `preferences`, `goals` and `avoidances` vectors.

The aggregate `source_text` is persisted alongside each vector so recommendation behaviour is auditable and a cache can be regenerated deterministically. These vectors are refreshed when user state changes. Recommendation/slate generation itself does not call an external model API.

## v1.4 full IPTC hierarchy

Migration `0005_full_iptc.sql` does not add article columns. The existing `primary_iptc_qcode text` and `secondary_iptc_qcodes text[]` fields already support deep Media Topic QCodes. The migration registers `recommender_v1.4_full_iptc` as the production model version.

Migration `0006_stretch_learning_goals.sql` also requires no schema change. It registers `recommender_v1.4_stretch_goals`; per-goal starting knowledge, learning mode and focus are stored in `user_assumptions.structured_value`.

The hierarchy itself is application data in `lib/iptc-media-topics.generated.json`, refreshed from IPTC with `npm run sync:iptc`. Parent/depth/top-level relationships are used at ranking time; no database join or external taxonomy call is required during slate generation.

Migration `0007_explanations_and_reading_time.sql` clears legacy fabricated reading times for non-full-text articles and registers `recommender_v1.4_explanations`. It does not refetch or reprocess articles.

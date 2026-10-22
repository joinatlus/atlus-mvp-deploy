create extension if not exists pgcrypto;
create extension if not exists vector;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  name text,
  account_status text not null default 'active' check (account_status in ('active','paused','deleted')),
  subscription_status text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_profiles (
  user_id uuid primary key references profiles(id) on delete cascade,
  reading_mode text not null default 'standard' check (reading_mode in ('light','standard','deep')),
  delivery_time time not null default '08:00',
  timezone text not null default 'Europe/London',
  preferred_article_length text not null default 'medium' check (preferred_article_length in ('short','medium','long')),
  novelty_tolerance text not null default 'medium' check (novelty_tolerance in ('low','medium','high')),
  onboarding_status text not null default 'not_started' check (onboarding_status in ('not_started','complete')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_assumptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  assumption_type text not null check (assumption_type in ('preference','goal','knowledge','avoidance','source_preference')),
  label text not null,
  structured_value jsonb not null default '{}',
  confidence numeric not null default 1.0,
  source text not null default 'onboarding' check (source in ('onboarding','feedback','user_edit','model_update','admin')),
  user_confirmed boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  retired_at timestamptz
);

create table if not exists publishers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  website_url text,
  logo_url text,
  description text,
  partner_status text not null default 'none' check (partner_status in ('none','prospect','partner')),
  rights_agreement_status text not null default 'unknown' check (rights_agreement_status in ('unknown','metadata_only','temporary_processing_allowed','full_content_licensed','blocked')),
  dashboard_enabled boolean not null default false,
  default_attribution_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  publisher_id uuid not null references publishers(id) on delete cascade,
  name text not null,
  source_type text not null check (source_type in ('rss','api','partner_feed','manual_import')),
  endpoint_url text,
  auth_required boolean not null default false,
  ingestion_frequency text,
  rights_status text not null default 'unknown' check (rights_status in ('unknown','metadata_only','temporary_content_processing_allowed','full_content_licensed','blocked')),
  status text not null default 'active' check (status in ('active','inactive','blocked','failed')),
  last_successful_sync timestamptz,
  last_failed_sync timestamptz,
  error_count integer not null default 0,
  processing_rules jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(publisher_id, name)
);

create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  publisher_id uuid references publishers(id),
  source_id uuid references sources(id),
  canonical_url text not null unique,
  title text not null,
  subtitle text,
  author text,
  published_at timestamptz,
  retrieved_at timestamptz not null default now(),
  language text not null default 'en',
  section text,
  reading_time_minutes integer,
  paywall_status text not null default 'unknown' check (paywall_status in ('free','metered','paid','unknown')),
  rights_status text not null default 'unknown' check (rights_status in ('metadata_only','temporary_content_processing_allowed','full_content_licensed','blocked','unknown')),
  content_hash text,
  duplicate_group_id uuid,
  primary_topic text,
  secondary_topics text[] not null default '{}',
  entities text[] not null default '{}',
  article_type text,
  complexity_level text,
  quality_score numeric not null default 0.5,
  freshness_score numeric not null default 0.5,
  evergreen_score numeric not null default 0.5,
  summary text,
  status text not null default 'pending' check (status in ('pending','processing','active','failed','rejected','blocked','archived')),
  processing_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists temporary_article_texts (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles(id) on delete cascade,
  raw_text text not null,
  delete_after timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists article_embeddings (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles(id) on delete cascade,
  embedding vector(1536) not null,
  embedding_model text not null,
  embedding_version text not null default 'v1',
  created_at timestamptz not null default now(),
  unique(article_id, embedding_version)
);

create table if not exists recommendation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  model_version text not null,
  reading_mode text not null check (reading_mode in ('light','standard','deep')),
  status text not null default 'complete' check (status in ('running','complete','failed')),
  requested_count integer not null,
  generated_count integer not null default 0,
  fallback_used boolean not null default false,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists recommendation_items (
  id uuid primary key default gen_random_uuid(),
  recommendation_run_id uuid not null references recommendation_runs(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  article_id uuid not null references articles(id) on delete cascade,
  slot_type text not null check (slot_type in ('core','stretch','discovery')),
  rank_position integer not null,
  score numeric not null default 0,
  explanation_text text,
  explanation_reason_codes text[] not null default '{}',
  feature_snapshot jsonb not null default '{}',
  model_version text not null,
  created_at timestamptz not null default now(),
  unique(user_id, article_id)
);

create table if not exists feedback_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  article_id uuid references articles(id) on delete set null,
  recommendation_item_id uuid references recommendation_items(id) on delete set null,
  recommendation_run_id uuid references recommendation_runs(id) on delete set null,
  feedback_type text not null check (feedback_type in ('read_article','good_pick','not_for_me','save','more_like_this','less_like_this','too_basic','too_advanced','already_knew_this','too_similar','could_not_access','slate_great','slate_okay','slate_poor')),
  feedback_surface text not null check (feedback_surface in ('email','web_app','mobile_web','admin_test')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists saved_articles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  article_id uuid not null references articles(id) on delete cascade,
  recommendation_item_id uuid references recommendation_items(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(user_id, article_id)
);

create table if not exists model_versions (
  id uuid primary key default gen_random_uuid(),
  model_name text not null,
  model_version text not null,
  model_type text not null,
  config jsonb not null default '{}',
  offline_metrics jsonb not null default '{}',
  online_metrics jsonb not null default '{}',
  status text not null default 'staging' check (status in ('training','staging','shadow','canary','production','retired','rolled_back')),
  created_at timestamptz not null default now(),
  deployed_at timestamptz,
  unique(model_name, model_version)
);

create table if not exists admin_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references profiles(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists articles_status_idx on articles(status);
create index if not exists articles_topic_idx on articles(primary_topic);
create index if not exists feedback_user_idx on feedback_events(user_id, created_at desc);
create index if not exists recommendation_user_idx on recommendation_runs(user_id, created_at desc);
create index if not exists article_embeddings_hnsw_idx on article_embeddings using hnsw (embedding vector_cosine_ops);

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
  a.status
from articles a
left join publishers p on p.id = a.publisher_id;

create or replace view articles_admin_view as
select
  a.*,
  coalesce(p.name, 'Unknown publisher') as publisher_name,
  s.name as source_name
from articles a
left join publishers p on p.id = a.publisher_id
left join sources s on s.id = a.source_id;

create or replace view recommendation_items_view as
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
    'entities', a.entities,
    'article_type', a.article_type,
    'complexity_level', a.complexity_level,
    'quality_score', a.quality_score,
    'freshness_score', a.freshness_score,
    'evergreen_score', a.evergreen_score
  ) as article
from recommendation_items ri
join articles a on a.id = ri.article_id
left join publishers p on p.id = a.publisher_id;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;

  insert into public.user_profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table profiles enable row level security;
alter table user_profiles enable row level security;
alter table user_assumptions enable row level security;
alter table feedback_events enable row level security;
alter table saved_articles enable row level security;
alter table recommendation_runs enable row level security;
alter table recommendation_items enable row level security;

create policy "Users can read own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can read own user profile" on user_profiles for select using (auth.uid() = user_id);
create policy "Users can upsert own user profile" on user_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can read own assumptions" on user_assumptions for select using (auth.uid() = user_id);
create policy "Users can manage own assumptions" on user_assumptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can read own feedback" on feedback_events for select using (auth.uid() = user_id);
create policy "Users can create own feedback" on feedback_events for insert with check (auth.uid() = user_id);
create policy "Users can read own saved articles" on saved_articles for select using (auth.uid() = user_id);
create policy "Users can manage own saved articles" on saved_articles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can read own runs" on recommendation_runs for select using (auth.uid() = user_id);
create policy "Users can read own items" on recommendation_items for select using (auth.uid() = user_id);

alter table publishers enable row level security;
alter table sources enable row level security;
alter table articles enable row level security;
alter table article_embeddings enable row level security;
alter table temporary_article_texts enable row level security;

create policy "Authenticated can read publishers" on publishers for select to authenticated using (true);
create policy "Authenticated can read sources" on sources for select to authenticated using (true);
create policy "Authenticated can read active articles" on articles for select to authenticated using (status = 'active' or true);

insert into model_versions (model_name, model_version, model_type, config, status, deployed_at)
values (
  'atlus_recommender',
  'recommender_v1.0',
  'interpretable_hybrid',
  '{"preference_fit":0.25,"goal_fit":0.20,"article_quality":0.15,"knowledge_level_fit":0.10,"novelty":0.10,"freshness_or_evergreen":0.10,"source_fit":0.05,"reading_time_fit":0.05}',
  'production',
  now()
)
on conflict (model_name, model_version) do nothing;

grant usage on schema public to authenticated;

grant select, insert, update, delete on profiles to authenticated;
grant select, insert, update, delete on user_profiles to authenticated;
grant select, insert, update, delete on user_assumptions to authenticated;

grant select on publishers to authenticated;
grant select on sources to authenticated;
grant select on articles to authenticated;
grant select on article_embeddings to authenticated;
grant select on articles_for_ranking_view to authenticated;
grant select on recommendation_items_view to authenticated;

grant select, insert, update, delete on recommendation_runs to authenticated;
grant select, insert, update, delete on recommendation_items to authenticated;
grant select, insert, update, delete on feedback_events to authenticated;
grant select, insert, update, delete on saved_articles to authenticated;
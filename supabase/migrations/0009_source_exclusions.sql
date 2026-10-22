alter table public.user_profiles
  add column if not exists source_exclusions text[] not null default '{}';

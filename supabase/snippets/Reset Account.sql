begin;

delete from source_access_issues where user_id = '89f6ac37-57db-4c16-82e1-c61ba945ed85';
delete from email_deliveries where user_id = '89f6ac37-57db-4c16-82e1-c61ba945ed85';
delete from saved_articles where user_id = '89f6ac37-57db-4c16-82e1-c61ba945ed85';
delete from feedback_events where user_id = '89f6ac37-57db-4c16-82e1-c61ba945ed85';
delete from recommendation_runs where user_id = '89f6ac37-57db-4c16-82e1-c61ba945ed85';
delete from user_assumptions where user_id = '89f6ac37-57db-4c16-82e1-c61ba945ed85';

update user_profiles
set
  onboarding_status = 'not_started',
  onboarding_version = 'v1',
  reading_mode = 'standard',
  novelty_tolerance = 'medium',
  perspective_preferences = '{}'::jsonb,
  geography_preferences = '{}'::jsonb,
  source_exposure = '{}',
  topic_exclusions = '{}',
  updated_at = now()
where user_id = '89f6ac37-57db-4c16-82e1-c61ba945ed85';

commit;

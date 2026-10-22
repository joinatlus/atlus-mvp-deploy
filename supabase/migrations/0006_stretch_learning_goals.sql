
update model_versions
set status = 'retired'
where model_name = 'atlus_recommender'
  and status = 'production'
  and model_version <> 'recommender_v1.4_stretch_goals';

insert into model_versions (
  model_name,
  model_version,
  model_type,
  config,
  status,
  deployed_at
)
values (
  'atlus_recommender',
  'recommender_v1.4_stretch_goals',
  'precomputed_embedding_full_iptc_hierarchy',
  '{
    "slate_time_external_api_calls": 0,
    "full_iptc_hierarchy": true,
    "article_prefers_deepest_topic": true,
    "hierarchy_aware_matching": true,
    "broad_onboarding_matches_descendants": true,
    "goal_representation": "goal_concepts_v2_full_iptc",
    "contextual_goal_onboarding": true,
    "goal_specific_knowledge": true,
    "goal_learning_modes": ["foundations", "deepen", "keep_up"],
    "optional_focus_goal": true,
    "candidate_logging": true
  }'::jsonb,
  'production',
  now()
)
on conflict (model_name, model_version) do update set
  model_type = excluded.model_type,
  config = excluded.config,
  status = excluded.status,
  deployed_at = excluded.deployed_at;

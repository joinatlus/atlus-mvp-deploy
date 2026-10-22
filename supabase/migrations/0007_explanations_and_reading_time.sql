
update articles
set reading_time_minutes = null,
    updated_at = now()
where coalesce(content_depth, 'metadata_only') <> 'full_text'
  and reading_time_minutes is not null;

update model_versions
set status = 'retired'
where model_name = 'atlus_recommender'
  and status = 'production'
  and model_version <> 'recommender_v1.4_explanations';

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
  'recommender_v1.4_explanations',
  'precomputed_embedding_full_iptc_hierarchy',
  '{
    "ranking_external_api_calls": 0,
    "post_selection_explanation_calls": 1,
    "explanation_style": "single_sentence_article_specific_grounded",
    "reading_time_requires_full_text": true,
    "full_iptc_hierarchy": true,
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

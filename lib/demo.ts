import type { RecommendationItemView } from '@/lib/types';

export function isDemoMode() {
  if (process.env.NODE_ENV === 'production') return false;
  if (process.env.ATLUS_DEMO_MODE === 'true') return true;
  if (process.env.ATLUS_DEMO_MODE === 'false') return false;

  return !(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export const DEMO_USER = {
  id: 'demo-user',
  email: 'demo@local.atlus'
};

export const DEMO_PROFILE = {
  onboarding_status: 'complete',
  reading_mode: 'standard',
  delivery_time: '08:00',
  timezone: 'Europe/London',
  novelty_tolerance: 'medium',
  perspective_preferences: {
    Politics: 'balance',
    'Economics & business': 'challenge',
    Society: 'balance',
    'Environment & climate': 'balance'
  },
  geography_preferences: {
    'United Kingdom': 'more',
    Europe: 'normal',
    'United States': 'less'
  },
  source_exposure: ['BBC News', 'Financial Times', 'The Guardian'],
  topic_exclusions: ['15000000']
};

export const DEMO_ASSUMPTIONS = [
  { id: 'interest-1', user_id: DEMO_USER.id, assumption_type: 'preference', label: 'Science and technology', topic_qcode: '13000000', weight: 0.65, structured_value: { level: 'broad' }, source: 'onboarding', active: true },
  { id: 'interest-2', user_id: DEMO_USER.id, assumption_type: 'preference', label: 'Economy, business and finance', topic_qcode: '04000000', weight: 0.65, structured_value: { level: 'broad' }, source: 'onboarding', active: true },
  { id: 'interest-3', user_id: DEMO_USER.id, assumption_type: 'preference', label: 'Environment', topic_qcode: '06000000', weight: 0.65, structured_value: { level: 'broad' }, source: 'onboarding', active: true },
  { id: 'interest-4', user_id: DEMO_USER.id, assumption_type: 'preference', label: 'Artificial intelligence', topic_qcode: '20000747', atlus_tag: 'Artificial intelligence', weight: 1, structured_value: { level: 'focus' }, source: 'onboarding', active: true },
  { id: 'knowledge-1', user_id: DEMO_USER.id, assumption_type: 'knowledge', label: 'Artificial intelligence', topic_qcode: '20000747', weight: 1, structured_value: { level: 2 }, source: 'onboarding', active: true },
  { id: 'goal-1', user_id: DEMO_USER.id, assumption_type: 'goal', label: 'Understand how AI policy affects everyday products', weight: 1, structured_value: { knowledge_level: 1, learning_mode: 'deepen', priority: 'focus' }, source: 'onboarding', active: true },
  { id: 'goal-2', user_id: DEMO_USER.id, assumption_type: 'goal', label: 'Follow the transition to clean energy', weight: 0.82, structured_value: { knowledge_level: 2, learning_mode: 'keep_up', priority: 'normal' }, source: 'onboarding', active: true },
  { id: 'learned-1', user_id: DEMO_USER.id, assumption_type: 'preference', label: 'Prefers explanatory reporting to breaking-news updates', weight: 0.72, structured_value: {}, source: 'feedback', active: true }
];

const DEMO_RUN_ID = 'demo-run';

export const DEMO_ITEMS: RecommendationItemView[] = [
  {
    id: 'demo-item-1', recommendation_run_id: DEMO_RUN_ID, user_id: DEMO_USER.id, article_id: 'demo-article-1', slot_type: 'core', rank_position: 1, score: 0.94,
    explanation_text: 'You asked to go deeper on artificial intelligence and usually prefer explanatory reporting.', explanation_reason_codes: ['interest_match', 'learning_goal'],
    article: { id: 'demo-article-1', title: 'The quiet infrastructure behind the next generation of AI', subtitle: null, canonical_url: 'https://www.technologyreview.com/', publisher_id: null, source_id: null, publisher_name: 'MIT Technology Review', author: null, published_at: new Date().toISOString(), reading_time_minutes: 7, primary_topic: 'Artificial intelligence', secondary_topics: [], entities: [], article_type: 'analysis', complexity_level: 'intermediate', quality_score: 0.93, freshness_score: 0.88, evergreen_score: 0.65 }
  },
  {
    id: 'demo-item-2', recommendation_run_id: DEMO_RUN_ID, user_id: DEMO_USER.id, article_id: 'demo-article-2', slot_type: 'stretch', rank_position: 2, score: 0.86,
    explanation_text: 'A useful bridge between your technology interests and your goal of understanding climate transitions.', explanation_reason_codes: ['cross_topic', 'learning_goal'],
    article: { id: 'demo-article-2', title: 'Why electricity grids are becoming the defining climate technology', subtitle: null, canonical_url: 'https://www.carbonbrief.org/', publisher_id: null, source_id: null, publisher_name: 'Carbon Brief', author: null, published_at: new Date(Date.now() - 86400000).toISOString(), reading_time_minutes: 9, primary_topic: 'Energy transition', secondary_topics: [], entities: [], article_type: 'feature', complexity_level: 'intermediate', quality_score: 0.91, freshness_score: 0.84, evergreen_score: 0.7 }
  },
  {
    id: 'demo-item-3', recommendation_run_id: DEMO_RUN_ID, user_id: DEMO_USER.id, article_id: 'demo-article-3', slot_type: 'discovery', rank_position: 3, score: 0.74,
    explanation_text: 'A carefully chosen step outside your usual reading, with links to economics and public policy.', explanation_reason_codes: ['discovery'],
    article: { id: 'demo-article-3', title: 'What cities can learn from the return of the night train', subtitle: null, canonical_url: 'https://www.bbc.com/future', publisher_id: null, source_id: null, publisher_name: 'BBC Future', author: null, published_at: new Date(Date.now() - 172800000).toISOString(), reading_time_minutes: 6, primary_topic: 'Transport', secondary_topics: [], entities: [], article_type: 'feature', complexity_level: 'accessible', quality_score: 0.87, freshness_score: 0.78, evergreen_score: 0.76 }
  }
];

export function demoArticle(articleId: string | null) {
  return DEMO_ITEMS.find((item) => item.article_id === articleId)?.article;
}

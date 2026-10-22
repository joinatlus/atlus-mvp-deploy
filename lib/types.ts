export type ReadingMode = 'light' | 'standard' | 'deep';
export type SlotType = 'core' | 'stretch' | 'discovery';
export type FeedbackType =
  | 'read_article'
  | 'good_pick'
  | 'not_for_me'
  | 'save'
  | 'more_like_this'
  | 'less_like_this'
  | 'too_basic'
  | 'too_advanced'
  | 'already_knew_this'
  | 'too_similar'
  | 'could_not_access'
  | 'slate_great'
  | 'slate_okay'
  | 'slate_poor';

export type FeedbackSurface = 'email' | 'web_app' | 'mobile_web' | 'admin_test';

export type UserAssumption = {
  id: string;
  user_id: string;
  assumption_type: 'preference' | 'goal' | 'knowledge' | 'avoidance' | 'source_preference';
  label: string;
  structured_value: Record<string, any>;
  confidence: number;
  weight?: number;
  topic_qcode?: string | null;
  atlus_tag?: string | null;
  override_active?: boolean;
  evidence_count?: number;
  last_evidence_at?: string | null;
  source: 'onboarding' | 'feedback' | 'user_edit' | 'model_update' | 'admin' | string;
  user_confirmed: boolean;
  active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ArticleForRanking = {
  id: string;
  title: string;
  subtitle: string | null;
  canonical_url: string;
  publisher_id: string | null;
  source_id: string | null;
  publisher_name: string;
  author: string | null;
  published_at: string | null;
  reading_time_minutes: number | null;
  primary_topic: string | null;
  secondary_topics: string[];
  primary_iptc_qcode?: string | null;
  secondary_iptc_qcodes?: string[];
  atlus_tags?: string[];
  concepts?: string[];
  geographies?: string[];
  entities: string[];
  article_type: string | null;
  complexity_level: string | null;
  content_depth?: string | null;
  processing_confidence?: number | null;
  quality_score: number;
  freshness_score: number;
  evergreen_score: number;
  quality_components?: Record<string, number> | null;
  embedding?: number[] | string | null;
  concept_embedding?: number[] | string | null;
};

export type RecommendationFeatureSnapshot = Record<string, number | string | boolean | string[] | null>;

export type RecommendationItemView = {
  id: string;
  recommendation_run_id: string;
  user_id: string;
  article_id: string;
  slot_type: SlotType;
  rank_position: number;
  score: number;
  explanation_text: string;
  explanation_reason_codes: string[];
  article: ArticleForRanking;
};

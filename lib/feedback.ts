import type { FeedbackSurface, FeedbackType } from '@/lib/types';
import { refreshUserRecommendationEmbeddings } from '@/lib/user-representations';

export type FeedbackInsert = {
  userId: string;
  articleId?: string | null;
  recommendationItemId?: string | null;
  recommendationRunId: string;
  feedbackType: FeedbackType;
  surface: FeedbackSurface;
  metadata?: Record<string, unknown>;
};

// Raw feedback and its derived DB effects are committed together.
export async function recordFeedback(supabase: any, input: FeedbackInsert) {
  const { data, error } = await supabase.rpc('record_feedback_event_atomic', {
    p_user_id: input.userId,
    p_article_id: input.articleId || null,
    p_recommendation_item_id: input.recommendationItemId || null,
    p_recommendation_run_id: input.recommendationRunId,
    p_feedback_type: input.feedbackType,
    p_feedback_surface: input.surface,
    p_metadata: input.metadata || {}
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  const inserted = Boolean(row?.inserted);
  const preferenceChanged = Boolean(row?.preference_changed);

  if (inserted && preferenceChanged) {
    try {
      await refreshUserRecommendationEmbeddings(supabase, input.userId);
    } catch (representationError) {
      console.error('Could not refresh cached user recommendation embedding:', representationError);
    }
  }

  return { duplicate: !inserted, eventId: row?.event_id || null };
}

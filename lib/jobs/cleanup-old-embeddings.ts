import { createAdminSupabaseClient } from '@/lib/supabase/admin';

const DAY_MS = 86_400_000;

export async function runCleanupOldEmbeddingsJob(options: { retentionDays?: number; batchSize?: number } = {}) {
  const retentionDays = Math.max(90, Math.min(730, options.retentionDays ?? 180));
  const batchSize = Math.max(1, Math.min(1000, options.batchSize ?? 500));
  const cutoff = new Date(Date.now() - retentionDays * DAY_MS).toISOString();
  const recentRecommendationCutoff = new Date(Date.now() - 90 * DAY_MS).toISOString();
  const supabase = createAdminSupabaseClient();

  const { data: embeddings, error: embeddingError } = await supabase
    .from('article_embeddings')
    .select('id,article_id,created_at')
    .lt('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(batchSize);
  if (embeddingError) throw embeddingError;
  if (!embeddings?.length) return { ok: true, retention_days: retentionDays, examined: 0, deleted: 0, protected: 0 };

  const articleIds = Array.from(new Set(embeddings.map((row: any) => String(row.article_id))));
  const protectedArticleIds = new Set<string>();

  const [{ data: saved, error: savedError }, { data: evergreen, error: evergreenError }, { data: recent, error: recentError }] = await Promise.all([
    supabase.from('saved_articles').select('article_id').in('article_id', articleIds),
    supabase.from('articles').select('id').in('id', articleIds).gte('evergreen_score', 0.75),
    supabase.from('recommendation_items').select('article_id').in('article_id', articleIds).gte('created_at', recentRecommendationCutoff)
  ]);
  if (savedError) throw savedError;
  if (evergreenError) throw evergreenError;
  if (recentError) throw recentError;

  for (const row of saved || []) protectedArticleIds.add(String(row.article_id));
  for (const row of evergreen || []) protectedArticleIds.add(String(row.id));
  for (const row of recent || []) protectedArticleIds.add(String(row.article_id));

  const deletableEmbeddingIds = embeddings
    .filter((row: any) => !protectedArticleIds.has(String(row.article_id)))
    .map((row: any) => String(row.id));

  if (deletableEmbeddingIds.length) {
    const { error } = await supabase.from('article_embeddings').delete().in('id', deletableEmbeddingIds);
    if (error) throw error;
  }

  return {
    ok: true,
    retention_days: retentionDays,
    examined: embeddings.length,
    deleted: deletableEmbeddingIds.length,
    protected: embeddings.length - deletableEmbeddingIds.length
  };
}

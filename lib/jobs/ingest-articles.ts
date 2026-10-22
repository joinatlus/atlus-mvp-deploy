import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { ingestRssSources } from '@/lib/rss-ingestion';
import { processPendingArticles } from '@/lib/process-pending-articles';

export async function runIngestArticlesJob(options: { limitPerSource?: number; processLimit?: number } = {}) {
  const limitPerSource = Math.max(0, Math.min(100, options.limitPerSource ?? 30));
  const processLimit = Math.max(0, Math.min(100, options.processLimit ?? 40));

  const supabase = createAdminSupabaseClient();
  const ingestion = await ingestRssSources(supabase, { limitPerSource });
  const processing = await processPendingArticles(supabase, { limit: processLimit });

  return { ok: true, ingestion, processing };
}

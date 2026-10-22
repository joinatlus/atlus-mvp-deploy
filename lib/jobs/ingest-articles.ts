
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { ingestRssSources } from '@/lib/rss-ingestion';
import { processPendingArticles } from '@/lib/process-pending-articles';

type JobOptions = {
  limitPerSource?: number;
  processLimit?: number;
  sourceBatchSize?: number;
  cursor?: string | null;
  concurrency?: number;
};

export async function runIngestArticlesJob(
  options: JobOptions = {}
) {
  const limitPerSource = Math.max(
    0,
    Math.min(100, options.limitPerSource ?? 30)
  );

  const processLimit = Math.max(
    0,
    Math.min(100, options.processLimit ?? 0)
  );

  const supabase = createAdminSupabaseClient();

  const ingestion = await ingestRssSources(supabase, {
    limitPerSource,
    sourceBatchSize: options.sourceBatchSize ?? 8,
    cursor: options.cursor ?? null,
    concurrency: options.concurrency ?? 3
  });

  // Article processing is optional and normally handled
  // by the separate processing endpoint.
  const processing = processLimit > 0
    ? await processPendingArticles(supabase, {
      limit: processLimit
    })
    : [];

  return {
    ok: true,
    ingestion,
    processing
  };
}

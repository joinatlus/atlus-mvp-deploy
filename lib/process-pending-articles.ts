
import { processArticle } from '@/lib/article-processing';

type ProcessOptions = {
  limit?: number;
  retryFailed?: boolean;
  concurrency?: number;
  maxRuntimeMs?: number;
};

type ArticleRow = {
  id: string;
  title: string;
  subtitle: string | null;
  published_at: string | null;
  status: string;
  processing_attempts: number | null;
  last_processing_attempt: string | null;
  rights_status: string | null;
};

type ProcessingResult = Record<string, unknown> & {
  article_id: string;
  status: string;
};

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return String(error);
}

export async function processPendingArticles(
  supabase: any,
  options: ProcessOptions = {}
): Promise<ProcessingResult[]> {
  const limit = Math.max(0, Math.floor(options.limit ?? 50));
  if (limit === 0) return [];

  const concurrency = Math.max(
    1,
    Math.min(8, Math.floor(options.concurrency ?? 1))
  );

  const maxRuntimeMs = options.maxRuntimeMs ?? Infinity;
  const startedAt = Date.now();

  // Only recover articles stuck in "processing" for over
  // 20 minutes. This avoids reprocessing active jobs.
  const staleCutoff = new Date(
    Date.now() - 20 * 60 * 1000
  ).toISOString();

  const regularStatuses =
    options.retryFailed === false
      ? 'status.eq.pending'
      : 'status.in.(pending,failed)';

  const statusFilter = [
    regularStatuses,
    `and(status.eq.processing,last_processing_attempt.lt.${staleCutoff})`
  ].join(',');

  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .or(statusFilter)
    .lt('processing_attempts', 3)
    .order('retrieved_at', { ascending: true })
    .limit(limit);

  if (error) throw error;

  const articles = (data || []) as ArticleRow[];
  const results: ProcessingResult[] = new Array(articles.length);

  let nextIndex = 0;

  async function processOne(
    article: ArticleRow
  ): Promise<ProcessingResult> {
    const articleStartedAt = Date.now();
    const previousAttempts = Number(
      article.processing_attempts ?? 0
    );
    const attempt = previousAttempts + 1;

    let claimed = false;

    try {
      // Atomically claim the article. Another invocation may
      // have selected it, but only one can claim this version.
      let claimQuery = supabase
        .from('articles')
        .update({
          status: 'processing',
          processing_error: null,
          processing_attempts: attempt,
          last_processing_attempt: new Date().toISOString()
        })
        .eq('id', article.id)
        .eq('status', article.status);

      if (article.processing_attempts == null) {
        claimQuery = claimQuery.is('processing_attempts', null);
      } else {
        claimQuery = claimQuery.eq(
          'processing_attempts',
          article.processing_attempts
        );
      }

      // Additional protection when reclaiming a stale job.
      if (
        article.status === 'processing' &&
        article.last_processing_attempt
      ) {
        claimQuery = claimQuery.eq(
          'last_processing_attempt',
          article.last_processing_attempt
        );
      }

      const {
        data: claimedRow,
        error: claimError
      } = await claimQuery.select('id').maybeSingle();

      if (claimError) throw claimError;

      if (!claimedRow) {
        return {
          article_id: article.id,
          title: article.title,
          status: 'skipped',
          reason: 'Already claimed by another invocation'
        };
      }

      claimed = true;

      // Retrieve any temporary article content.
      const { data: temp, error: tempError } = await supabase
        .from('temporary_article_texts')
        .select('id,raw_text')
        .eq('article_id', article.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (tempError) throw tempError;

      // Classification and embeddings.
      const processed = await processArticle({
        title: article.title,
        subtitle: article.subtitle,
        body: temp?.raw_text,
        publishedAt: article.published_at
      });

      const isZeroVector = processed.embedding.every(
        (value: number) => value === 0
      );

      const isZeroConceptVector =
        processed.concept_embedding.every(
          (value: number) => value === 0
        );

      const embeddingModel =
        process.env.OPENAI_EMBEDDING_MODEL ||
        'text-embedding-3-small';

      // Save embeddings before marking the article active.
      const { error: embeddingError } = await supabase
        .from('article_embeddings')
        .upsert(
          [
            {
              article_id: article.id,
              embedding: processed.embedding,
              embedding_model: isZeroVector
                ? 'fallback-zero-vector'
                : embeddingModel,
              embedding_version: 'v1'
            },
            {
              article_id: article.id,
              embedding: processed.concept_embedding,
              embedding_model: isZeroConceptVector
                ? 'fallback-zero-vector'
                : embeddingModel,
              embedding_version: 'concept_v1'
            }
          ],
          { onConflict: 'article_id,embedding_version' }
        );

      if (embeddingError) throw embeddingError;

      // Save metadata and activate the article.
      const {
        data: updatedRow,
        error: updateError
      } = await supabase
        .from('articles')
        .update({
          status: 'active',
          reading_time_minutes:
            processed.reading_time_minutes,
          primary_topic: processed.primary_topic,
          secondary_topics: processed.secondary_topics,
          primary_iptc_qcode:
            processed.primary_iptc_qcode,
          secondary_iptc_qcodes:
            processed.secondary_iptc_qcodes,
          atlus_tags: processed.atlus_tags,
          concepts: processed.concepts,
          geographies: processed.geographies,
          entities: processed.entities,
          article_type: processed.article_type,
          complexity_level: processed.complexity_level,
          content_depth: processed.content_depth,
          processing_confidence:
            processed.processing_confidence,
          quality_components: processed.quality_components,
          quality_score: processed.quality_score,
          evergreen_score: processed.evergreen_score,
          freshness_score: processed.freshness_score,
          summary: processed.summary,
          processing_error: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', article.id)
        .eq('status', 'processing')
        .eq('processing_attempts', attempt)
        .select('id')
        .maybeSingle();

      if (updateError) throw updateError;
      if (!updatedRow) {
        throw new Error('Article claim was lost during processing');
      }

      // Preserve the existing temporary-content policy.
      if (
        temp?.id &&
        article.rights_status ===
        'temporary_content_processing_allowed'
      ) {
        const { error: deleteError } = await supabase
          .from('temporary_article_texts')
          .delete()
          .eq('id', temp.id);

        if (deleteError) throw deleteError;
      }

      const durationMs = Date.now() - articleStartedAt;

      console.log(
        `Processed article ${article.id} in ${durationMs}ms`
      );

      return {
        article_id: article.id,
        title: article.title,
        status: 'active',
        attempt,
        duration_ms: durationMs,
        zero_embedding: isZeroVector,
        zero_concept_embedding: isZeroConceptVector
      };
    } catch (error) {
      const message = errorMessage(error);

      console.error(
        `Failed processing article ${article.id}:`,
        error
      );

      // Only mark failed if this invocation claimed it.
      if (claimed) {
        const { error: failureError } = await supabase
          .from('articles')
          .update({
            status: 'failed',
            processing_error: message,
            updated_at: new Date().toISOString()
          })
          .eq('id', article.id)
          .eq('processing_attempts', attempt);

        if (failureError) {
          console.error(
            `Could not mark article ${article.id} failed:`,
            failureError
          );
        }
      }

      return {
        article_id: article.id,
        title: article.title,
        status: claimed ? 'failed' : 'error',
        attempt,
        duration_ms: Date.now() - articleStartedAt,
        error: message
      };
    }
  }

  // Shared work queue: each worker claims a different index.
  // No more than "concurrency" articles run simultaneously.
  async function worker() {
    while (true) {
      if (Date.now() - startedAt >= maxRuntimeMs) {
        return;
      }

      const index = nextIndex++;

      if (index >= articles.length) {
        return;
      }

      results[index] = await processOne(articles[index]);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, articles.length) },
      () => worker()
    )
  );

  // Clean up temporary texts that have expired.
  const { error: cleanupError } = await supabase
    .from('temporary_article_texts')
    .delete()
    .lt('delete_after', new Date().toISOString());

  if (cleanupError) {
    console.error(
      'Expired temporary article cleanup failed:',
      cleanupError
    );
  }

  return results.filter(
    (result): result is ProcessingResult => Boolean(result)
  );
}

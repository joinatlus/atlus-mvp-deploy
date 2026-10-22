import { processArticle } from '@/lib/article-processing';

export async function processPendingArticles(supabase: any, options: { limit?: number; retryFailed?: boolean } = {}) {
  const limit = Math.max(0, options.limit ?? 50);
  if (limit === 0) return [];

  const statuses = options.retryFailed === false ? ['pending', 'processing'] : ['pending', 'processing', 'failed'];
  const { data: articles, error } = await supabase
    .from('articles')
    .select('*')
    .in('status', statuses)
    .lt('processing_attempts', 3)
    .order('retrieved_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  const results: Array<Record<string, unknown>> = [];

  for (const article of articles || []) {
    const attempt = Number(article.processing_attempts || 0) + 1;
    try {
      await supabase
        .from('articles')
        .update({
          status: 'processing',
          processing_error: null,
          processing_attempts: attempt,
          last_processing_attempt: new Date().toISOString()
        })
        .eq('id', article.id);

      const { data: temp } = await supabase
        .from('temporary_article_texts')
        .select('id,raw_text')
        .eq('article_id', article.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const processed = await processArticle({
        title: article.title,
        subtitle: article.subtitle,
        body: temp?.raw_text,
        publishedAt: article.published_at
      });

      await supabase
        .from('articles')
        .update({
          status: 'active',
          reading_time_minutes: processed.reading_time_minutes,
          primary_topic: processed.primary_topic,
          secondary_topics: processed.secondary_topics,
          primary_iptc_qcode: processed.primary_iptc_qcode,
          secondary_iptc_qcodes: processed.secondary_iptc_qcodes,
          atlus_tags: processed.atlus_tags,
          concepts: processed.concepts,
          geographies: processed.geographies,
          entities: processed.entities,
          article_type: processed.article_type,
          complexity_level: processed.complexity_level,
          content_depth: processed.content_depth,
          processing_confidence: processed.processing_confidence,
          quality_components: processed.quality_components,
          quality_score: processed.quality_score,
          evergreen_score: processed.evergreen_score,
          freshness_score: processed.freshness_score,
          summary: processed.summary,
          processing_error: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', article.id);

      const isZeroVector = processed.embedding.every((value: number) => value === 0);
      const isZeroConceptVector = processed.concept_embedding.every((value: number) => value === 0);
      const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
      await supabase.from('article_embeddings').upsert(
        [
          {
            article_id: article.id,
            embedding: processed.embedding,
            embedding_model: isZeroVector ? 'fallback-zero-vector' : embeddingModel,
            embedding_version: 'v1'
          },
          {
            article_id: article.id,
            embedding: processed.concept_embedding,
            embedding_model: isZeroConceptVector ? 'fallback-zero-vector' : embeddingModel,
            embedding_version: 'concept_v1'
          }
        ],
        { onConflict: 'article_id,embedding_version' }
      );

      // Temporary-processing sources must not retain article text.
      if (temp?.id && article.rights_status === 'temporary_content_processing_allowed') {
        await supabase.from('temporary_article_texts').delete().eq('id', temp.id);
      }

      results.push({ article_id: article.id, title: article.title, status: 'active', attempt, zero_embedding: isZeroVector, zero_concept_embedding: isZeroConceptVector });
    } catch (error: any) {
      const message = error?.message || String(error);
      await supabase
        .from('articles')
        .update({ status: 'failed', processing_error: message, updated_at: new Date().toISOString() })
        .eq('id', article.id);
      results.push({ article_id: article.id, title: article.title, status: 'failed', attempt, error: message });
    }
  }

  await supabase.from('temporary_article_texts').delete().lt('delete_after', new Date().toISOString());
  return results;
}

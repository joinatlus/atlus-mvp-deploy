'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { processArticle } from '@/lib/article-processing';

function canonicaliseUrl(value: string) {
  const url = new URL(value);
  for (const key of Array.from(url.searchParams.keys())) if (key.startsWith('utm_') || ['fbclid','gclid'].includes(key)) url.searchParams.delete(key);
  url.hash = '';
  return url.toString();
}

export async function importArticle(formData: FormData) {
  await requireAdmin();
  const supabase = createAdminSupabaseClient();
  const publisherName = String(formData.get('publisher_name') || '').trim();
  const title = String(formData.get('title') || '').trim();
  const canonicalUrl = canonicaliseUrl(String(formData.get('canonical_url') || '').trim());
  const subtitle = String(formData.get('subtitle') || '').trim() || null;
  const author = String(formData.get('author') || '').trim() || null;
  const rawText = String(formData.get('raw_text') || '').trim();
  const rights = String(formData.get('rights_status') || 'metadata_only');
  const publishedAtRaw = String(formData.get('published_at') || '').trim();
  const publishedAt = publishedAtRaw ? new Date(publishedAtRaw).toISOString() : null;
  if (!publisherName || !title || !canonicalUrl) throw new Error('Publisher, title and URL are required');

  const publisherRights = rights === 'full_content_licensed' ? 'full_content_licensed' : rights === 'temporary_content_processing_allowed' ? 'temporary_processing_allowed' : 'metadata_only';
  const { data: publisher, error: publisherError } = await supabase.from('publishers').upsert({ name: publisherName, partner_status: 'prospect', rights_agreement_status: publisherRights }, { onConflict: 'name' }).select('*').single();
  if (publisherError) throw publisherError;
  const { data: source, error: sourceError } = await supabase.from('sources').upsert({ publisher_id: publisher.id, name: `${publisherName} manual import`, source_type: 'manual_import', rights_status: rights, status: 'active' }, { onConflict: 'publisher_id,name' }).select('*').single();
  if (sourceError) throw sourceError;

  const bodyForProcessing = rights === 'metadata_only' ? null : rawText;
  const processed = await processArticle({ title, subtitle, body: bodyForProcessing, publishedAt });
  const { data: article, error: articleError } = await supabase.from('articles').upsert({
    publisher_id: publisher.id,
    source_id: source.id,
    canonical_url: canonicalUrl,
    title,
    subtitle,
    author,
    published_at: publishedAt,
    rights_status: rights,
    status: 'active',
    reading_time_minutes: processed.reading_time_minutes,
    primary_topic: processed.primary_topic,
    secondary_topics: processed.secondary_topics,
    primary_iptc_qcode: processed.primary_iptc_qcode,
    secondary_iptc_qcodes: processed.secondary_iptc_qcodes,
    atlus_tags: processed.atlus_tags,
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
    processing_error: null
  }, { onConflict: 'canonical_url' }).select('*').single();
  if (articleError) throw articleError;

  const isZeroVector = processed.embedding.every((value) => value === 0);
  const { error: embeddingError } = await supabase.from('article_embeddings').upsert({
    article_id: article.id,
    embedding: processed.embedding,
    embedding_model: isZeroVector ? 'fallback-zero-vector' : process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    embedding_version: 'v1'
  }, { onConflict: 'article_id,embedding_version' });
  if (embeddingError) throw embeddingError;

  revalidatePath('/admin/articles');
}

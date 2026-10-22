import Parser from 'rss-parser';
import crypto from 'crypto';

type SourceRow = {
  id: string;
  publisher_id: string;
  name: string;
  endpoint_url: string | null;
  rights_status: string;
  status: string;
  error_count: number;
  next_retry_at?: string | null;
};

const parser = new Parser({
  customFields: { item: [['content:encoded', 'contentEncoded'], ['dc:creator', 'dcCreator']] }
});

function stripHtml(value?: string | null) {
  if (!value) return '';
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicaliseUrl(url: string) {
  const parsed = new URL(url);
  for (const key of Array.from(parsed.searchParams.keys())) {
    if (key.startsWith('utm_') || ['fbclid', 'gclid', 'mc_cid', 'mc_eid', 'CMP', 'CMPID'].includes(key)) parsed.searchParams.delete(key);
  }
  parsed.hash = '';
  return parsed.toString();
}

function sourceRightsToArticleRights(sourceRights: string) {
  if (sourceRights === 'full_content_licensed') return 'full_content_licensed';
  if (sourceRights === 'temporary_content_processing_allowed') return 'temporary_content_processing_allowed';
  return 'metadata_only';
}

function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function fetchFeed(url: string, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': 'Atlus/0.1 (+https://joinatlus.com; personalised reading feed)' }
    });
    if (!response.ok) throw new Error(`RSS HTTP ${response.status}`);
    return parser.parseString(await response.text());
  } finally {
    clearTimeout(timeout);
  }
}

function retryDate(errorCount: number) {
  const hours = Math.min(24, Math.max(1, 2 ** Math.min(errorCount, 4)));
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export async function ingestRssSources(supabase: any, options: { limitPerSource?: number } = {}) {
  const limitPerSource = Math.max(0, options.limitPerSource ?? 30);
  if (limitPerSource === 0) return [];

  const { data: sources, error } = await supabase
    .from('sources')
    .select('*')
    .eq('source_type', 'rss')
    .in('status', ['active', 'failed'])
    .not('endpoint_url', 'is', null);
  if (error) throw error;

  const sourceResults: Array<Record<string, unknown>> = [];
  const now = Date.now();

  for (const source of (sources || []) as SourceRow[]) {
    if (source.next_retry_at && new Date(source.next_retry_at).getTime() > now) continue;

    const result = {
      source_id: source.id,
      source_name: source.name,
      fetched: 0,
      inserted: 0,
      skipped_existing: 0,
      skipped_duplicate: 0,
      skipped_invalid: 0,
      error: null as string | null
    };

    try {
      if (!source.endpoint_url) throw new Error('RSS source has no endpoint_url');
      if (source.rights_status === 'blocked' || source.rights_status === 'unknown') throw new Error(`RSS source has unusable rights_status: ${source.rights_status}`);

      const feed = await fetchFeed(source.endpoint_url);
      const items = feed.items.slice(0, limitPerSource);
      result.fetched = items.length;

      for (const item of items) {
        const title = stripHtml(item.title);
        const rawUrl = item.link || item.guid;
        if (!title || !rawUrl) { result.skipped_invalid += 1; continue; }

        let canonicalUrl: string;
        try { canonicalUrl = canonicaliseUrl(rawUrl); } catch { result.skipped_invalid += 1; continue; }

        const { data: existing } = await supabase.from('articles').select('id').eq('canonical_url', canonicalUrl).maybeSingle();
        if (existing?.id) { result.skipped_existing += 1; continue; }

        const contentEncoded = (item as any).contentEncoded || (item as any)['content:encoded'];
        const rawText = stripHtml(contentEncoded || item.content || item.contentSnippet || item.summary || '');
        const subtitle = stripHtml(item.contentSnippet || item.summary || rawText).slice(0, 420) || null;
        const author = stripHtml((item as any).creator || (item as any).dcCreator || (item as any)['dc:creator'] || (item as any).author || '') || null;
        const publishedAt = parseDate(item.isoDate || item.pubDate || null);
        const articleRights = sourceRightsToArticleRights(source.rights_status);
        const contentHash = rawText ? sha256(`${title.toLowerCase()}\n${rawText.toLowerCase()}`) : sha256(`${title.toLowerCase()}\n${canonicalUrl}`);

        const { data: duplicate } = await supabase.from('articles').select('id').eq('content_hash', contentHash).limit(1).maybeSingle();
        if (duplicate?.id) { result.skipped_duplicate += 1; continue; }

        const { data: article, error: articleError } = await supabase
          .from('articles')
          .insert({
            publisher_id: source.publisher_id,
            source_id: source.id,
            canonical_url: canonicalUrl,
            title,
            subtitle,
            author,
            published_at: publishedAt,
            rights_status: articleRights,
            content_hash: contentHash,
            content_depth: articleRights === 'metadata_only' ? 'metadata_only' : rawText.length >= 2500 ? 'full_text' : 'short_excerpt',
            status: 'pending'
          })
          .select('id')
          .single();
        if (articleError) throw articleError;

        if (article?.id && rawText && articleRights !== 'metadata_only') {
          await supabase.from('temporary_article_texts').insert({
            article_id: article.id,
            raw_text: rawText,
            delete_after: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          });
        }
        result.inserted += 1;
      }

      await supabase.from('sources').update({
        last_successful_sync: new Date().toISOString(),
        error_count: 0,
        status: 'active',
        next_retry_at: null,
        last_error: null,
        last_item_count: result.fetched,
        updated_at: new Date().toISOString()
      }).eq('id', source.id);
    } catch (error: any) {
      const errorCount = Number(source.error_count || 0) + 1;
      const message = error?.name === 'AbortError' ? 'RSS request timed out' : error?.message || String(error);
      result.error = message;
      await supabase.from('sources').update({
        last_failed_sync: new Date().toISOString(),
        error_count: errorCount,
        status: errorCount >= 5 ? 'failed' : 'active',
        next_retry_at: retryDate(errorCount),
        last_error: message,
        updated_at: new Date().toISOString()
      }).eq('id', source.id);
    }

    sourceResults.push(result);
  }

  return sourceResults;
}

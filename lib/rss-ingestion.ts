
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

type IngestOptions = {
  limitPerSource?: number;
  sourceBatchSize?: number;
  cursor?: string | null;
  concurrency?: number;
};

type SourceResult = {
  source_id: string;
  source_name: string;
  status: 'ok' | 'failed' | 'deferred';
  fetched: number;
  inserted: number;
  skipped_existing: number;
  skipped_duplicate: number;
  skipped_invalid: number;
  error: string | null;
};

const parser = new Parser({
  customFields: {
    item: [
      ['content:encoded', 'contentEncoded'],
      ['dc:creator', 'dcCreator']
    ]
  }
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
    if (
      key.startsWith('utm_') ||
      ['fbclid', 'gclid', 'mc_cid', 'mc_eid', 'CMP', 'CMPID'].includes(key)
    ) {
      parsed.searchParams.delete(key);
    }
  }

  parsed.hash = '';
  return parsed.toString();
}

function sourceRightsToArticleRights(sourceRights: string) {
  if (sourceRights === 'full_content_licensed') {
    return 'full_content_licensed';
  }

  if (sourceRights === 'temporary_content_processing_allowed') {
    return 'temporary_content_processing_allowed';
  }

  return 'metadata_only';
}

function sha256(value: string) {
  return crypto
    .createHash('sha256')
    .update(value)
    .digest('hex');
}

function parseDate(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date.toISOString();
}

function errorMessage(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error
  ) {
    return String(error.message);
  }

  return String(error);
}

async function fetchFeed(url: string, timeoutMs = 12000) {
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    timeoutMs
  );

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent':
          'Atlus/0.1 (+https://joinatlus.com; personalised reading feed)'
      }
    });

    if (!response.ok) {
      throw new Error(`RSS HTTP ${response.status}`);
    }

    return parser.parseString(await response.text());
  } finally {
    clearTimeout(timeout);
  }
}

function retryDate(errorCount: number) {
  const hours = Math.min(
    24,
    Math.max(1, 2 ** Math.min(errorCount, 4))
  );

  return new Date(
    Date.now() + hours * 60 * 60 * 1000
  ).toISOString();
}

async function ingestOneSource(
  supabase: any,
  source: SourceRow
): Promise<SourceResult> {
  const result: SourceResult = {
    source_id: source.id,
    source_name: source.name,
    status: 'ok',
    fetched: 0,
    inserted: 0,
    skipped_existing: 0,
    skipped_duplicate: 0,
    skipped_invalid: 0,
    error: null
  };

  // Respect existing source retry/backoff settings.
  if (
    source.next_retry_at &&
    new Date(source.next_retry_at).getTime() > Date.now()
  ) {
    result.status = 'deferred';
    return result;
  }

  try {
    if (!source.endpoint_url) {
      throw new Error('RSS source has no endpoint_url');
    }

    if (
      source.rights_status === 'blocked' ||
      source.rights_status === 'unknown'
    ) {
      throw new Error(
        `RSS source has unusable rights_status: ${source.rights_status}`
      );
    }

    const feed = await fetchFeed(source.endpoint_url);

    const items = feed.items.slice(0, 100);

    // Actual limit is applied by the calling function,
    // via its source-specific processing argument.
    // This inner function receives the chosen limit below.
    return await ingestSourceItems(
      supabase,
      source,
      result,
      items
    );
  } catch (error) {
    return markSourceFailed(
      supabase,
      source,
      result,
      error
    );
  }
}

async function markSourceFailed(
  supabase: any,
  source: SourceRow,
  result: SourceResult,
  error: unknown
): Promise<SourceResult> {
  const errorCount = Number(source.error_count || 0) + 1;

  const message =
    error instanceof Error && error.name === 'AbortError'
      ? 'RSS request timed out'
      : errorMessage(error);

  result.status = 'failed';
  result.error = message;

  const { error: updateError } = await supabase
    .from('sources')
    .update({
      last_failed_sync: new Date().toISOString(),
      error_count: errorCount,
      status: errorCount >= 5 ? 'failed' : 'active',
      next_retry_at: retryDate(errorCount),
      last_error: message,
      updated_at: new Date().toISOString()
    })
    .eq('id', source.id);

  if (updateError) {
    console.error(
      `Failed to update source ${source.id}:`,
      updateError
    );
  }

  console.error(
    `RSS ingestion failed for ${source.name}:`,
    message
  );

  return result;
}

async function ingestSourceItems(
  supabase: any,
  source: SourceRow,
  result: SourceResult,
  items: any[]
): Promise<SourceResult> {
  result.fetched = items.length;

  try {
    for (const item of items) {
      const title = stripHtml(item.title);
      const rawUrl = item.link || item.guid;

      if (!title || !rawUrl) {
        result.skipped_invalid++;
        continue;
      }

      let canonicalUrl: string;

      try {
        canonicalUrl = canonicaliseUrl(rawUrl);
      } catch {
        result.skipped_invalid++;
        continue;
      }

      // URL-level deduplication.
      const {
        data: existing,
        error: existingError
      } = await supabase
        .from('articles')
        .select('id')
        .eq('canonical_url', canonicalUrl)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing?.id) {
        result.skipped_existing++;
        continue;
      }

      const contentEncoded =
        item.contentEncoded ||
        item['content:encoded'];

      const rawText = stripHtml(
        contentEncoded ||
        item.content ||
        item.contentSnippet ||
        item.summary ||
        ''
      );

      const subtitle = stripHtml(
        item.contentSnippet ||
        item.summary ||
        rawText
      ).slice(0, 420) || null;

      const author = stripHtml(
        item.creator ||
        item.dcCreator ||
        item['dc:creator'] ||
        item.author ||
        ''
      ) || null;

      const publishedAt = parseDate(
        item.isoDate || item.pubDate || null
      );

      const articleRights = sourceRightsToArticleRights(
        source.rights_status
      );

      const contentHash = rawText
        ? sha256(
          `${title.toLowerCase()}\n${rawText.toLowerCase()}`
        )
        : sha256(
          `${title.toLowerCase()}\n${canonicalUrl}`
        );

      // Content-level deduplication.
      const {
        data: duplicate,
        error: duplicateError
      } = await supabase
        .from('articles')
        .select('id')
        .eq('content_hash', contentHash)
        .limit(1)
        .maybeSingle();

      if (duplicateError) throw duplicateError;

      if (duplicate?.id) {
        result.skipped_duplicate++;
        continue;
      }

      const {
        data: article,
        error: articleError
      } = await supabase
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
          content_depth:
            articleRights === 'metadata_only'
              ? 'metadata_only'
              : rawText.length >= 2500
                ? 'full_text'
                : 'short_excerpt',
          status: 'pending'
        })
        .select('id')
        .single();

      if (articleError) {
        // Another concurrent worker may have inserted
        // the same canonical URL just before us.
        if (articleError.code === '23505') {
          result.skipped_existing++;
          continue;
        }

        throw articleError;
      }

      if (
        article?.id &&
        rawText &&
        articleRights !== 'metadata_only'
      ) {
        const { error: tempError } = await supabase
          .from('temporary_article_texts')
          .insert({
            article_id: article.id,
            raw_text: rawText,
            delete_after: new Date(
              Date.now() + 24 * 60 * 60 * 1000
            ).toISOString()
          });

        if (tempError) throw tempError;
      }

      result.inserted++;
    }

    const now = new Date().toISOString();

    const { error: sourceError } = await supabase
      .from('sources')
      .update({
        last_successful_sync: now,
        error_count: 0,
        status: 'active',
        next_retry_at: null,
        last_error: null,
        last_item_count: result.fetched,
        updated_at: now
      })
      .eq('id', source.id);

    if (sourceError) throw sourceError;

    console.log(
      `RSS ${source.name}: fetched=${result.fetched}, ` +
      `inserted=${result.inserted}`
    );

    return result;
  } catch (error) {
    return markSourceFailed(
      supabase,
      source,
      result,
      error
    );
  }
}

export async function ingestRssSources(
  supabase: any,
  options: IngestOptions = {}
) {
  const limitPerSource = Math.min(
    100,
    Math.max(0, options.limitPerSource ?? 30)
  );

  const sourceBatchSize = Math.min(
    20,
    Math.max(1, options.sourceBatchSize ?? 8)
  );

  const concurrency = Math.min(
    5,
    Math.max(1, options.concurrency ?? 3)
  );

  if (limitPerSource === 0) {
    return {
      results: [],
      source_count: 0,
      has_more: false,
      next_cursor: null
    };
  }

  // Stable keyset pagination by source UUID.
  // Do not sort by last_successful_sync because
  // ingestion updates that field while running.
  let query = supabase
    .from('sources')
    .select('*')
    .eq('source_type', 'rss')
    .in('status', ['active', 'failed'])
    .not('endpoint_url', 'is', null)
    .order('id', { ascending: true })
    .limit(sourceBatchSize + 1);

  if (options.cursor) {
    query = query.gt('id', options.cursor);
  }

  const { data, error } = await query;

  if (error) throw error;

  const fetchedSources = (data || []) as SourceRow[];
  const sources = fetchedSources.slice(0, sourceBatchSize);
  const hasMore = fetchedSources.length > sourceBatchSize;

  const results: SourceResult[] =
    new Array(sources.length);

  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex++;

      if (index >= sources.length) return;

      const source = sources[index];

      // Pass the per-source article cap by temporarily
      // using the configured count for this invocation.
      results[index] = await ingestOneSourceWithLimit(
        supabase,
        source,
        limitPerSource
      );
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, sources.length) },
      () => worker()
    )
  );

  const nextCursor = hasMore
    ? sources[sources.length - 1].id
    : null;

  return {
    results,
    source_count: sources.length,
    has_more: hasMore,
    next_cursor: nextCursor
  };
}

async function ingestOneSourceWithLimit(
  supabase: any,
  source: SourceRow,
  limitPerSource: number
): Promise<SourceResult> {
  const result: SourceResult = {
    source_id: source.id,
    source_name: source.name,
    status: 'ok',
    fetched: 0,
    inserted: 0,
    skipped_existing: 0,
    skipped_duplicate: 0,
    skipped_invalid: 0,
    error: null
  };

  if (
    source.next_retry_at &&
    new Date(source.next_retry_at).getTime() > Date.now()
  ) {
    result.status = 'deferred';
    return result;
  }

  try {
    if (!source.endpoint_url) {
      throw new Error('RSS source has no endpoint_url');
    }

    if (
      source.rights_status === 'blocked' ||
      source.rights_status === 'unknown'
    ) {
      throw new Error(
        `RSS source has unusable rights_status: ${source.rights_status}`
      );
    }

    const feed = await fetchFeed(source.endpoint_url);

    return ingestSourceItems(
      supabase,
      source,
      result,
      feed.items.slice(0, limitPerSource)
    );
  } catch (error) {
    return markSourceFailed(
      supabase,
      source,
      result,
      error
    );
  }
}

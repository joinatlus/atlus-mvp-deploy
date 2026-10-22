
/**
 * Atlus scheduled article ingestion.
 *
 * 1. Visit every eligible RSS source in small API requests.
 * 2. Deduplicate and insert articles via the existing ingestion API.
 * 3. Process a bounded number of pending articles.
 * 4. Leave remaining pending articles for future cycles.
 *
 * Designed for Vercel Hobby + GitHub Actions.
 */

const baseUrl = process.env.ATLUS_BASE_URL;
const secret = process.env.CRON_SECRET;

if (!baseUrl || !secret) {
        throw new Error(
                'Missing ATLUS_BASE_URL or CRON_SECRET'
        );
}

const origin = new URL(baseUrl);

if (origin.protocol !== 'https:') {
        throw new Error('ATLUS_BASE_URL must use HTTPS');
}

// Conservative settings until ingestion performance is measured.
const SOURCE_BATCH_SIZE = 1;
const SOURCE_CONCURRENCY = 1;
const LIMIT_PER_SOURCE = 30;

// Safety limit: at most 100 articles per scheduled cycle.
const MAX_PROCESS_BATCHES = 5;

// More than enough for the expected source count.
const MAX_SOURCE_BATCHES = 500;

// Slightly below Vercel Hobby's function timeout.
const REQUEST_TIMEOUT_MS = 260_000;

async function apiRequest(path) {
        const response = await fetch(
                new URL(path, origin),
                {
                        method: 'POST',
                        headers: {
                                authorization: `Bearer ${secret}`,
                                'content-type': 'application/json'
                        },
                        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
                }
        );

        const text = await response.text();

        if (!response.ok) {
                throw new Error(
                        `HTTP ${response.status} from ${path}: ` +
                        text.slice(0, 500)
                );
        }

        let data;

        try {
                data = JSON.parse(text);
        } catch {
                throw new Error(`Invalid JSON returned by ${path}`);
        }

        if (!data?.ok) {
                throw new Error(
                        `API returned an unsuccessful response from ${path}`
                );
        }

        return data;
}

async function ingestAllSources() {
        console.log('Starting RSS source ingestion...');

        let cursor = null;

        const totals = {
                visited: 0,
                fetched: 0,
                inserted: 0,
                skipped_existing: 0,
                skipped_duplicate: 0,
                failed: 0,
                deferred: 0
        };

        const seenCursors = new Set();

        for (
                let page = 1;
                page <= MAX_SOURCE_BATCHES;
                page++
        ) {
                const url = new URL(
                        '/api/cron/ingest-articles',
                        origin
                );

                url.searchParams.set(
                        'limitPerSource',
                        String(LIMIT_PER_SOURCE)
                );

                url.searchParams.set(
                        'sourceBatchSize',
                        String(SOURCE_BATCH_SIZE)
                );

                url.searchParams.set(
                        'concurrency',
                        String(SOURCE_CONCURRENCY)
                );

                // Don't run expensive OpenAI processing
                // inside the RSS-fetching request.
                url.searchParams.set('processLimit', '0');

                if (cursor) {
                        url.searchParams.set('cursor', cursor);
                }

                const response = await apiRequest(
                        url.pathname + url.search
                );

                const ingestion = response.ingestion;

                if (
                        !ingestion ||
                        !Array.isArray(ingestion.results) ||
                        typeof ingestion.has_more !== 'boolean'
                ) {
                        throw new Error(
                                'Unexpected RSS ingestion response format'
                        );
                }

                if (
                        ingestion.has_more &&
                        ingestion.results.length === 0
                ) {
                        throw new Error(
                                'RSS ingestion returned no sources but has_more=true'
                        );
                }

                for (const source of ingestion.results) {
                        totals.visited++;
                        totals.fetched += Number(source.fetched || 0);
                        totals.inserted += Number(source.inserted || 0);
                        totals.skipped_existing += Number(
                                source.skipped_existing || 0
                        );
                        totals.skipped_duplicate += Number(
                                source.skipped_duplicate || 0
                        );

                        if (source.status === 'failed') {
                                totals.failed++;

                                console.error(
                                        `Source failed: ${source.source_name}: ` +
                                        `${source.error || 'Unknown error'}`
                                );
                        }

                        if (source.status === 'deferred') {
                                totals.deferred++;
                        }
                }

                console.log(
                        `RSS batch ${page}: ` +
                        `${totals.visited} sources visited, ` +
                        `${totals.inserted} articles inserted, ` +
                        `${totals.failed} failed`
                );

                if (!ingestion.has_more) {
                        console.log(
                                'Completed RSS source traversal:',
                                totals
                        );

                        return totals;
                }

                const nextCursor = ingestion.next_cursor;

                if (
                        typeof nextCursor !== 'string' ||
                        !nextCursor ||
                        nextCursor === cursor ||
                        seenCursors.has(nextCursor)
                ) {
                        throw new Error(
                                'RSS pagination stopped making progress'
                        );
                }

                seenCursors.add(nextCursor);
                cursor = nextCursor;
        }

        throw new Error(
                'Exceeded maximum RSS source batches'
        );
}

async function processPendingArticles() {
        console.log('Starting bounded article processing...');

        const totals = {
                attempted: 0,
                active: 0,
                failed: 0,
                skipped: 0,
                errors: 0,
                batches: 0,
                queue_empty: false
        };

        // Detect an unexpected processing loop in which
        // supposedly completed articles are processed again.
        const activatedIds = new Set();

        for (
                let batch = 1;
                batch <= MAX_PROCESS_BATCHES;
                batch++
        ) {
                const data = await apiRequest(
                        '/api/admin/process-articles'
                );

                if (!Array.isArray(data.results)) {
                        throw new Error(
                                'Unexpected article processing response format'
                        );
                }

                const results = data.results;

                if (results.length === 0) {
                        totals.queue_empty = true;

                        console.log(
                                'No more eligible articles to process.'
                        );

                        return totals;
                }

                totals.batches++;
                totals.attempted += results.length;

                let activeThisBatch = 0;

                for (const article of results) {
                        switch (article.status) {
                                case 'active': {
                                        totals.active++;
                                        activeThisBatch++;

                                        const id = String(article.article_id);

                                        if (activatedIds.has(id)) {
                                                throw new Error(
                                                        `Article ${id} was activated repeatedly. ` +
                                                        'Stopping to prevent a processing loop.'
                                                );
                                        }

                                        activatedIds.add(id);
                                        break;
                                }

                                case 'failed':
                                        totals.failed++;
                                        break;

                                case 'skipped':
                                        totals.skipped++;
                                        break;

                                case 'error':
                                        totals.errors++;
                                        break;

                                default:
                                        throw new Error(
                                                `Unexpected article status: ${article.status}`
                                        );
                        }
                }

                console.log(
                        `Processing batch ${batch}: ` +
                        `${activeThisBatch} activated, ` +
                        `${totals.attempted} total attempts, ` +
                        `${totals.failed} failures`
                );

                if (
                        results.every(
                                (article) => article.status === 'skipped'
                        )
                ) {
                        throw new Error(
                                'All returned articles were skipped. ' +
                                'Stopping to avoid repeating the same batch.'
                        );
                }
        }

        // Reaching the safety limit is intentional.
        // The remaining backlog will be retried by later runs.
        console.log(
                'Article processing safety limit reached. ' +
                'Remaining eligible articles, if any, will be ' +
                'processed in later scheduled cycles.'
        );

        return totals;
}

// Main execution
const startedAt = Date.now();

// If ingestion itself times out, stop instead of
// launching an unexpectedly huge processing run.
const ingestion = await ingestAllSources();

const processing = await processPendingArticles();

console.log('=== ATLUS INGESTION SUMMARY ===');
console.log({
        ingestion,
        processing,
        total_duration_seconds:
                Math.round((Date.now() - startedAt) / 1000)
});

if (
        ingestion.failed > 0 ||
        processing.failed > 0 ||
        processing.errors > 0
) {
        throw new Error(
                'Some sources or articles failed. Check the logs.'
        );
}

console.log('Atlus scheduled ingestion run finished.');


const baseUrl = process.env.ATLUS_BASE_URL;
const secret = process.env.CRON_SECRET;

if (!baseUrl || !secret) {
        throw new Error(
                'Set ATLUS_BASE_URL and CRON_SECRET in GitHub Actions'
        );
}

const origin = new URL(baseUrl);

if (origin.protocol !== 'https:') {
        throw new Error('ATLUS_BASE_URL must use HTTPS');
}

async function apiRequest(path) {
        const response = await fetch(
                new URL(path, origin),
                {
                        method: 'POST',
                        headers: {
                                authorization: `Bearer ${secret}`,
                                'content-type': 'application/json'
                        },
                        signal: AbortSignal.timeout(275_000)
                }
        );

        const text = await response.text();

        if (!response.ok) {
                throw new Error(
                        `HTTP ${response.status} from ${path}: ` +
                        text.slice(0, 500)
                );
        }

        try {
                return JSON.parse(text);
        } catch {
                throw new Error(
                        `Invalid JSON response from ${path}`
                );
        }
}

async function ingestAllSources() {
        let cursor = null;
        let checked = 0;
        let inserted = 0;
        let failed = 0;
        let deferred = 0;

        const seenCursors = new Set();

        for (let page = 1; page <= 200; page++) {
                const url = new URL(
                        '/api/cron/ingest-articles',
                        origin
                );

                url.searchParams.set('limitPerSource', '30');
                url.searchParams.set('sourceBatchSize', '8');
                url.searchParams.set('concurrency', '3');
                url.searchParams.set('processLimit', '0');

                if (cursor) {
                        url.searchParams.set('cursor', cursor);
                }

                const result = await apiRequest(
                        url.pathname + url.search
                );

                if (
                        !result.ok ||
                        !result.ingestion ||
                        !Array.isArray(result.ingestion.results) ||
                        typeof result.ingestion.has_more !== 'boolean'
                ) {
                        throw new Error('Invalid ingestion response');
                }

                const ingestion = result.ingestion;

                for (const source of ingestion.results) {
                        checked++;
                        inserted += Number(source.inserted || 0);

                        if (source.status === 'failed') {
                                failed++;
                                console.error(
                                        `Failed source ${source.source_name}: ${source.error}`
                                );
                        }

                        if (source.status === 'deferred') {
                                deferred++;
                        }
                }

                console.log(
                        `Source batch ${page}: ` +
                        `${checked} checked, ` +
                        `${inserted} new articles, ` +
                        `${failed} failed, ` +
                        `${deferred} deferred`
                );

                if (!ingestion.has_more) {
                        return { checked, inserted, failed, deferred };
                }

                const next = ingestion.next_cursor;

                if (
                        typeof next !== 'string' ||
                        !next ||
                        next === cursor ||
                        seenCursors.has(next)
                ) {
                        throw new Error(
                                'Ingestion pagination stopped making progress'
                        );
                }

                seenCursors.add(next);
                cursor = next;
        }

        throw new Error('Exceeded maximum source batches');
}

async function processAllPendingArticles() {
        let total = 0;
        let failed = 0;

        for (let batch = 1; batch <= 200; batch++) {
                const result = await apiRequest(
                        '/api/admin/process-articles'
                );

                if (
                        !result.ok ||
                        !Array.isArray(result.results)
                ) {
                        throw new Error('Invalid article processing response');
                }

                if (result.results.length === 0) {
                        console.log(
                                `Article processing complete: ${total} attempts`
                        );

                        return { total, failed };
                }

                total += result.results.length;

                const batchFailed = result.results.filter(
                        (item) => item.status === 'failed' ||
                                item.status === 'error'
                ).length;

                failed += batchFailed;

                console.log(
                        `Processing batch ${batch}: ` +
                        `${result.results.length} attempted, ` +
                        `${batchFailed} failed`
                );

                // Don't spin forever if a different worker
                // holds every article in the returned batch.
                if (
                        result.results.every(
                                (item) => item.status === 'skipped'
                        )
                ) {
                        throw new Error(
                                'All articles were claimed by another worker'
                        );
                }
        }

        throw new Error('Exceeded maximum processing batches');
}

let ingestion = null;
let processing = null;
const errors = [];

try {
        console.log('Starting RSS source ingestion...');
        ingestion = await ingestAllSources();
} catch (error) {
        errors.push(error);
        console.error('Ingestion failed:', error);
}

try {
        console.log('Starting pending article processing...');
        processing = await processAllPendingArticles();
} catch (error) {
        errors.push(error);
        console.error('Article processing failed:', error);
}

console.log('Atlus ingestion summary:', {
        ingestion,
        processing
});

if (
        errors.length > 0 ||
        (ingestion && ingestion.failed > 0) ||
        (processing && processing.failed > 0)
) {
        throw new Error(
                'Atlus ingestion cycle completed with errors. Check logs.'
        );
}

console.log('Atlus ingestion cycle completed successfully.');


//
// Process all Atlus users, across multiple Vercel requests.
// Run this script from GitHub Actions, not inside Vercel.
//

const baseUrl = process.env.ATLUS_BASE_URL;
const secret = process.env.CRON_SECRET;

if (!baseUrl || !secret) {
        throw new Error(
                'Set ATLUS_BASE_URL and CRON_SECRET in GitHub Actions.'
        );
}

const origin = new URL(baseUrl);

if (origin.protocol !== 'https:') {
        throw new Error('ATLUS_BASE_URL must be an HTTPS address.');
}

const jobs = [
        {
                name: 'Refresh user representations',
                path: '/api/admin/backfill-user-representations'
        },
        {
                name: 'Generate recommendations',
                path: '/api/recommendations/generate'
        }
];

async function runAllPages(job) {
        let cursor = null;
        let pages = 0;
        let attempted = 0;
        let succeeded = 0;
        let failed = 0;

        const visitedCursors = new Set();

        while (true) {
                const requestBody = { limit: 20 };

                if (cursor !== null) {
                        requestBody.cursor = cursor;
                }

                const response = await fetch(
                        new URL(job.path, origin),
                        {
                                method: 'POST',
                                headers: {
                                        authorization: `Bearer ${secret}`,
                                        'content-type': 'application/json'
                                },
                                body: JSON.stringify(requestBody),
                                signal: AbortSignal.timeout(330_000)
                        }
                );

                if (!response.ok) {
                        const details = (await response.text()).slice(0, 400);

                        throw new Error(
                                `${job.name}: HTTP ${response.status}: ${details}`
                        );
                }

                const data = await response.json();

                if (
                        !data?.ok ||
                        !Array.isArray(data.results) ||
                        typeof data.has_more !== 'boolean'
                ) {
                        throw new Error(
                                `${job.name}: unexpected API response shape`
                        );
                }

                pages++;
                attempted += data.results.length;

                for (const result of data.results) {
                        if (result.status === 'ok') {
                                succeeded++;
                        } else {
                                failed++;

                                console.error(
                                        `${job.name} failed for user ${result.user_id}: ` +
                                        `${result.error ?? 'unknown error'}`
                                );
                        }
                }

                console.log(
                        `${job.name}: page ${pages}, ` +
                        `${data.results.length} users, ` +
                        `total ${attempted}`
                );

                if (!data.has_more) {
                        break;
                }

                const nextCursor = data.next_cursor;

                if (
                        typeof nextCursor !== 'string' ||
                        !nextCursor ||
                        nextCursor === cursor ||
                        visitedCursors.has(nextCursor)
                ) {
                        throw new Error(
                                `${job.name}: pagination stopped making progress`
                        );
                }

                visitedCursors.add(nextCursor);
                cursor = nextCursor;
        }

        console.log(
                `${job.name} finished: ` +
                `${attempted} users, ` +
                `${succeeded} succeeded, ` +
                `${failed} failed`
        );

        return failed;
}

let failedJobs = 0;
let failedUsers = 0;

for (const job of jobs) {
        try {
                failedUsers += await runAllPages(job);
        } catch (error) {
                failedJobs++;
                console.error(error);
        }
}

if (failedJobs > 0 || failedUsers > 0) {
        throw new Error(
                `Processing incomplete: ${failedJobs} job(s) errored, ` +
                `${failedUsers} user operation(s) failed.`
        );
}

console.log('All onboarded users processed successfully.');

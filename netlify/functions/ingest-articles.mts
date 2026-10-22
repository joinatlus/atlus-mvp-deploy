import { runIngestArticlesJob } from '../../lib/jobs/ingest-articles';

export default async (request: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    console.error('Rejected unauthorised ingest job invocation');
    return;
  }

  try {
    const url = new URL(request.url);
    const limitPerSource = Number(url.searchParams.get('limitPerSource') || 30);
    const processLimit = Number(url.searchParams.get('processLimit') || 40);
    const result = await runIngestArticlesJob({ limitPerSource, processLimit });
    console.log(JSON.stringify({ job: 'ingest-articles', ...result }));
  } catch (error) {
    console.error('ingest-articles background job failed', error);
    throw error;
  }
};

export const config = {
  background: true,
  path: '/api/jobs/ingest-articles',
  method: 'POST'
};

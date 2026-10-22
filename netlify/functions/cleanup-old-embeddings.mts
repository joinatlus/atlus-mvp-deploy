import { runCleanupOldEmbeddingsJob } from '../../lib/jobs/cleanup-old-embeddings';

export default async (request: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    console.error('Rejected unauthorised cleanup job invocation');
    return;
  }

  try {
    const url = new URL(request.url);
    const retentionDays = Number(url.searchParams.get('retentionDays') || 180);
    const batchSize = Number(url.searchParams.get('batchSize') || 500);
    const result = await runCleanupOldEmbeddingsJob({ retentionDays, batchSize });
    console.log(JSON.stringify({ job: 'cleanup-old-embeddings', ...result }));
  } catch (error) {
    console.error('cleanup-old-embeddings background job failed', error);
    throw error;
  }
};

export const config = {
  background: true,
  path: '/api/jobs/cleanup-old-embeddings',
  method: 'POST'
};

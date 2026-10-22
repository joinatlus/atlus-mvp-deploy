import { runDailyEmailJob } from '../../lib/jobs/daily-email';

export default async (request: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    console.error('Rejected unauthorised daily-email job invocation');
    return;
  }

  try {
    const result = await runDailyEmailJob();
    console.log(JSON.stringify({ job: 'daily-email', ...result }));
  } catch (error) {
    console.error('daily-email background job failed', error);
    throw error;
  }
};

export const config = {
  background: true,
  path: '/api/jobs/daily-email',
  method: 'POST'
};

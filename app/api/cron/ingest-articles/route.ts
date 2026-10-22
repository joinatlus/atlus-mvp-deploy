import { NextResponse } from 'next/server';
import { runIngestArticlesJob } from '@/lib/jobs/ingest-articles';

export const maxDuration = 60;

async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limitPerSource = Number(searchParams.get('limitPerSource') || 10);
  const processLimit = Number(searchParams.get('processLimit') || 5);
  const result = await runIngestArticlesJob({ limitPerSource, processLimit });
  return NextResponse.json(result);
}

export async function GET(request: Request) { return run(request); }
export async function POST(request: Request) { return run(request); }

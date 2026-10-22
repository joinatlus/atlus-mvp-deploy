
import { NextResponse } from 'next/server';
import { runIngestArticlesJob } from '@/lib/jobs/ingest-articles';

export const runtime = 'nodejs';
export const maxDuration = 300;

function readInteger(
  params: URLSearchParams,
  name: string,
  fallback: number,
  min: number,
  max: number
) {
  const raw = params.get(name);

  if (raw === null) return fallback;

  const value = Number(raw);

  if (
    !Number.isInteger(value) ||
    value < min ||
    value > max
  ) {
    throw new Error(
      `${name} must be an integer between ${min} and ${max}`
    );
  }

  return value;
}

async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json(
      { error: 'Unauthorised' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);

    const cursor = searchParams.get('cursor');

    if (
      cursor !== null &&
      !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(cursor)
    ) {
      return NextResponse.json(
        { error: 'Invalid source cursor' },
        { status: 400 }
      );
    }

    const result = await runIngestArticlesJob({
      limitPerSource: readInteger(
        searchParams,
        'limitPerSource',
        30,
        0,
        100
      ),
      sourceBatchSize: readInteger(
        searchParams,
        'sourceBatchSize',
        8,
        1,
        20
      ),
      concurrency: readInteger(
        searchParams,
        'concurrency',
        3,
        1,
        5
      ),
      processLimit: readInteger(
        searchParams,
        'processLimit',
        0,
        0,
        100
      ),
      cursor
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('RSS ingestion job failed:', error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error
          ? error.message
          : 'RSS ingestion failed'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}

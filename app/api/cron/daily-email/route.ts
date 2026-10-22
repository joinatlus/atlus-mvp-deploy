import { NextResponse } from 'next/server';
import { runDailyEmailJob } from '@/lib/jobs/daily-email';

export const maxDuration = 60;

async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!secret || auth !== secret) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  return NextResponse.json(await runDailyEmailJob());
}

export async function GET(request: Request) { return run(request); }
export async function POST(request: Request) { return run(request); }

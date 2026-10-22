import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { processPendingArticles } from '@/lib/process-pending-articles';

export const maxDuration = 800;

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!secret || auth !== secret) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();
  const results = await processPendingArticles(supabase, { limit: 100, retryFailed: true });
  return NextResponse.json({ ok: true, results });
}

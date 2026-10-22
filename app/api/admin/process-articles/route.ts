
import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { processPendingArticles } from '@/lib/process-pending-articles';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json(
      { error: 'Unauthorised' },
      { status: 401 }
    );
  }

  try {
    const supabase = createAdminSupabaseClient();
    const startedAt = Date.now();

    const results = await processPendingArticles(supabase, {
      limit: 20,
      retryFailed: true,
      concurrency: 4,
      maxRuntimeMs: 210_000
    });

    const durationMs = Date.now() - startedAt;

    const summary = {
      active: results.filter((r) => r.status === 'active').length,
      failed: results.filter((r) => r.status === 'failed').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      errors: results.filter((r) => r.status === 'error').length
    };

    console.log('Article processing complete', {
      durationMs,
      ...summary
    });

    return NextResponse.json({
      ok: true,
      duration_ms: durationMs,
      summary,
      results
    });
  } catch (error) {
    console.error('Article processing endpoint failed:', error);

    return NextResponse.json(
      { error: 'Article processing failed' },
      { status: 500 }
    );
  }
}

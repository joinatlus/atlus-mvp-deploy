
import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { refreshUserRepresentations } from '@/lib/user-representations';
import { runUserBatch } from '@/lib/user-batch';

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

  const rawBody: unknown = await request
    .json()
    .catch(() => ({}));

  const body: Record<string, unknown> =
    rawBody !== null &&
      typeof rawBody === 'object' &&
      !Array.isArray(rawBody)
      ? rawBody as Record<string, unknown>
      : {};

  const userId = body.user_id;
  const cursor = body.cursor ?? null;
  const limit = body.limit ?? 20;

  if (
    userId !== undefined &&
    (typeof userId !== 'string' || !userId.trim())
  ) {
    return NextResponse.json(
      { error: 'Invalid user_id' },
      { status: 400 }
    );
  }

  if (
    cursor !== null &&
    (typeof cursor !== 'string' || !cursor.trim())
  ) {
    return NextResponse.json(
      { error: 'Invalid cursor' },
      { status: 400 }
    );
  }

  if (
    typeof limit !== 'number' ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 50
  ) {
    return NextResponse.json(
      { error: 'limit must be between 1 and 50' },
      { status: 400 }
    );
  }

  try {
    const supabase = createAdminSupabaseClient();

    // Optional single-user backfill.
    if (typeof userId === 'string') {
      await refreshUserRepresentations(
        supabase,
        userId
      );

      return NextResponse.json({
        ok: true,
        processed: 1,
        user_id: userId
      });
    }

    // Bounded multi-user backfill.
    const result = await runUserBatch({
      supabase,
      cursor,
      limit,
      concurrency: 3,
      maxRuntimeMs: 220_000,
      processUser: async (id) => {
        await refreshUserRepresentations(supabase, id);
      }
    });

    console.log('User representation backfill:', {
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      duration_ms: result.duration_ms,
      has_more: result.has_more
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      'User representation backfill failed:',
      error
    );

    return NextResponse.json(
      { error: 'User representation backfill failed' },
      { status: 500 }
    );
  }
}

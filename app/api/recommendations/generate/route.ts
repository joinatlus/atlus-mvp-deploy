import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { generateRecommendationsForUser } from '@/lib/recommendation-service';

export const maxDuration = 800;

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!secret || auth !== secret) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const userId = body.user_id as string | undefined;
  const supabase = createAdminSupabaseClient();

  if (userId) {
    const run = await generateRecommendationsForUser(supabase, userId);
    return NextResponse.json({ ok: true, run });
  }

  const { data: profiles, error } = await supabase.from('user_profiles').select('user_id').eq('onboarding_status', 'complete');
  if (error) throw error;

  const results = [];
  for (const profile of profiles || []) {
    try {
      const run = await generateRecommendationsForUser(supabase, profile.user_id);
      results.push({ user_id: profile.user_id, run_id: run.id });
    } catch (error: any) {
      results.push({ user_id: profile.user_id, error: error.message });
    }
  }
  return NextResponse.json({ ok: true, results });
}

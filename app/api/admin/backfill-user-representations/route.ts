import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { refreshUserRepresentations } from '@/lib/user-representations';

export const maxDuration = 800;

export async function POST(request: Request) {
  const auth = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!process.env.CRON_SECRET || auth !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();
  const { data: profiles, error } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('onboarding_status', 'complete');
  if (error) throw error;

  const results: Array<{ user_id: string; status: string; error?: string }> = [];
  for (const profile of profiles || []) {
    try {
      await refreshUserRepresentations(supabase, profile.user_id);
      results.push({ user_id: profile.user_id, status: 'ok' });
    } catch (error: any) {
      results.push({ user_id: profile.user_id, status: 'failed', error: error?.message || String(error) });
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}

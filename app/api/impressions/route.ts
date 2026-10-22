import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isDemoMode } from '@/lib/demo';

export async function POST(request: Request) {
  if (isDemoMode()) return NextResponse.json({ ok: true, demo: true });

  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const recommendationItemId = String(body?.recommendationItemId || '');
  const recommendationRunId = String(body?.recommendationRunId || '');
  const articleId = String(body?.articleId || '');
  const surface = body?.surface === 'mobile_web' ? 'mobile_web' : 'web_app';
  if (!recommendationItemId || !recommendationRunId || !articleId) {
    return NextResponse.json({ error: 'Missing impression fields' }, { status: 400 });
  }

  const { data: item, error: itemError } = await supabase
    .from('recommendation_items')
    .select('id,user_id,recommendation_run_id,article_id')
    .eq('id', recommendationItemId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (itemError) return NextResponse.json({ error: itemError.message }, { status: 500 });
  if (!item || item.recommendation_run_id !== recommendationRunId || item.article_id !== articleId) {
    return NextResponse.json({ error: 'Recommendation item mismatch' }, { status: 400 });
  }

  const { error } = await supabase.from('recommendation_impressions').insert({
    user_id: user.id,
    recommendation_run_id: recommendationRunId,
    recommendation_item_id: recommendationItemId,
    article_id: articleId,
    feedback_surface: surface,
    impression_type: 'viewport',
    metadata: { visibility_threshold: 0.5 }
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

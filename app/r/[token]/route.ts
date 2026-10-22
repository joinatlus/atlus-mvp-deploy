import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/feedback-token';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { recordFeedback } from '@/lib/feedback';
import { demoArticle, isDemoMode } from '@/lib/demo';

export async function GET(_: Request, { params }: { params: { token: string } }) {
  try {
    const payload = verifyToken(params.token);
    if (payload.kind !== 'read') throw new Error('Wrong token kind');
    if (!payload.articleId || !payload.recommendationItemId) throw new Error('Read token is missing article data');
    if (isDemoMode()) {
      const article = demoArticle(payload.articleId);
      return NextResponse.redirect(article?.canonical_url || new URL('/today', _.url));
    }
    const supabase = createAdminSupabaseClient();
    await recordFeedback(supabase, {
      userId: payload.userId,
      articleId: payload.articleId,
      recommendationItemId: payload.recommendationItemId,
      recommendationRunId: payload.recommendationRunId,
      feedbackType: 'read_article',
      surface: payload.surface
    });
    const { data: article } = await supabase.from('articles').select('canonical_url').eq('id', payload.articleId).single();
    return NextResponse.redirect(article?.canonical_url || new URL('/today', _.url));
  } catch {
    return NextResponse.redirect(new URL('/today', _.url));
  }
}

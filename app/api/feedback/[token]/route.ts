import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/feedback-token';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { recordFeedback } from '@/lib/feedback';
import { isDemoMode } from '@/lib/demo';

export async function POST(request: Request, { params }: { params: { token: string } }) {
  if (isDemoMode()) {
    return NextResponse.redirect(new URL('/feedback/thanks?demo=1', request.url), 303);
  }

  const supabase = createAdminSupabaseClient();
  try {
    const payload = verifyToken(params.token);
    if (payload.kind !== 'feedback') throw new Error('Wrong token kind');
    await recordFeedback(supabase, {
      userId: payload.userId,
      articleId: payload.articleId,
      recommendationItemId: payload.recommendationItemId,
      recommendationRunId: payload.recommendationRunId,
      feedbackType: payload.feedbackType,
      surface: payload.surface
    });
    return NextResponse.redirect(new URL(`/feedback/thanks?type=${payload.feedbackType}`, request.url), 303);
  } catch (error) {
    console.error('Feedback submission failed:', error);
    return NextResponse.redirect(new URL('/feedback/thanks?error=1', request.url), 303);
  }
}

import { Nav } from '@/components/Nav';
import { verifyToken, createFeedbackToken } from '@/lib/feedback-token';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import type { FeedbackType } from '@/lib/types';
import { demoArticle, isDemoMode } from '@/lib/demo';

const options: Array<[FeedbackType, string, string]> = [
  ['more_like_this', 'More like this', 'Show me more articles with a similar subject, source or style.'],
  ['less_like_this', 'Less like this', 'Show me fewer articles like this one.'],
  ['too_basic', 'Too basic', 'I’m interested, but I already know this level.'],
  ['too_advanced', 'Too advanced', 'Keep the topic, but make it more accessible.'],
  ['already_knew_this', 'Already knew this', 'Keep the topic, but bring me something newer or deeper.'],
  ['too_similar', 'Too similar', 'Give me more variety and less repetition.'],
  ['could_not_access', 'Couldn’t access it', 'The link, paywall or source got in the way.']
];

export default async function MoreFeedbackPage({ params }: { params: { token: string } }) {
  let payload;
  try {
    payload = verifyToken(params.token);
    if (payload.kind !== 'more') throw new Error('Wrong token kind');
  } catch {
    return (
      <><Nav /><main className="page-shell max-w-lg py-16 md:py-20"><div className="card p-7"><h1 className="text-2xl font-bold">Feedback link expired</h1><p className="mt-3 text-muted">Open Atlus to give feedback directly.</p></div></main></>
    );
  }

  let articleTitle = 'This article';
  let publisherName: string | null = null;
  if (payload.articleId) {
    let article: { title?: string; publisher_name?: string } | undefined;
    if (isDemoMode()) {
      const demo = demoArticle(payload.articleId);
      article = demo ? { title: demo.title, publisher_name: demo.publisher_name } : undefined;
    } else {
      const supabase = createAdminSupabaseClient();
      const result = await supabase
        .from('articles_for_ranking_view')
        .select('title,publisher_name')
        .eq('id', payload.articleId)
        .maybeSingle();
      article = result.data || undefined;
    }
    if (article?.title) articleTitle = article.title;
    if (article?.publisher_name) publisherName = article.publisher_name;
  }

  return (
    <>
      <Nav />
      <main className="page-shell max-w-2xl">
        <div className="page-heading">
          <p className="eyebrow">More feedback</p>
          <h1>What should change?</h1>
          <p className="mt-3 leading-6 text-muted">Choose the option that best describes your reaction to this article.</p>
        </div>

        <div className="card focus-card mt-7 p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Article</p>
          <h2 className="mt-2 text-2xl font-bold leading-snug">{articleTitle}</h2>
          {publisherName && <p className="mt-2 text-sm text-muted">{publisherName}</p>}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {options.map(([type, label, description]) => {
            const token = createFeedbackToken({
              userId: payload.userId,
              articleId: payload.articleId,
              recommendationItemId: payload.recommendationItemId,
              recommendationRunId: payload.recommendationRunId,
              feedbackType: type,
              surface: payload.surface
            });
            return (
              <form key={type} action={`/api/feedback/${token}`} method="post">
                <button type="submit" className="card card-interactive group block h-full w-full p-5 text-left">
                  <p className="font-semibold group-hover:text-brand">{label}</p>
                  <p className="mt-1 text-sm text-muted">{description}</p>
                </button>
              </form>
            );
          })}
        </div>
      </main>
    </>
  );
}

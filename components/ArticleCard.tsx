import Link from 'next/link';
import { createReadToken, createFeedbackToken, createMoreFeedbackToken } from '@/lib/feedback-token';
import type { RecommendationItemView } from '@/lib/types';
import { ImpressionTracker } from '@/components/ImpressionTracker';

const slotCopy: Record<string, string> = {
  core: 'For you',
  stretch: 'Go deeper',
  discovery: 'Something different'
};

export function ArticleCard({ item, surface = 'web_app' }: { item: RecommendationItemView; surface?: 'web_app' | 'email' | 'mobile_web' }) {
  const readToken = createReadToken({
    userId: item.user_id,
    articleId: item.article_id,
    recommendationItemId: item.id,
    recommendationRunId: item.recommendation_run_id,
    surface
  });
  const moreToken = createMoreFeedbackToken({
    userId: item.user_id,
    articleId: item.article_id,
    recommendationItemId: item.id,
    recommendationRunId: item.recommendation_run_id,
    surface
  });
  const goodPick = createFeedbackToken({
    userId: item.user_id,
    articleId: item.article_id,
    recommendationItemId: item.id,
    recommendationRunId: item.recommendation_run_id,
    feedbackType: 'good_pick',
    surface
  });
  const notForMe = createFeedbackToken({
    userId: item.user_id,
    articleId: item.article_id,
    recommendationItemId: item.id,
    recommendationRunId: item.recommendation_run_id,
    feedbackType: 'not_for_me',
    surface
  });
  const save = createFeedbackToken({
    userId: item.user_id,
    articleId: item.article_id,
    recommendationItemId: item.id,
    recommendationRunId: item.recommendation_run_id,
    feedbackType: 'save',
    surface
  });

  return (
    <ImpressionTracker
      recommendationItemId={item.id}
      recommendationRunId={item.recommendation_run_id}
      articleId={item.article_id}
      surface={surface === 'mobile_web' ? 'mobile_web' : 'web_app'}
    >
    <article className="card overflow-hidden">
      <div className="p-6 sm:p-7">
        <div className="mb-4 text-xs font-bold uppercase tracking-[0.12em] text-brand">
          {slotCopy[item.slot_type] ?? item.slot_type}
        </div>
        <h2 className="text-2xl font-semibold leading-tight sm:text-[1.7rem]">{item.article.title}</h2>
        <p className="mt-2 text-sm text-muted">
          {item.article.publisher_name}
          {item.article.reading_time_minutes != null && (
            <> <span className="mx-1 text-line">/</span> {item.article.reading_time_minutes} min read</>
          )}
        </p>
        {item.explanation_text && (
          <div className="mt-5 bg-paper/70 px-4 py-3.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Why this one</p>
            <p className="mt-1.5 text-sm leading-6 text-ink">{item.explanation_text}</p>
          </div>
        )}
        <div className="mt-6">
          <Link className="btn-primary" href={`/r/${readToken}`}>Read article <span className="ml-2" aria-hidden="true">↗</span></Link>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1 border-t border-line bg-wash/35 px-4 py-2.5 sm:px-5">
        <span className="mr-1 text-xs text-muted">Was this useful?</span>
        <form action={`/api/feedback/${goodPick}`} method="post"><button className="btn-quiet" type="submit">Good pick</button></form>
        <form action={`/api/feedback/${notForMe}`} method="post"><button className="btn-quiet" type="submit">Not for me</button></form>
        <form action={`/api/feedback/${save}`} method="post"><button className="btn-quiet" type="submit">Save</button></form>
        <Link className="btn-quiet" href={`/feedback/more/${moreToken}`}>More…</Link>
      </div>
    </article>
    </ImpressionTracker>
  );
}

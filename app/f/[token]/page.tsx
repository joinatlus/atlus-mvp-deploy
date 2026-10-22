import { Nav } from '@/components/Nav';
import { verifyToken } from '@/lib/feedback-token';
import type { FeedbackType } from '@/lib/types';

const feedbackCopy: Partial<Record<FeedbackType, { title: string; body: string; button: string }>> = {
  good_pick: { title: 'Relevant', body: 'Tell Atlus this recommendation was useful to you.', button: 'Mark as relevant' },
  not_for_me: { title: 'Not relevant', body: 'Tell Atlus to reduce similar recommendations in future editions.', button: 'Mark as not relevant' },
  save: { title: 'Save article', body: 'Save this article to your Atlus reading list.', button: 'Save article' },
  more_like_this: { title: 'More like this', body: 'Tell Atlus to favour genuinely similar articles in future recommendations.', button: 'Show me more like this' },
  less_like_this: { title: 'Less like this', body: 'Tell Atlus to reduce genuinely similar articles in future recommendations.', button: 'Show me less like this' },
  too_basic: { title: 'Too basic', body: 'Keep the topic, but raise the expected level.', button: 'Mark as too basic' },
  too_advanced: { title: 'Too advanced', body: 'Keep the topic, but make future recommendations more accessible.', button: 'Mark as too advanced' },
  already_knew_this: { title: 'Already knew this', body: 'Keep the topic, but favour greater depth or novelty.', button: 'Mark as already known' },
  too_similar: { title: 'Too similar', body: 'Increase diversity without treating the topic itself as a dislike.', button: 'Increase diversity' },
  could_not_access: { title: 'Couldn’t access', body: 'Flag an access problem without changing your topic preferences.', button: 'Flag access problem' },
  slate_great: { title: 'Very useful', body: 'Tell Atlus today’s selection was very useful.', button: 'Submit rating' },
  slate_okay: { title: 'Somewhat useful', body: 'Tell Atlus today’s selection was somewhat useful.', button: 'Submit rating' },
  slate_poor: { title: 'Not useful', body: 'Tell Atlus today’s selection was not useful.', button: 'Submit rating' }
};

export default function FeedbackConfirmPage({ params }: { params: { token: string } }) {
  try {
    const payload = verifyToken(params.token);
    if (payload.kind !== 'feedback') throw new Error('Wrong token kind');
    const copy = feedbackCopy[payload.feedbackType] || {
      title: 'Confirm feedback',
      body: 'Submit this feedback to Atlus.',
      button: 'Confirm feedback'
    };

    return (
      <>
        <Nav />
        <main className="page-shell max-w-lg py-16 md:py-20">
          <div className="card focus-card p-7 text-center sm:p-9">
            <p className="eyebrow mb-3">Confirm feedback</p>
            <h1 className="text-3xl font-bold">{copy.title}</h1>
            <p className="mx-auto mt-3 max-w-sm leading-6 text-muted">{copy.body}</p>
            <form action={`/api/feedback/${params.token}`} method="post" className="mt-6">
              <button type="submit" className="btn-primary">{copy.button}</button>
            </form>
          </div>
        </main>
      </>
    );
  } catch {
    return (
      <>
        <Nav />
        <main className="page-shell max-w-lg py-16 md:py-20">
          <div className="card p-7">
            <h1 className="text-2xl font-bold">Feedback link expired</h1>
            <p className="mt-3 text-muted">Open Atlus to give feedback directly.</p>
          </div>
        </main>
      </>
    );
  }
}

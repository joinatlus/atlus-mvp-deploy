import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { ArticleCard } from '@/components/ArticleCard';
import { requireUser } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createSlateFeedbackToken } from '@/lib/feedback-token';
import { DEMO_ITEMS, DEMO_PROFILE, isDemoMode } from '@/lib/demo';

export default async function TodayPage() {
  const user = await requireUser();
  const demo = isDemoMode();
  let run: { id: string; created_at?: string; status?: string } | null = demo ? { id: 'demo-run' } : null;
  let profile: { onboarding_status?: string } | null = demo ? DEMO_PROFILE : null;
  let items: any[] = demo ? DEMO_ITEMS : [];

  if (!demo) {
    const supabase = createServerSupabaseClient();
    const [runResult, profileResult] = await Promise.all([
      supabase
        .from('recommendation_runs')
        .select('id,created_at,status')
        .eq('user_id', user.id)
        .eq('status', 'complete')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('user_profiles').select('onboarding_status').eq('user_id', user.id).maybeSingle()
    ]);
    run = runResult.data;
    profile = profileResult.data;
    if (run) {
      const { data } = await supabase
        .from('recommendation_items_view')
        .select('*')
        .eq('recommendation_run_id', run.id)
        .order('rank_position');
      items = data || [];
    }
  }

  const slateLinks = run ? {
    great: createSlateFeedbackToken({ userId: user.id, recommendationRunId: run.id, feedbackType: 'slate_great', surface: 'web_app' }),
    okay: createSlateFeedbackToken({ userId: user.id, recommendationRunId: run.id, feedbackType: 'slate_okay', surface: 'web_app' }),
    poor: createSlateFeedbackToken({ userId: user.id, recommendationRunId: run.id, feedbackType: 'slate_poor', surface: 'web_app' })
  } : null;

  return (
    <>
      <Nav />
      <main className="page-shell max-w-4xl">
        <div className="mb-9 border-b border-line pb-6">
          <p className="eyebrow">Today’s reading</p>
          <h1 className="mt-2 text-4xl font-semibold sm:text-[2.75rem]">Worth your time today</h1>
          <p className="mt-2 text-sm text-muted">A small set of articles shaped by your interests and feedback.</p>
        </div>
        {items.length ? (
          <>
            <div className="space-y-6">{items.map((item) => <ArticleCard key={item.id} item={item} />)}</div>
            {slateLinks && <div className="card mt-7 p-5 text-center"><p className="font-semibold">How was today’s selection overall?</p><div className="mt-3 flex justify-center gap-2"><form action={`/api/feedback/${slateLinks.great}`} method="post"><button className="btn-secondary" type="submit">Great</button></form><form action={`/api/feedback/${slateLinks.okay}`} method="post"><button className="btn-secondary" type="submit">Okay</button></form><form action={`/api/feedback/${slateLinks.poor}`} method="post"><button className="btn-secondary" type="submit">Poor</button></form></div></div>}
          </>
        ) : profile?.onboarding_status !== 'complete' ? (
          <div className="card p-6 sm:p-8">
            <h2 className="text-2xl font-semibold">Tell Atlus what you’re into</h2>
            <p className="mt-3 text-muted">Set up your interests and reading style to create your first edition.</p>
            <Link className="btn-primary mt-6" href="/onboarding">Set up my reading</Link>
          </div>
        ) : (
          <div className="card p-6 sm:p-8">
            <h2 className="text-2xl font-semibold">Nothing ready just yet</h2>
            <p className="mt-3 text-muted">Your preferences are saved. Your next edition will appear here when it’s ready.</p>
            <Link className="btn-secondary mt-6" href="/profile">Review my interests</Link>
          </div>
        )}
      </main>
    </>
  );
}

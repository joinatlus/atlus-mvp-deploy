import { Nav } from '@/components/Nav';
import { requireUser } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createReadToken } from '@/lib/feedback-token';
import { DEMO_ITEMS, isDemoMode } from '@/lib/demo';

const slotLabels: Record<string, string> = { core: 'Selected for you', stretch: 'Further reading', discovery: 'Outside your usual reading' };

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

export default async function ArchivePage() {
  const user = await requireUser();
  let items: any[] = DEMO_ITEMS.map((item, index) => ({ ...item, created_at: new Date(Date.now() - index * 86400000).toISOString() }));
  if (!isDemoMode()) {
    const supabase = createServerSupabaseClient();
    const result = await supabase
      .from('recommendation_items_view')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    items = result.data || [];
  }

  return (
    <>
      <Nav />
      <main className="page-shell max-w-5xl">
        <div className="page-heading">
          <p className="eyebrow">Your reading history</p>
          <h1>Archive</h1>
          <p>Previous recommendations in one place. Open an article to revisit it.</p>
        </div>
        <div className="mt-7 overflow-hidden rounded-2xl border border-line bg-white">
          {(items || []).map((item: any, index: number) => {
            const readToken = createReadToken({
              userId: item.user_id,
              articleId: item.article_id,
              recommendationItemId: item.id,
              recommendationRunId: item.recommendation_run_id,
              surface: 'web_app'
            });
            return (
            <a key={item.id} href={`/r/${readToken}`} className={`group block p-5 transition hover:bg-[#fafbf9] sm:grid sm:grid-cols-[7rem_1fr_auto] sm:items-center sm:gap-5 ${index ? 'border-t border-line' : ''}`}>
              <div>
                <p className="text-xs font-medium text-muted">{formatDate(item.created_at)}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-brand">{slotLabels[item.slot_type] || item.slot_type}</p>
              </div>
              <div>
                <h2 className="mt-2 text-lg font-bold leading-snug transition group-hover:text-brand sm:mt-0">{item.article.title}</h2>
                <p className="mt-1 text-sm text-muted">
                  {item.article.publisher_name}
                  {item.article.reading_time_minutes != null && <> · {item.article.reading_time_minutes} min</>}
                </p>
              </div>
              <span className="mt-3 inline-block text-lg text-muted transition group-hover:text-brand sm:mt-0" aria-hidden="true">↗</span>
            </a>
            );
          })}
          {!items?.length && <p className="p-6 text-sm text-muted">No previous recommendations yet.</p>}
        </div>
      </main>
    </>
  );
}

import { Nav } from '@/components/Nav';
import { requireAdmin } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateForMe } from './actions';

export default async function AdminRecommendationsPage() {
  const user = await requireAdmin();
  const supabase = createServerSupabaseClient();
  const { data: runs } = await supabase.from('recommendation_runs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10);

  return (
    <><Nav /><main className="page-shell max-w-3xl"><div className="mb-7 border-b border-line pb-5"><p className="eyebrow mb-3">Admin tools</p><h1 className="text-4xl font-bold">Recommendation runs</h1></div>
      <div className="card p-6 sm:p-8"><h2 className="text-3xl font-bold">Generate a test edition</h2><p className="mt-3 leading-6 text-muted">Create a fresh edition for your admin account using the current recommendation setup.</p><form action={generateForMe} className="mt-6"><button className="btn-primary">Generate edition</button></form></div>
      <div className="mt-8 space-y-4">{(runs || []).map((run: any) => <div key={run.id} className="card grid gap-2 p-5 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">{run.status} · {run.reading_mode}</p><p className="mt-1 text-sm font-medium">{run.model_version}</p><p className="mt-1 text-xs text-muted">{run.created_at}</p></div><p className="text-sm text-muted">Requested {run.requested_count} · Generated {run.generated_count} · Fallback {run.fallback_used ? 'yes' : 'no'}</p></div>)}</div>
    </main></>
  );
}

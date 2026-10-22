import { Nav } from '@/components/Nav';
import { requireAdmin } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { importArticle } from './actions';

export default async function AdminArticlesPage() {
  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const [{ data: articles }, { data: sources }] = await Promise.all([
    supabase.from('articles_admin_view').select('*').order('created_at', { ascending: false }).limit(50),
    supabase.from('sources').select('id,name,status,error_count,last_successful_sync,last_failed_sync,next_retry_at,last_error').order('name').limit(100)
  ]);

  return (
    <><Nav /><main className="page-shell max-w-6xl">
      <div className="mb-7 border-b border-line pb-5"><p className="eyebrow mb-3">Library tools</p><h1 className="text-4xl font-bold">Article desk</h1></div>
      <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-start">
        <div className="card p-6 sm:p-7"><h2 className="text-2xl font-bold">Import article</h2><p className="mt-2 text-sm leading-6 text-muted">Rights decide whether Atlus may use pasted text during processing. Metadata-only imports ignore the pasted body.</p><form action={importArticle} className="mt-6 space-y-4">
          <div><label>Publisher</label><input name="publisher_name" required placeholder="Works in Progress" /></div>
          <div><label>Title</label><input name="title" required /></div>
          <div><label>URL</label><input name="canonical_url" type="url" required /></div>
          <div><label>Published at</label><input name="published_at" type="datetime-local" /></div>
          <div><label>Author</label><input name="author" /></div>
          <div><label>Subtitle</label><input name="subtitle" /></div>
          <div><label>Rights</label><select name="rights_status" defaultValue="metadata_only"><option value="metadata_only">Metadata only</option><option value="temporary_content_processing_allowed">Temporary processing allowed</option><option value="full_content_licensed">Full content licensed</option></select></div>
          <div><label>Body / notes for processing</label><textarea name="raw_text" rows={8} placeholder="Only used when the selected rights allow content processing." /></div>
          <button className="btn-primary">Import and process</button>
        </form></div>
        <div><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-bold">Recent articles</h2><form action="/api/admin/process-articles" method="post"><button className="btn-secondary">Process backlog</button></form></div><div className="space-y-4">{(articles || []).map((article: any) => <div key={article.id} className="card p-5"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">{article.status} · {article.publisher_name}</p><h3 className="mt-2 text-xl font-bold">{article.title}</h3><p className="mt-2 text-sm text-muted">{article.primary_topic || 'No topic yet'} · {article.primary_iptc_qcode || 'no IPTC'} · quality {Number(article.quality_score ?? 0).toFixed(2)} · evergreen {Number(article.evergreen_score ?? 0).toFixed(2)} · freshness {Number(article.freshness_score ?? 0).toFixed(2)}</p><p className="mt-1 text-xs text-muted">{article.content_depth || 'unknown depth'} · processing confidence {Number(article.processing_confidence ?? 0).toFixed(2)} · {article.atlus_tags?.join(', ') || 'no tags'}</p>{article.processing_error && <p className="mt-2 text-sm text-red-700">{article.processing_error}</p>}</div>)}{!articles?.length && <p className="empty-state">No articles imported yet.</p>}</div></div>
      </div>
      <section className="mt-10"><p className="eyebrow">Operations</p><h2 className="mt-1 text-2xl font-bold">Source health</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{(sources || []).map((source: any) => <div key={source.id} className="card p-4"><p className="font-bold">{source.name}</p><p className="mt-1 text-xs text-muted">{source.status} · errors {source.error_count} · last success {source.last_successful_sync || 'never'}</p>{source.last_error && <p className="mt-2 text-sm text-red-700">{source.last_error}</p>}{source.next_retry_at && <p className="mt-1 text-xs text-muted">Retry after {source.next_retry_at}</p>}</div>)}</div></section>
    </main></>
  );
}

import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { requireUser } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { IPTC_TOPICS } from '@/lib/iptc';
import { addPreference, deleteAssumption, tuneAssumption } from './actions';
import { DEMO_ASSUMPTIONS, DEMO_PROFILE, isDemoMode } from '@/lib/demo';

const knowledgeLabels: Record<string, string> = {
  '0': 'New to this',
  '1': 'Know the basics',
  '2': 'Read it regularly',
  '3': 'Know it well'
};

const learningModeLabels: Record<string, string> = {
  foundations: 'Build the foundations',
  deepen: 'Go deeper',
  keep_up: 'Keep up with developments'
};

const readingLabels: Record<string, string> = {
  light: '1 article',
  standard: '3 articles',
  deep: '5 articles'
};

const noveltyLabels: Record<string, string> = {
  low: 'Mostly familiar',
  medium: 'Balanced',
  high: 'More adventurous'
};

const perspectiveLabels: Record<string, string> = {
  match: 'Mostly familiar viewpoints',
  balance: 'Balanced mix',
  challenge: 'More challenging viewpoints'
};

const geographyLabels: Record<string, string> = {
  more: 'More often',
  normal: 'Balanced',
  less: 'Less often'
};

function topicLabel(value: string) {
  return IPTC_TOPICS.find((topic) => topic.qcode === value)?.uiLabel || value;
}

function RemoveButton({ id, label = 'Remove' }: { id: string; label?: string }) {
  return (
    <form action={deleteAssumption}>
      <input type="hidden" name="id" value={id} />
      <button className="profile-remove" aria-label={`${label} preference`}>{label}</button>
    </form>
  );
}

function GoalCard({ goal }: { goal: any }) {
  const value = goal.structured_value || {};
  const knowledge = knowledgeLabels[String(value.knowledge_level ?? '')];
  const mode = learningModeLabels[String(value.learning_mode ?? '')];
  const isFocus = value.priority === 'focus';

  return (
    <article className={`profile-goal ${isFocus ? 'is-focus' : ''}`}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {isFocus && <span className="profile-kicker">Current focus</span>}
          {!isFocus && <span className="profile-kicker subtle">Learning goal</span>}
        </div>
        <h3 className="mt-2 text-lg font-semibold leading-snug text-ink">{goal.label}</h3>
        <p className="mt-2 text-sm text-muted">{[knowledge, mode].filter(Boolean).join(' · ')}</p>
      </div>
      <RemoveButton id={goal.id} />
    </article>
  );
}

function LearnedPattern({ assumption }: { assumption: any }) {
  return (
    <article className="profile-learned-row">
      <div className="min-w-0">
        <p className="font-medium text-ink">{assumption.label}</p>
        <p className="mt-1 text-xs text-muted">Inferred from your reading and feedback</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-1.5">
        {[
          ['confirm', 'Yes'],
          ['more', 'More'],
          ['less', 'Less'],
          ['suppress', 'Not for me']
        ].map(([direction, label]) => (
          <form action={tuneAssumption} key={direction}>
            <input type="hidden" name="id" value={assumption.id} />
            <input type="hidden" name="direction" value={direction} />
            <button className="btn-quiet">{label}</button>
          </form>
        ))}
      </div>
    </article>
  );
}

export default async function ProfilePage() {
  const user = await requireUser();
  let assumptions: any[] = DEMO_ASSUMPTIONS;
  let profile: any = DEMO_PROFILE;
  if (!isDemoMode()) {
    const supabase = createServerSupabaseClient();
    const [assumptionsResult, profileResult] = await Promise.all([
      supabase.from('user_assumptions').select('*').eq('user_id', user.id).eq('active', true).order('created_at'),
      supabase.from('user_profiles').select('*').eq('user_id', user.id).maybeSingle()
    ]);
    assumptions = assumptionsResult.data || [];
    profile = profileResult.data;
  }

  const allAssumptions = assumptions;
  const explicit = allAssumptions.filter((a: any) => ['onboarding', 'user_edit', 'admin'].includes(a.source));
  const learned = allAssumptions.filter((a: any) => ['feedback', 'model_update'].includes(a.source));

  const goals = explicit.filter((a: any) => a.assumption_type === 'goal' && Number(a.weight ?? 1) > 0);
  const knowledge = explicit.filter((a: any) => a.assumption_type === 'knowledge' && Number(a.weight ?? 1) > 0);
  const knowledgeByLabel = new Map(knowledge.map((item: any) => [item.label, Number(item.structured_value?.level ?? 1)]));

  const interests = explicit.filter((a: any) =>
    a.assumption_type === 'preference' &&
    Number(a.weight ?? 1) > 0 &&
    (a.source === 'onboarding' || a.topic_qcode || a.atlus_tag) &&
    !a.structured_value?.original_text
  );
  const broadInterests = interests.filter((a: any) => a.structured_value?.level === 'broad');
  const focusInterests = interests.filter((a: any) => a.structured_value?.level !== 'broad');
  const customPreferences = explicit.filter((a: any) =>
    a.assumption_type === 'preference' &&
    Number(a.weight ?? 1) > 0 &&
    a.structured_value?.original_text
  );

  const perspectivePreferences = profile?.perspective_preferences || {};
  const geographyPreferences = profile?.geography_preferences || {};
  const perspectiveExceptions = Object.entries(perspectivePreferences).filter(([, value]) => value !== 'balance');
  const geographyExceptions = Object.entries(geographyPreferences).filter(([, value]) => value !== 'normal');
  const sources = Array.isArray(profile?.source_exposure) ? profile.source_exposure : [];
  const exclusions = Array.isArray(profile?.topic_exclusions) ? profile.topic_exclusions : [];
  const focusGoal = goals.find((goal: any) => goal.structured_value?.priority === 'focus') || goals[0];

  return (
    <>
      <Nav />
      <main className="page-shell max-w-5xl">
        <div className="page-heading flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Your profile</p>
            <h1>What Atlus is tuned for</h1>
            <p>
              {focusGoal
                ? <>Your recommendations are centred on <strong className="font-semibold text-ink">{focusGoal.label}</strong>, alongside {broadInterests.length || interests.length} main interest{(broadInterests.length || interests.length) === 1 ? '' : 's'}.</>
                : <>Your interests, learning goals and reading preferences shape each edition.</>}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link className="btn-secondary" href="/settings">Edition settings</Link>
            <Link className="btn-secondary" href="/onboarding">Redo setup</Link>
          </div>
        </div>

        <section className="profile-edition mt-7" aria-labelledby="edition-heading">
          <div>
            <p className="eyebrow">Your daily edition</p>
            <h2 id="edition-heading" className="mt-1 text-2xl font-bold">The shape of your reading</h2>
          </div>
          <dl className="profile-edition-stats">
            <div>
              <dt>Amount</dt>
              <dd>{readingLabels[profile?.reading_mode] || '3 articles'}</dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>{String(profile?.delivery_time || '08:00').slice(0, 5)}</dd>
            </div>
            <div>
              <dt>Discovery</dt>
              <dd>{noveltyLabels[profile?.novelty_tolerance] || 'Balanced'}</dd>
            </div>
          </dl>
        </section>

        <section className="mt-11">
          <div className="profile-section-heading">
            <div>
              <p className="eyebrow">Learning</p>
              <h2>What you want to understand</h2>
            </div>
            <span>{goals.length} goal{goals.length === 1 ? '' : 's'}</span>
          </div>
          {goals.length ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {goals.map((goal: any) => <GoalCard key={goal.id} goal={goal} />)}
            </div>
          ) : (
            <p className="empty-state mt-4">No learning goals yet.</p>
          )}
        </section>

        <section className="mt-11">
          <div className="profile-section-heading">
            <div>
              <p className="eyebrow">Interests</p>
              <h2>What you want in the mix</h2>
            </div>
            <span>{interests.length} selected</span>
          </div>

          <div className="profile-interest-panel mt-4">
            {broadInterests.length > 0 && (
              <div>
                <p className="profile-label">Main areas</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {broadInterests.map((interest: any) => (
                    <div className="profile-interest-chip" key={interest.id}>
                      <span>{interest.label}</span>
                      <RemoveButton id={interest.id} label="×" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {focusInterests.length > 0 && (
              <div className={broadInterests.length ? 'mt-7 border-t border-line pt-6' : ''}>
                <p className="profile-label">Focus areas</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {focusInterests.map((interest: any) => {
                    const level = knowledgeByLabel.get(interest.label);
                    return (
                      <div className="profile-interest-row" key={interest.id}>
                        <div className="min-w-0">
                          <p className="font-medium text-ink">{interest.label}</p>
                          {level !== undefined && <p className="mt-0.5 text-xs text-muted">{knowledgeLabels[String(level)]}</p>}
                        </div>
                        <RemoveButton id={interest.id} label="×" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!interests.length && <p className="text-sm text-muted">No interests selected yet.</p>}
          </div>
        </section>

        <section className="mt-11">
          <div className="profile-section-heading">
            <div>
              <p className="eyebrow">Reading preferences</p>
              <h2>How Atlus should shape the mix</h2>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="profile-preference-card">
              <p className="profile-label">Viewpoints</p>
              {perspectiveExceptions.length ? (
                <div className="mt-3 space-y-2.5">
                  {perspectiveExceptions.map(([topic, value]) => (
                    <div className="profile-pair" key={topic}>
                      <span>{topic}</span>
                      <strong>{perspectiveLabels[String(value)] || String(value)}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-muted">A balanced mix across politics, economics, society and climate.</p>
              )}
            </div>

            <div className="profile-preference-card">
              <p className="profile-label">Geography</p>
              {geographyExceptions.length ? (
                <div className="mt-3 space-y-2.5">
                  {geographyExceptions.map(([region, value]) => (
                    <div className="profile-pair" key={region}>
                      <span>{region}</span>
                      <strong>{geographyLabels[String(value)] || String(value)}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-muted">A balanced geographical mix, without any region deliberately boosted or reduced.</p>
              )}
            </div>
          </div>

          {(sources.length > 0 || exclusions.length > 0) && (
            <details className="profile-details mt-3">
              <summary>Sources and exclusions</summary>
              <div className="grid gap-6 border-t border-line px-5 py-5 sm:grid-cols-2">
                <div>
                  <p className="profile-label">Already in your reading</p>
                  {sources.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {sources.map((source: string) => <span className="profile-soft-chip" key={source}>{source}</span>)}
                    </div>
                  ) : <p className="mt-2 text-sm text-muted">None specified.</p>}
                </div>
                <div>
                  <p className="profile-label">Keep out</p>
                  {exclusions.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {exclusions.map((item: string) => <span className="profile-soft-chip" key={item}>{topicLabel(item)}</span>)}
                    </div>
                  ) : <p className="mt-2 text-sm text-muted">No explicit exclusions.</p>}
                </div>
              </div>
            </details>
          )}
        </section>

        <section className="mt-11">
          <div className="profile-section-heading">
            <div>
              <p className="eyebrow">Your own notes</p>
              <h2>Anything else Atlus should know</h2>
            </div>
          </div>

          {customPreferences.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {customPreferences.map((preference: any) => (
                <div className="profile-note-chip" key={preference.id}>
                  <span>{preference.label}</span>
                  <RemoveButton id={preference.id} label="×" />
                </div>
              ))}
            </div>
          )}

          <form action={addPreference} className="profile-add-note mt-4">
            <input name="label" placeholder="e.g. I prefer analytical pieces over breaking news" required />
            <button className="btn-primary shrink-0">Add</button>
          </form>
        </section>

        <section className="mt-11 border-t border-line pt-9">
          <div className="profile-section-heading">
            <div>
              <p className="eyebrow">From your feedback</p>
              <h2>What Atlus is learning</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">These are tentative patterns, not fixed parts of your profile. Correct them whenever they miss the mark.</p>
            </div>
          </div>
          {learned.length ? (
            <div className="mt-4 overflow-hidden rounded-xl border border-line bg-white">
              {learned.map((assumption: any) => <LearnedPattern key={assumption.id} assumption={assumption} />)}
            </div>
          ) : (
            <p className="empty-state mt-4">Nothing inferred yet. This section will fill in gradually as you use feedback.</p>
          )}
        </section>
      </main>
    </>
  );
}

import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { requireUser } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { saveSettings } from './actions';
import { DEMO_PROFILE, isDemoMode } from '@/lib/demo';

export default async function SettingsPage() {
  const user = await requireUser();
  let profile: any = DEMO_PROFILE;
  if (!isDemoMode()) {
    const supabase = createServerSupabaseClient();
    const result = await supabase.from('user_profiles').select('*').eq('user_id', user.id).maybeSingle();
    profile = result.data;
  }

  return (
    <>
      <Nav />
      <main className="page-shell max-w-3xl">
        <div className="page-heading mb-7">
          <p className="eyebrow">Preferences</p>
          <h1>Settings</h1>
          <p>Control how much Atlus sends, when it arrives and how far it should wander from your usual interests.</p>
        </div>

        <section className="card p-6 sm:p-8">
          <div className="grid gap-8 md:grid-cols-[12rem_1fr]">
            <div>
              <h2 className="text-xl font-bold">Daily edition</h2>
              <p className="mt-2 text-sm leading-6 text-muted">These settings change the shape and timing of your everyday recommendations.</p>
            </div>
            <form action={saveSettings} className="space-y-6">
              <div>
                <label htmlFor="reading_mode">Daily amount</label>
                <select name="reading_mode" id="reading_mode" defaultValue={profile?.reading_mode || 'standard'}>
                  <option value="light">Light — 1 article</option>
                  <option value="standard">Standard — 3 articles</option>
                  <option value="deep">Deep — 5 articles</option>
                </select>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="delivery_time">Delivery time</label>
                  <input id="delivery_time" name="delivery_time" type="time" defaultValue={String(profile?.delivery_time || '08:00').slice(0,5)} />
                </div>
                <div>
                  <label htmlFor="timezone">Timezone</label>
                  <input id="timezone" name="timezone" defaultValue={profile?.timezone || 'Europe/London'} placeholder="Europe/London" />
                </div>
              </div>
              <div>
                <label htmlFor="novelty_tolerance">How adventurous should the picks be?</label>
                <select id="novelty_tolerance" name="novelty_tolerance" defaultValue={profile?.novelty_tolerance || 'medium'}>
                  <option value="low">Gentle — mostly familiar territory</option>
                  <option value="medium">Balanced — familiar plus worthwhile surprises</option>
                  <option value="high">Adventurous — more adjacent subjects</option>
                </select>
              </div>
              <button className="btn-primary">Save changes</button>
            </form>
          </div>
        </section>

        <section className="card mt-6 p-6 sm:p-8">
          <div className="grid gap-6 md:grid-cols-[12rem_1fr]">
            <div>
              <h2 className="text-xl font-bold">Account</h2>
              <p className="mt-2 text-sm leading-6 text-muted">Security and onboarding controls.</p>
            </div>
            <div>
              <p className="text-sm text-muted">Signed in as</p>
              <p className="mt-1 font-medium text-ink">{user.email}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link className="btn-secondary" href="/forgot-password">Reset password</Link>
                <Link className="btn-secondary" href="/onboarding">Redo setup</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { signIn, signUp } from './actions';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isDemoMode } from '@/lib/demo';

const errorCopy: Record<string, string> = {
  missing: 'Enter both your email and password.',
  invalid: 'That email and password combination did not work.',
  password: 'Use a password with at least 8 characters.',
  signup: 'We could not create that account. Try signing in, or use a different email.',
  session: 'Your sign-in link is no longer valid. Please sign in again.'
};

export default async function LoginPage({ searchParams }: { searchParams: { mode?: string; created?: string; error?: string } }) {
  const demo = isDemoMode();
  if (!demo) {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('user_profiles').select('onboarding_status').eq('user_id', user.id).maybeSingle();
      redirect(profile?.onboarding_status === 'complete' ? '/today' : '/onboarding');
    }
  }

  const creating = searchParams.mode === 'signup';
  const error = searchParams.error ? errorCopy[searchParams.error] || 'Something went wrong. Please try again.' : null;

  return (
    <>
      <Nav />
      <main className="mx-auto grid min-h-[calc(100dvh-64px)] max-w-5xl items-start gap-10 px-5 py-3 sm:px-8 sm:py-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:py-16">
        <section className="mx-auto w-full max-w-lg">
          <div className="card focus-card p-4 sm:p-8">
            <div className="mb-4 grid grid-cols-2 rounded-xl bg-wash p-1 sm:mb-7">
              <Link className={`rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition ${!creating ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`} href="/login">Sign in</Link>
              <Link className={`rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition ${creating ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`} href="/login?mode=signup">Create account</Link>
            </div>

            <p className="eyebrow mb-2">{creating ? 'Get started' : 'Welcome back'}</p>
            <h2 className="text-[26px] font-bold leading-tight sm:text-3xl">{creating ? 'Create your Atlus account' : 'Sign in to Atlus'}</h2>
            <p className="mt-2 text-sm leading-5 text-muted sm:mt-3 sm:leading-6">
              {creating ? 'Your preferences, feedback and daily edition stay with your account.' : 'Continue to today’s edition and your saved reading profile.'}
            </p>

            {searchParams.created ? <p className="notice notice-success mt-5 text-sm">Account created. Check your email to confirm it, then sign in.</p> : null}
            {error ? <p className="notice notice-error mt-5 text-sm">{error}</p> : null}

            {demo && (
              <div className="mt-5 border-t border-line pt-5">
                <p className="text-sm leading-6">Exploring locally? No account or Supabase keys are needed.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link className="btn-primary" href="/today">View today’s edition</Link>
                  <Link className="btn-secondary" href="/onboarding">Try onboarding</Link>
                </div>
              </div>
            )}

            {!demo && <form action={creating ? signUp : signIn} className="mt-4 space-y-3.5 sm:mt-7 sm:space-y-5">
              <div>
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="mb-0" htmlFor="password">Password</label>
                  {!creating && <Link className="text-xs font-semibold text-brand hover:text-[#9f3d18]" href="/forgot-password">Forgot password?</Link>}
                </div>
                <input id="password" name="password" type="password" autoComplete={creating ? 'new-password' : 'current-password'} minLength={creating ? 8 : undefined} required />
                {creating && <p className="mt-2 text-xs text-muted">Use at least 8 characters.</p>}
              </div>
              <button className="btn-primary w-full" type="submit">{creating ? 'Create account' : 'Sign in'}</button>
            </form>}
          </div>
        </section>
      </main>
    </>
  );
}

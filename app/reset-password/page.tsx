import { Nav } from '@/components/Nav';
import { requireUser } from '@/lib/auth';
import { updatePassword } from '@/app/login/actions';

const errors: Record<string, string> = {
  password: 'Use a password with at least 8 characters.',
  match: 'The two passwords do not match.',
  update: 'We could not update your password. Request a fresh reset link and try again.'
};

export default async function ResetPasswordPage({ searchParams }: { searchParams: { error?: string } }) {
  await requireUser();
  return (
    <>
      <Nav />
      <main className="page-shell max-w-lg py-14 md:py-20">
        <div className="card focus-card p-6 sm:p-8">
          <p className="eyebrow mb-3">Account recovery</p>
          <h1 className="text-3xl font-bold">Choose a new password</h1>
          <form action={updatePassword} className="mt-7 space-y-5">
            <div><label htmlFor="password">New password</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /></div>
            <div><label htmlFor="password_confirmation">Confirm new password</label><input id="password_confirmation" name="password_confirmation" type="password" autoComplete="new-password" minLength={8} required /></div>
            {searchParams.error ? <p className="text-sm text-muted">{errors[searchParams.error] || 'Something went wrong. Please try again.'}</p> : null}
            <button className="btn-primary w-full" type="submit">Update password</button>
          </form>
        </div>
      </main>
    </>
  );
}

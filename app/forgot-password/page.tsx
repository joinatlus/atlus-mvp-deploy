import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { requestPasswordReset } from '@/app/login/actions';

export default function ForgotPasswordPage({ searchParams }: { searchParams: { sent?: string; error?: string } }) {
  return (
    <>
      <Nav />
      <main className="page-shell max-w-lg py-14 md:py-20">
        <div className="card focus-card p-6 sm:p-8">
          <p className="eyebrow mb-3">Account recovery</p>
          <h1 className="text-3xl font-bold">Reset your password</h1>
          <p className="mt-3 leading-6 text-muted">Enter your email and we’ll send a password-reset link if there is an Atlus account for it.</p>
          {searchParams.sent ? (
            <div className="mt-6">
              <p className="border-l-2 border-brand bg-brand/5 px-4 py-3 text-sm text-brand">Check your email for a password-reset link.</p>
              <Link className="btn-secondary mt-5" href="/login">Back to sign in</Link>
            </div>
          ) : (
            <form action={requestPasswordReset} className="mt-7 space-y-5">
              <div><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required /></div>
              {searchParams.error ? <p className="text-sm text-muted">Enter your email address.</p> : null}
              <button className="btn-primary w-full" type="submit">Send reset link</button>
            </form>
          )}
        </div>
      </main>
    </>
  );
}

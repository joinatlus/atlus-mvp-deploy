'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from '@/app/login/actions';

const links = [
  ['/today', 'Today'],
  ['/archive', 'Archive'],
  ['/profile', 'Your profile'],
  ['/settings', 'Settings']
] as const;

export function NavLinks({ signedIn, demo = false }: { signedIn: boolean; demo?: boolean }) {
  const pathname = usePathname();

  if (!signedIn) {
    return (
      <nav className="flex items-center gap-1" aria-label="Account navigation">
        <Link className={`btn-ghost ${pathname === '/login' && !pathname.includes('signup') ? 'text-ink' : ''}`} href="/login">Sign in</Link>
        <Link className="btn-primary min-h-9 whitespace-nowrap px-3.5 py-1.5" href="/login?mode=signup">Create account</Link>
      </nav>
    );
  }

  return (
    <nav className="flex min-w-0 items-center gap-0.5 overflow-x-auto py-2" aria-label="Main navigation">
      {links.map(([href, label]) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return <Link key={href} className={`btn-ghost whitespace-nowrap ${active ? 'bg-wash text-ink' : ''}`} href={href}>{label}</Link>;
      })}
      <span className="mx-1.5 hidden h-5 w-px shrink-0 bg-line sm:block" aria-hidden="true" />
      {demo
        ? <Link className="btn-ghost whitespace-nowrap" href="/onboarding">Try onboarding</Link>
        : <form action={signOut}><button className="btn-ghost whitespace-nowrap" type="submit">Sign out</button></form>}
    </nav>
  );
}

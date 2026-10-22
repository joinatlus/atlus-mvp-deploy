import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { BrandWordmark } from '@/components/BrandWordmark';
import { NavLinks } from '@/components/NavLinks';
import { isDemoMode } from '@/lib/demo';

export async function Nav() {
  const demo = isDemoMode();
  let signedIn = demo;
  if (!demo) {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    signedIn = Boolean(user);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[64px] max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href={signedIn ? '/today' : '/login'} className="group flex min-h-10 items-center text-[#0f2236]" aria-label="Atlus home">
          <BrandWordmark className="text-[26px] transition-opacity duration-150 group-hover:opacity-80" />
        </Link>
        {demo && <span className="hidden text-xs text-muted sm:inline">Local demo</span>}
        <NavLinks signedIn={signedIn} demo={demo} />
      </div>
    </header>
  );
}

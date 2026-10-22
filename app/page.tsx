import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isDemoMode } from '@/lib/demo';

export default async function HomePage() {
  if (isDemoMode()) {
    redirect('/today');
  }

  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? '/today' : '/login');
}

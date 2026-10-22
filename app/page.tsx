import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isDemoMode } from '@/lib/demo';

export default async function HomePage() {
  const marketingUrl = process.env.ATLUS_MARKETING_URL?.trim() ||
    (process.env.NODE_ENV === 'production' ? 'https://joinatlus.com' : 'http://localhost:8080');
  // The public domain currently serves this app. Avoid redirecting it to itself
  // until the marketing site and app are hosted on separate domains.
  if (new URL(marketingUrl).host !== headers().get('host')) redirect(marketingUrl);

  if (isDemoMode()) redirect('/today');
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  redirect(user ? '/today' : '/login');
}

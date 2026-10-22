import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ensureProfile } from '@/lib/auth';

function safeNext(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : null;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const supabase = createServerSupabaseClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL('/login?error=session', request.url));
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login?error=session', request.url));

  await ensureProfile(user.id, user.email);
  const next = safeNext(requestUrl.searchParams.get('next'));
  if (next) return NextResponse.redirect(new URL(next, request.url));

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('onboarding_status')
    .eq('user_id', user.id)
    .maybeSingle();

  return NextResponse.redirect(new URL(profile?.onboarding_status === 'complete' ? '/today' : '/onboarding', request.url));
}

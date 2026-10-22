'use server';

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ensureProfile } from '@/lib/auth';
import { getAppUrl } from '@/lib/env';
import { isDemoMode } from '@/lib/demo';

function cleanEmail(formData: FormData) {
  return String(formData.get('email') || '').trim().toLowerCase();
}

function cleanPassword(formData: FormData) {
  return String(formData.get('password') || '');
}

async function destinationForUser(userId: string) {
  const supabase = createServerSupabaseClient();
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('onboarding_status')
    .eq('user_id', userId)
    .maybeSingle();
  return profile?.onboarding_status === 'complete' ? '/today' : '/onboarding';
}

export async function signIn(formData: FormData) {
  const email = cleanEmail(formData);
  const password = cleanPassword(formData);
  if (!email || !password) redirect('/login?error=missing');
  if (isDemoMode()) redirect('/today');

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) redirect('/login?error=invalid');

  await ensureProfile(data.user.id, data.user.email);
  redirect(await destinationForUser(data.user.id));
}

export async function signUp(formData: FormData) {
  const email = cleanEmail(formData);
  const password = cleanPassword(formData);
  if (!email || !password) redirect('/login?mode=signup&error=missing');
  if (password.length < 8) redirect('/login?mode=signup&error=password');
  if (isDemoMode()) redirect('/onboarding');

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${getAppUrl()}/auth/callback` }
  });
  if (error) redirect('/login?mode=signup&error=signup');

  if (data.user && data.session) {
    await ensureProfile(data.user.id, data.user.email);
    redirect('/onboarding');
  }

  redirect('/login?created=1');
}

export async function requestPasswordReset(formData: FormData) {
  const email = cleanEmail(formData);
  if (!email) redirect('/forgot-password?error=missing');
  if (isDemoMode()) redirect('/forgot-password?sent=1');

  const supabase = createServerSupabaseClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getAppUrl()}/auth/callback?next=/reset-password`
  });

  redirect('/forgot-password?sent=1');
}

export async function updatePassword(formData: FormData) {
  const password = cleanPassword(formData);
  const confirmation = String(formData.get('password_confirmation') || '');
  if (password.length < 8) redirect('/reset-password?error=password');
  if (password !== confirmation) redirect('/reset-password?error=match');
  if (isDemoMode()) redirect('/today');

  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?error=session');

  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect('/reset-password?error=update');

  redirect('/today');
}

export async function signOut() {
  if (isDemoMode()) redirect('/login');
  const supabase = createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/');
}

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DEMO_USER, isDemoMode } from '@/lib/demo';

export async function requireUser() {
  if (isDemoMode()) return DEMO_USER;

  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return user;
}

export function isAdminEmail(email?: string | null) {
  const configured = String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (!configured.length) return process.env.NODE_ENV !== 'production';
  return Boolean(email && configured.includes(email.toLowerCase()));
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!isAdminEmail(user.email)) redirect('/today');
  return user;
}

export async function ensureProfile(userId: string, email?: string | null) {
  if (isDemoMode()) return;

  const supabase = createServerSupabaseClient();
  await supabase.from('profiles').upsert({ id: userId, email: email ?? null }, { onConflict: 'id' });
  await supabase.from('user_profiles').upsert({ user_id: userId }, { onConflict: 'user_id' });
}

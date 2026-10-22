'use server';

import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isDemoMode } from '@/lib/demo';

export async function saveSettings(formData: FormData) {
  if (isDemoMode()) redirect('/settings?demo=saved');

  const user = await requireUser();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('user_profiles').upsert({
    user_id: user.id,
    reading_mode: String(formData.get('reading_mode') || 'standard'),
    delivery_time: String(formData.get('delivery_time') || '08:00'),
    timezone: String(formData.get('timezone') || 'Europe/London'),
    novelty_tolerance: String(formData.get('novelty_tolerance') || 'medium'),
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' });
  if (error) throw error;
  redirect('/settings');
}

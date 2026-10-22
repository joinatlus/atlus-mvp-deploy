'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { refreshUserRepresentations } from '@/lib/user-representations';
import { isDemoMode } from '@/lib/demo';

export async function deleteAssumption(formData: FormData) {
  if (isDemoMode()) {
    revalidatePath('/profile');
    return;
  }
  const user = await requireUser();
  const id = String(formData.get('id') || '');
  const supabase = createServerSupabaseClient();
  const { data: assumption, error: readError } = await supabase.from('user_assumptions').select('*').eq('id', id).eq('user_id', user.id).single();
  if (readError) throw readError;
  const { error } = await supabase.from('user_assumptions').update({ active: false, retired_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id);
  if (error) throw error;
  await upsertOverride(supabase, user.id, assumption, 0);
  revalidatePath('/profile');
}

export async function confirmAssumption(formData: FormData) {
  if (isDemoMode()) {
    revalidatePath('/profile');
    return;
  }
  const user = await requireUser();
  const id = String(formData.get('id') || '');
  const supabase = createServerSupabaseClient();
  const { data: assumption, error } = await supabase.from('user_assumptions').select('*').eq('id', id).eq('user_id', user.id).single();
  if (error) throw error;
  await upsertOverride(supabase, user.id, assumption, Math.max(0.7, Number(assumption.weight ?? 1)));
  revalidatePath('/profile');
}

async function upsertOverride(supabase: any, userId: string, assumption: any, weight: number) {
  const { data: existing } = await supabase
    .from('user_assumptions')
    .select('*')
    .eq('user_id', userId)
    .eq('assumption_type', assumption.assumption_type)
    .eq('source', 'user_edit')
    .eq('label', assumption.label)
    .eq('override_active', true)
    .eq('active', true)
    .limit(1)
    .maybeSingle();

  const row = {
    user_id: userId,
    assumption_type: assumption.assumption_type,
    label: assumption.label,
    structured_value: { ...(assumption.structured_value || {}), weight, explicit_override: true },
    confidence: 1,
    source: 'user_edit',
    user_confirmed: true,
    active: true,
    weight,
    topic_qcode: assumption.topic_qcode || null,
    atlus_tag: assumption.atlus_tag || null,
    override_active: true,
    updated_at: new Date().toISOString()
  };

  if (existing?.id) {
    const { error } = await supabase.from('user_assumptions').update(row).eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('user_assumptions').insert(row);
    if (error) throw error;
  }

  try {
    await refreshUserRepresentations(supabase, userId);
  } catch (error) {
    console.error('Could not refresh user representations after profile edit:', error);
  }
}

export async function tuneAssumption(formData: FormData) {
  if (isDemoMode()) {
    revalidatePath('/profile');
    return;
  }
  const user = await requireUser();
  const id = String(formData.get('id') || '');
  const direction = String(formData.get('direction') || 'confirm');
  const supabase = createServerSupabaseClient();
  const { data: assumption, error } = await supabase.from('user_assumptions').select('*').eq('id', id).eq('user_id', user.id).single();
  if (error) throw error;
  const weight = direction === 'more' ? 1 : direction === 'less' ? -0.45 : direction === 'suppress' ? 0 : Math.max(0.7, Number(assumption.weight ?? 1));
  await upsertOverride(supabase, user.id, assumption, weight);
  revalidatePath('/profile');
}

export async function addPreference(formData: FormData) {
  if (isDemoMode()) {
    revalidatePath('/profile');
    return;
  }
  const user = await requireUser();
  const label = String(formData.get('label') || '').trim();
  if (!label) return;
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('user_assumptions').insert({
    user_id: user.id,
    assumption_type: 'preference',
    label,
    structured_value: { original_text: label, weight: 1, explicit_override: true },
    confidence: 1,
    source: 'user_edit',
    user_confirmed: true,
    active: true,
    weight: 1,
    override_active: true
  });
  if (error) throw error;
  try {
    await refreshUserRepresentations(supabase, user.id);
  } catch (representationError) {
    console.error('Could not refresh user representations after adding preference:', representationError);
  }
  revalidatePath('/profile');
}

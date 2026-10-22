'use server';

import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { generateRecommendationsForUser } from '@/lib/recommendation-service';

export async function generateForMe() {
  const user = await requireAdmin();
  const supabase = createAdminSupabaseClient();
  await generateRecommendationsForUser(supabase, user.id);
  redirect('/today');
}

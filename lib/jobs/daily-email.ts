import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { sendDailyEmail } from '@/lib/email';
import { generateRecommendationsForUser } from '@/lib/recommendation-service';

function localClock(timeZone: string, date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

function dueWithinRetryWindow(deliveryTime: string, currentMinutes: number) {
  const [hours, minutes] = deliveryTime.split(':').map(Number);
  const target = (Number.isFinite(hours) ? hours : 8) * 60 + (Number.isFinite(minutes) ? minutes : 0);
  return currentMinutes >= target && currentMinutes < target + 180;
}

export async function runDailyEmailJob() {
  const supabase = createAdminSupabaseClient();
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id,email,user_profiles!inner(onboarding_status,delivery_time,timezone)')
    .eq('user_profiles.onboarding_status', 'complete')
    .eq('account_status', 'active');
  if (error) throw error;

  const results: Array<Record<string, unknown>> = [];
  for (const profile of profiles || []) {
    const settingsRaw: any = (profile as any).user_profiles;
    const settings = Array.isArray(settingsRaw) ? settingsRaw[0] : settingsRaw;
    const timeZone = settings?.timezone || 'Europe/London';
    const clock = localClock(timeZone);
    if (!dueWithinRetryWindow(String(settings?.delivery_time || '08:00'), clock.minutes)) {
      results.push({ user_id: profile.id, skipped: 'not_due' });
      continue;
    }

    const { data: existing } = await supabase
      .from('email_deliveries')
      .select('*')
      .eq('user_id', profile.id)
      .eq('local_delivery_date', clock.date)
      .maybeSingle();

    if (existing?.status === 'sent') {
      results.push({ user_id: profile.id, skipped: 'already_sent' });
      continue;
    }

    try {
      let runId = existing?.recommendation_run_id as string | null;
      if (!runId) {
        const generated = await generateRecommendationsForUser(supabase, profile.id);
        runId = generated.id;
      }

      await supabase.from('email_deliveries').upsert({
        user_id: profile.id,
        recommendation_run_id: runId,
        local_delivery_date: clock.date,
        status: 'pending',
        error_message: null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,local_delivery_date' });

      const { data: items } = await supabase
        .from('recommendation_items_view')
        .select('*')
        .eq('recommendation_run_id', runId)
        .order('rank_position');

      if (!items?.length || !profile.email) {
        await supabase.from('email_deliveries').update({
          status: 'skipped',
          error_message: !profile.email ? 'No email address' : 'No recommendations',
          updated_at: new Date().toISOString()
        }).eq('user_id', profile.id).eq('local_delivery_date', clock.date);
        results.push({ user_id: profile.id, sent: false, reason: !profile.email ? 'no_email' : 'no_items' });
        continue;
      }

      const sent: any = await sendDailyEmail(profile.email, items as any);
      if (sent?.error) throw new Error(sent.error.message || 'Email provider returned an error');

      await supabase.from('email_deliveries').update({
        status: 'sent',
        provider_message_id: sent?.data?.id || null,
        updated_at: new Date().toISOString()
      }).eq('user_id', profile.id).eq('local_delivery_date', clock.date);
      results.push({ user_id: profile.id, sent: true, run_id: runId });
    } catch (error: any) {
      await supabase.from('email_deliveries').upsert({
        user_id: profile.id,
        local_delivery_date: clock.date,
        status: 'failed',
        error_message: error?.message || String(error),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,local_delivery_date' });
      results.push({ user_id: profile.id, error: error?.message || String(error) });
    }
  }

  return { ok: true, results };
}

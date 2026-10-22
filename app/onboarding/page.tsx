import { Nav } from '@/components/Nav';
import { requireUser, ensureProfile } from '@/lib/auth';
import { OnboardingForm } from './OnboardingForm';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DEMO_PROFILE, isDemoMode } from '@/lib/demo';

export default async function OnboardingPage() {
  const user = await requireUser();
  await ensureProfile(user.id, user.email);
  let profile: Pick<typeof DEMO_PROFILE, 'delivery_time' | 'timezone' | 'onboarding_status'> | null = DEMO_PROFILE;
  if (!isDemoMode()) {
    const supabase = createServerSupabaseClient();
    const result = await supabase
      .from('user_profiles')
      .select('delivery_time,timezone,onboarding_status')
      .eq('user_id', user.id)
      .maybeSingle();
    profile = result.data;
  }

  return (
    <>
      <Nav />
      <main className="page-shell onboarding-shell">
        <div className="mb-7 max-w-2xl">
          <p className="eyebrow">Set up your reading</p>
          <h1 className="mt-2 text-4xl font-bold leading-tight">Make Atlus useful from day one</h1>
          <p className="mt-3 leading-7 text-muted">Tell us what you care about, what you already know and what you want to learn. Nothing here is permanent; you can change it later.</p>
        </div>
        <OnboardingForm
          initialDeliveryTime={String(profile?.delivery_time || '08:00')}
          initialTimezone={profile?.timezone || 'Europe/London'}
          detectTimezone={profile?.onboarding_status !== 'complete'}
        />
      </main>
    </>
  );
}

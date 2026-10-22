'use server';

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { IPTC_TOPICS, iptcQcodeForAtlusSubtopic, subtopicBySlug } from '@/lib/iptc';
import { refreshUserRepresentations } from '@/lib/user-representations';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { generateRecommendationsForUser } from '@/lib/recommendation-service';
import { isDemoMode } from '@/lib/demo';

function unique(values: FormDataEntryValue[]) {
  return Array.from(new Set(values.map(String).map((s) => s.trim()).filter(Boolean)));
}

function qcodeLabel(qcode: string) {
  return IPTC_TOPICS.find((topic) => topic.qcode === qcode)?.uiLabel || qcode;
}

type GoalDetail = {
  text: string;
  knowledge: number;
  mode: 'foundations' | 'deepen' | 'keep_up';
  focus: boolean;
};

function parseGoalDetails(formData: FormData): GoalDetail[] {
  const raw = String(formData.get('goal_details') || '').trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const seen = new Set<string>();
        return parsed
          .map((item: any) => {
            const text = String(item?.text || '').trim();
            const knowledgeRaw = Number(item?.knowledge);
            const modeRaw = String(item?.mode || 'deepen');
            const mode: GoalDetail['mode'] = modeRaw === 'foundations' || modeRaw === 'keep_up' ? modeRaw : 'deepen';
            return {
              text,
              knowledge: Number.isFinite(knowledgeRaw) ? Math.max(0, Math.min(3, knowledgeRaw)) : 1,
              mode,
              focus: Boolean(item?.focus)
            };
          })
          .filter((item: GoalDetail) => item.text && !seen.has(item.text) && seen.add(item.text))
          .slice(0, 3);
      }
    } catch {}
  }

  const suggestedGoals = unique(formData.getAll('goals'));
  const customGoals = String(formData.get('custom_goals') || '')
    .split(/[\n;]+/)
    .map((goal) => goal.trim())
    .filter(Boolean);
  return Array.from(new Set([...suggestedGoals, ...customGoals]))
    .slice(0, 3)
    .map((text) => ({ text, knowledge: 1, mode: 'deepen' as const, focus: false }));
}

export async function saveOnboarding(formData: FormData) {
  if (isDemoMode()) redirect('/today?demo=onboarding-complete');

  const user = await requireUser();
  const supabase = createServerSupabaseClient();

  const broadTopics = unique(formData.getAll('broad_topics'));
  const subtopicSlugs = unique(formData.getAll('subtopics'));
  const goalDetails = parseGoalDetails(formData);
  const sources = unique(formData.getAll('source_exposure'));
  const sourceExclusions = unique(formData.getAll('source_exclusions')).slice(0, 100);
  const exclusions = unique(formData.getAll('topic_exclusions'));
  const readingMode = String(formData.get('reading_mode') || 'standard');
  const discoveryLevel = String(formData.get('discovery_level') || 'balanced');
  const noveltyTolerance = discoveryLevel === 'gentle' ? 'low' : discoveryLevel === 'adventurous' ? 'high' : 'medium';
  const deliveryTimeRaw = String(formData.get('delivery_time') || '08:00');
  const deliveryMatch = deliveryTimeRaw.match(/^(\d{2}):(\d{2})$/);
  const deliveryTime = deliveryMatch && Number(deliveryMatch[1]) < 24 && Number(deliveryMatch[2]) < 60 ? deliveryTimeRaw : '08:00';
  const timezoneRaw = String(formData.get('timezone') || 'Europe/London').trim() || 'Europe/London';
  let timezone = 'Europe/London';
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: timezoneRaw }).format();
    timezone = timezoneRaw;
  } catch {}

  if (broadTopics.length < 3) throw new Error('Please choose at least three broad interests.');
  if (!goalDetails.length) throw new Error('Please choose at least one learning goal.');

  const perspectivePreferences: Record<string, string> = {};
  const geographyPreferences: Record<string, string> = {};
  const knowledgeEntries: Array<{ key: string; level: number }> = [];

  for (const [key, rawValue] of formData.entries()) {
    const value = String(rawValue);
    if (key.startsWith('perspective:')) perspectivePreferences[key.slice('perspective:'.length)] = value;
    if (key.startsWith('geography:')) geographyPreferences[key.slice('geography:'.length)] = value;
    if (key.startsWith('knowledge:')) {
      const level = Number(value);
      if (Number.isFinite(level)) knowledgeEntries.push({ key: key.slice('knowledge:'.length), level: Math.max(0, Math.min(3, level)) });
    }
  }

  const { error: profileError } = await supabase.from('user_profiles').upsert({
    user_id: user.id,
    reading_mode: readingMode,
    delivery_time: deliveryTime,
    timezone,
    novelty_tolerance: noveltyTolerance,
    perspective_preferences: perspectivePreferences,
    geography_preferences: geographyPreferences,
    source_exposure: sources,
    source_exclusions: sourceExclusions,
    topic_exclusions: exclusions,
    onboarding_version: 'v3-learning-goals',
    onboarding_status: 'complete',
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' });
  if (profileError) throw profileError;

  const { error: retireError } = await supabase
    .from('user_assumptions')
    .update({ active: false, retired_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('source', 'onboarding')
    .eq('active', true);
  if (retireError) throw retireError;

  const rows: any[] = [];

  for (const qcode of broadTopics) {
    rows.push({
      user_id: user.id,
      assumption_type: 'preference',
      label: qcodeLabel(qcode),
      topic_qcode: qcode,
      weight: 0.65,
      structured_value: { iptc_qcode: qcode, level: 'broad', weight: 0.65 },
      source: 'onboarding',
      user_confirmed: true,
      active: true
    });
  }

  for (const slug of subtopicSlugs) {
    const topic = subtopicBySlug(slug);
    if (!topic) continue;
    const officialQcode = iptcQcodeForAtlusSubtopic(topic);
    rows.push({
      user_id: user.id,
      assumption_type: 'preference',
      label: topic.label,
      topic_qcode: officialQcode || topic.parentQcode,
      atlus_tag: topic.label,
      weight: 1,
      structured_value: {
        iptc_qcode: officialQcode || null,
        iptc_parent_qcode: topic.parentQcode,
        atlus_tag: topic.label,
        slug: topic.slug,
        weight: 1
      },
      source: 'onboarding',
      user_confirmed: true,
      active: true
    });
  }

  const hasFocusGoal = goalDetails.some((goal) => goal.focus);
  for (const goal of goalDetails) {
    const weight = hasFocusGoal ? (goal.focus ? 1 : 0.82) : 1;
    rows.push({
      user_id: user.id,
      assumption_type: 'goal',
      label: goal.text,
      weight,
      structured_value: {
        original_text: goal.text,
        weight,
        knowledge_level: goal.knowledge,
        learning_mode: goal.mode,
        priority: goal.focus ? 'focus' : 'normal'
      },
      source: 'onboarding',
      user_confirmed: true,
      active: true
    });
  }

  for (const entry of knowledgeEntries) {
    if (entry.key.startsWith('subtopic-')) {
      const topic = subtopicBySlug(entry.key.slice('subtopic-'.length));
      if (!topic) continue;
      rows.push({
        user_id: user.id,
        assumption_type: 'knowledge',
        label: topic.label,
        topic_qcode: iptcQcodeForAtlusSubtopic(topic) || topic.parentQcode,
        atlus_tag: topic.label,
        weight: 1,
        structured_value: { level: entry.level, atlus_tag: topic.label },
        source: 'onboarding',
        user_confirmed: true,
        active: true
      });
    } else if (entry.key.startsWith('qcode-')) {
      const qcode = entry.key.slice('qcode-'.length);
      rows.push({
        user_id: user.id,
        assumption_type: 'knowledge',
        label: qcodeLabel(qcode),
        topic_qcode: qcode,
        weight: 1,
        structured_value: { level: entry.level, iptc_qcode: qcode },
        source: 'onboarding',
        user_confirmed: true,
        active: true
      });
    }
  }

  if (rows.length) {
    const { error: assumptionError } = await supabase.from('user_assumptions').insert(rows);
    if (assumptionError) throw assumptionError;
  }

  try {
    await refreshUserRepresentations(supabase, user.id);
  } catch (error) {
    console.error('Could not build onboarding representations:', error);
  }

  try {
    const admin = createAdminSupabaseClient();
    await generateRecommendationsForUser(admin, user.id);
  } catch (error) {
    console.error('Could not generate first edition after onboarding:', error);
  }

  redirect('/today');
}

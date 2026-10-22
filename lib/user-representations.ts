import OpenAI from 'openai';
import { IPTC_MEDIA_TOPICS, iptcCandidateTopicsForText } from '@/lib/iptc';
import { effectiveSignals } from '@/lib/recommender';
import type { UserAssumption } from '@/lib/types';

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
const EMBEDDING_VERSION = 'v1';
const GOAL_REPRESENTATION_VERSION = 'goal_concepts_v2_full_iptc';

function cleanStrings(value: unknown, limit: number) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(String).map((item) => item.trim()).filter(Boolean))).slice(0, limit);
}

function labelsForAggregateEmbedding(
  assumptions: UserAssumption[],
  type: UserAssumption['assumption_type'],
  positive = true
) {
  return effectiveSignals(assumptions, type)
    .filter((signal) => positive ? signal.weight > 0.05 : signal.weight < -0.05)
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
    .map((signal) => `${signal.label} (${Math.abs(signal.weight).toFixed(2)})`);
}

export function aggregateRepresentationTexts(assumptions: UserAssumption[]) {
  return {
    preferences: labelsForAggregateEmbedding(assumptions, 'preference').join('\n'),
    goals: labelsForAggregateEmbedding(assumptions, 'goal').join('\n'),
    avoidances: [
      ...labelsForAggregateEmbedding(assumptions, 'avoidance'),
      ...labelsForAggregateEmbedding(assumptions, 'preference', false)
    ].join('\n')
  } as const;
}

async function fetchActiveAssumptions(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('user_assumptions')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true);
  if (error) throw error;
  return (data || []) as UserAssumption[];
}

async function expandGoals(openai: any, goals: UserAssumption[]) {
  if (!goals.length) return new Map<string, { concepts: string[]; iptc_qcodes: string[] }>();

  const candidateMap = new Map<string, (typeof IPTC_MEDIA_TOPICS)[number]>();
  for (const goal of goals) {
    for (const topic of iptcCandidateTopicsForText(goal.label, [], 120)) {
      candidateMap.set(topic.qcode, topic);
    }
  }
  const candidates = Array.from(candidateMap.values()).slice(0, 320);
  const allowedQcodes = new Set(candidates.map((topic) => topic.qcode));
  const topicList = candidates
    .map((topic) => `${topic.qcode} | depth=${topic.depth} | parent=${topic.parentQcode || '-'} | ${topic.label}`)
    .join('\n');
  const prompt = `Turn each Atlus learning goal into a compact semantic representation for recommendation matching.

Allowed IPTC Media Topic QCodes from the FULL hierarchy (candidate subset):\n${topicList}

Return JSON only:
{
  "goals": [
    {
      "id": "supplied assumption id",
      "concepts": ["3 to 8 concise concepts"],
      "iptc_qcodes": ["up to 3 allowed QCodes"]
    }
  ]
}

Rules:
- Resolve ambiguous words from the meaning of the WHOLE goal.
- Concepts must distinguish senses such as AI intelligence vs intelligence agencies, computer security vs national security, financial markets vs street markets, and biological viruses vs computer viruses.
- Concepts should describe what the user genuinely wants to understand, not merely repeat individual words.
- Do not broaden the goal with unrelated concepts.
- Use only QCodes from the supplied list.
- Prefer the most specific accurate IPTC topic rather than a broad ancestor when the goal clearly supports it.

Goals:\n${goals.map((goal) => `${goal.id}: ${goal.label}`).join('\n')}`;

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_CLASSIFICATION_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Return valid JSON only.' },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 1
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) return new Map();
  const parsed = JSON.parse(raw);
  const result = new Map<string, { concepts: string[]; iptc_qcodes: string[] }>();

  for (const item of Array.isArray(parsed.goals) ? parsed.goals : []) {
    const id = String(item.id || '');
    if (!goals.some((goal) => goal.id === id)) continue;
    result.set(id, {
      concepts: cleanStrings(item.concepts, 8),
      iptc_qcodes: cleanStrings(item.iptc_qcodes, 3).filter((qcode) => allowedQcodes.has(qcode))
    });
  }
  return result;
}

export async function ensureGoalRepresentations(supabase: any, goals: UserAssumption[]) {
  const relevant = goals.filter((goal) => goal.active && goal.assumption_type === 'goal');
  if (!relevant.length || !process.env.OPENAI_API_KEY) return;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const needingExpansion = relevant.filter((goal) => {
    const value = goal.structured_value || {};
    return value.goal_representation_version !== GOAL_REPRESENTATION_VERSION || !cleanStrings(value.concepts, 8).length;
  });

  let expanded = new Map<string, { concepts: string[]; iptc_qcodes: string[] }>();
  if (needingExpansion.length) {
    try {
      expanded = await expandGoals(openai, needingExpansion);
    } catch (error) {
      console.error('Goal concept extraction failed; retaining existing/fallback representation:', error);
    }
  }

  const refreshedGoals: UserAssumption[] = [];
  for (const goal of relevant) {
    const generated = expanded.get(goal.id);
    if (!generated) {
      refreshedGoals.push(goal);
      continue;
    }

    const concepts = generated.concepts.length ? generated.concepts : [goal.label];
    const iptcQcodes = generated.iptc_qcodes;
    const structuredValue = {
      ...(goal.structured_value || {}),
      concepts,
      iptc_qcodes: iptcQcodes,
      goal_representation_version: GOAL_REPRESENTATION_VERSION
    };

    const { data: updated, error } = await supabase
      .from('user_assumptions')
      .update({
        structured_value: structuredValue,
        topic_qcode: iptcQcodes[0] || goal.topic_qcode || null,
        atlus_tag: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', goal.id)
      .select('*')
      .single();
    if (error) throw error;
    refreshedGoals.push(updated as UserAssumption);
  }

  const byId = new Map(refreshedGoals.map((goal) => [goal.id, goal]));
  for (const goal of relevant) if (!byId.has(goal.id)) byId.set(goal.id, goal);
  const finalGoals = Array.from(byId.values());

  const { data: existingRows, error: existingError } = await supabase
    .from('user_assumption_embeddings')
    .select('assumption_id,embedding_kind,source_text')
    .in('assumption_id', finalGoals.map((goal) => goal.id))
    .eq('embedding_version', EMBEDDING_VERSION);
  if (existingError) throw existingError;

  const existing = new Map<string, string>();
  for (const row of existingRows || []) existing.set(`${row.assumption_id}:${row.embedding_kind}`, String(row.source_text || ''));

  const targets: Array<{ assumptionId: string; kind: 'semantic' | 'concepts'; text: string }> = [];
  for (const goal of finalGoals) {
    const semanticText = goal.label.trim();
    const concepts = cleanStrings(goal.structured_value?.concepts, 8);
    const conceptText = (concepts.length ? concepts : [goal.label]).join('\n');
    if (existing.get(`${goal.id}:semantic`) !== semanticText) targets.push({ assumptionId: goal.id, kind: 'semantic', text: semanticText });
    if (existing.get(`${goal.id}:concepts`) !== conceptText) targets.push({ assumptionId: goal.id, kind: 'concepts', text: conceptText });
  }

  if (!targets.length) return;
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: targets.map((target) => target.text)
  });

  const rows = targets.map((target, index) => ({
    assumption_id: target.assumptionId,
    embedding_kind: target.kind,
    embedding: response.data[index].embedding,
    source_text: target.text,
    embedding_model: EMBEDDING_MODEL,
    embedding_version: EMBEDDING_VERSION,
    updated_at: new Date().toISOString()
  }));

  const { error } = await supabase
    .from('user_assumption_embeddings')
    .upsert(rows, { onConflict: 'assumption_id,embedding_kind,embedding_version' });
  if (error) throw error;
}

export async function refreshUserRecommendationEmbeddings(
  supabase: any,
  userId: string,
  assumptions?: UserAssumption[]
) {
  if (!process.env.OPENAI_API_KEY) return;
  const active = assumptions || await fetchActiveAssumptions(supabase, userId);
  const texts = aggregateRepresentationTexts(active);
  const kinds = ['preferences', 'goals', 'avoidances'] as const;
  const populated = kinds.map((kind) => ({ kind, text: texts[kind].trim() })).filter((item) => item.text.length > 0);
  const emptyKinds = kinds.filter((kind) => !texts[kind].trim());

  for (const kind of emptyKinds) {
    const { error } = await supabase
      .from('user_recommendation_embeddings')
      .delete()
      .eq('user_id', userId)
      .eq('embedding_kind', kind)
      .eq('embedding_version', EMBEDDING_VERSION);
    if (error) throw error;
  }
  if (!populated.length) return;

  const { data: existingRows, error: existingError } = await supabase
    .from('user_recommendation_embeddings')
    .select('embedding_kind,source_text')
    .eq('user_id', userId)
    .eq('embedding_version', EMBEDDING_VERSION);
  if (existingError) throw existingError;
  const existing = new Map((existingRows || []).map((row: any) => [String(row.embedding_kind), String(row.source_text || '')]));
  const changed = populated.filter((item) => existing.get(item.kind) !== item.text);
  if (!changed.length) return;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: changed.map((item) => item.text)
  });

  const rows = changed.map((item, index) => ({
    user_id: userId,
    embedding_kind: item.kind,
    embedding: response.data[index].embedding,
    source_text: item.text,
    embedding_model: EMBEDDING_MODEL,
    embedding_version: EMBEDDING_VERSION,
    updated_at: new Date().toISOString()
  }));
  const { error } = await supabase
    .from('user_recommendation_embeddings')
    .upsert(rows, { onConflict: 'user_id,embedding_kind,embedding_version' });
  if (error) throw error;
}

export async function refreshUserRepresentations(supabase: any, userId: string) {
  let assumptions = await fetchActiveAssumptions(supabase, userId);
  await ensureGoalRepresentations(supabase, assumptions.filter((assumption) => assumption.assumption_type === 'goal'));
  assumptions = await fetchActiveAssumptions(supabase, userId);
  await refreshUserRecommendationEmbeddings(supabase, userId, assumptions);
}

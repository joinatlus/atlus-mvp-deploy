import type { ArticleForRanking, ReadingMode, SlotType, UserAssumption, RecommendationFeatureSnapshot } from '@/lib/types';
import { geographyPreferenceFit } from '@/lib/geography';
import { iptcHierarchySimilarity, isIptcSameOrDescendant } from '@/lib/iptc';

const SLOT_COUNTS: Record<ReadingMode, SlotType[]> = {
  light: ['core'],
  standard: ['core', 'stretch', 'discovery'],
  deep: ['core', 'core', 'stretch', 'stretch', 'discovery']
};

export type StoredGoalVector = {
  assumptionId: string;
  semanticEmbedding?: number[] | null;
  conceptEmbedding?: number[] | null;
};

export type ArticleFeedbackSignal = {
  articleId: string;
  kind: 'more_like_this' | 'less_like_this' | 'too_similar';
  embedding?: number[] | null;
  conceptEmbedding?: number[] | null;
  weight: number;
};

export type UserRecommendationVectors = {
  preferenceEmbedding?: number[] | null;
  goalEmbedding?: number[] | null;
  avoidanceEmbedding?: number[] | null;
  goalVectors?: StoredGoalVector[];
  articleFeedbackSignals?: ArticleFeedbackSignal[];
};

export type RecommendationContext = {
  noveltyTolerance?: 'low' | 'medium' | 'high' | string;
  geographyPreferences?: Record<string, number | string>;
  sourceExposure?: string[];
  sourceExclusions?: string[];
  topicExclusions?: string[];
  sourceAccessIssueCounts?: Record<string, number>;
};

type Signal = { label: string; weight: number; qcode?: string | null; tag?: string | null; assumption: UserAssumption };

type RankedCandidate = {
  article: ArticleForRanking;
  slot: SlotType;
  rawScore: number;
  finalScore: number;
  eligible: boolean;
  rankBeforeSlate: number;
  selected: boolean;
  exploration: boolean;
  selectionProbability: number | null;
  selectionPolicy: string | null;
  features: RecommendationFeatureSnapshot;
  reasonCodes: string[];
  explanation?: string;
};

function clamp(value: number, min = 0, max = 1) { return Math.max(min, Math.min(max, value)); }
function average(values: number[]) { return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0; }
function max(values: number[]) { return values.length ? Math.max(...values) : 0; }
function normaliseLabel(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }

function words(text: string) {
  return normaliseLabel(text).split(/\s+/).filter((word) => word.length > 2);
}

function textScore(query: string, article: ArticleForRanking) {
  const queryWords = new Set(words(query));
  if (!queryWords.size) return 0;
  const haystack = new Set(words([
    article.title,
    article.subtitle || '',
    article.primary_topic || '',
    ...(article.secondary_topics || []),
    ...(article.atlus_tags || []),
    ...(article.concepts || []),
    ...(article.entities || []),
    article.article_type || ''
  ].join(' ')));
  let hits = 0;
  for (const word of queryWords) if (haystack.has(word)) hits += 1;
  return clamp(hits / Math.max(2, queryWords.size));
}

function parseEmbedding(value: unknown): number[] | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    const numbers = value.map(Number).filter(Number.isFinite);
    return numbers.length ? numbers : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '[]') return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(Number).filter(Number.isFinite);
    } catch {
      const numbers = trimmed.replace(/^\[/, '').replace(/\]$/, '').split(',').map((x) => Number(x.trim())).filter(Number.isFinite);
      return numbers.length ? numbers : null;
    }
  }
  return null;
}

function cosineSimilarity(a?: number[] | null, b?: number[] | null) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0; let aNorm = 0; let bNorm = 0;
  for (let i = 0; i < a.length; i += 1) { dot += a[i] * b[i]; aNorm += a[i] * a[i]; bNorm += b[i] * b[i]; }
  return !aNorm || !bNorm ? 0 : dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm));
}

function calibratedEmbeddingScore(articleEmbedding: unknown, queryEmbedding?: number[] | null) {
  const cosine = cosineSimilarity(parseEmbedding(articleEmbedding), queryEmbedding);
  return clamp((cosine - 0.18) / 0.37);
}

function feedbackSignalFit(
  article: ArticleForRanking,
  signals: ArticleFeedbackSignal[] = [],
  kind: ArticleFeedbackSignal['kind']
) {
  const articleConcept = parseEmbedding(article.concept_embedding);
  let best = 0;
  for (const signal of signals) {
    if (signal.kind !== kind) continue;
    const semantic = calibratedEmbeddingScore(article.embedding, signal.embedding);
    const concepts = calibratedEmbeddingScore(articleConcept, signal.conceptEmbedding);
    const similarity = Math.max(semantic, concepts * 0.96);
    best = Math.max(best, similarity * clamp(signal.weight));
  }
  return clamp(best);
}

function rawWeight(assumption: UserAssumption) {
  const structured = Number(assumption.structured_value?.weight);
  const column = Number(assumption.weight);
  const value = Number.isFinite(structured) ? structured : Number.isFinite(column) ? column : 1;
  return Math.max(-1, Math.min(1, value));
}

function signalKey(assumption: UserAssumption) {
  if (assumption.assumption_type === 'goal') return `goal:${normaliseLabel(assumption.label)}`;
  return assumption.atlus_tag || assumption.topic_qcode || normaliseLabel(assumption.label);
}

export function effectiveSignals(assumptions: UserAssumption[], type: UserAssumption['assumption_type']): Signal[] {
  const groups = new Map<string, UserAssumption[]>();
  for (const assumption of assumptions.filter((a) => a.active && a.assumption_type === type)) {
    const key = signalKey(assumption);
    groups.set(key, [...(groups.get(key) || []), assumption]);
  }

  const signals: Signal[] = [];
  for (const group of groups.values()) {
    const edits = group.filter((a) => a.source === 'user_edit' && a.override_active);
    const newestEdit = edits.sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')))[0];
    if (newestEdit) {
      signals.push({ label: newestEdit.label, weight: rawWeight(newestEdit), qcode: newestEdit.topic_qcode, tag: newestEdit.atlus_tag, assumption: newestEdit });
      continue;
    }

    const explicit = group.filter((a) => ['onboarding', 'user_edit', 'admin'].includes(a.source));
    const learned = group.filter((a) => ['feedback', 'model_update'].includes(a.source));
    const explicitWeight = explicit.length ? max(explicit.map((a) => rawWeight(a))) : 0;
    const learnedWeight = learned.length
      ? average(learned.map((a) => rawWeight(a) * clamp(Number(a.confidence ?? 1))))
      : 0;
    const effective = explicit.length ? clamp(explicitWeight * 0.78 + learnedWeight * 0.22, -1, 1) : clamp(learnedWeight, -1, 1);
    const representative = explicit[0] || learned[0];
    if (representative && Math.abs(effective) > 0.02) {
      signals.push({ label: representative.label, weight: effective, qcode: representative.topic_qcode, tag: representative.atlus_tag, assumption: representative });
    }
  }
  return signals;
}

function taxonomyScore(signal: Signal, article: ArticleForRanking) {
  if (signal.tag && (article.atlus_tags || []).some((tag) => normaliseLabel(tag) === normaliseLabel(signal.tag!))) return 1;
  if (!signal.qcode) return 0;

  const primary = iptcHierarchySimilarity(signal.qcode, article.primary_iptc_qcode);
  const secondary = max((article.secondary_iptc_qcodes || []).map((qcode) =>
    iptcHierarchySimilarity(signal.qcode, qcode) * 0.85
  ));
  return Math.max(primary, secondary);
}

function signalFit(signal: Signal, article: ArticleForRanking) {
  return Math.max(taxonomyScore(signal, article), textScore(signal.label, article));
}

function combinedSimilarity(signals: Signal[], article: ArticleForRanking, queryEmbedding?: number[] | null) {
  const positives = signals.filter((signal) => signal.weight > 0.02);
  if (!positives.length) return 0;
  const weighted = positives.map((signal) => signalFit(signal, article) * signal.weight);
  const denom = positives.reduce((sum, signal) => sum + signal.weight, 0) || 1;
  const explicit = Math.max(average(weighted) / Math.max(0.25, average(positives.map((s) => s.weight))), max(weighted));
  const embedding = calibratedEmbeddingScore(article.embedding, queryEmbedding);
  return queryEmbedding?.length ? clamp(0.67 * embedding + 0.33 * explicit) : clamp(explicit / denom * positives.length);
}

function strongestSignal(signals: Signal[], article: ArticleForRanking) {
  return signals
    .filter((signal) => signal.weight > 0)
    .map((signal) => ({ signal, score: signalFit(signal, article) * signal.weight }))
    .sort((a, b) => b.score - a.score)[0]?.signal;
}

type GoalMatch = {
  signal: Signal | null;
  total: number;
  semantic: number;
  concepts: number;
  taxonomy: number;
  hasConceptVector: boolean;
};

function goalTaxonomyScore(signal: Signal, article: ArticleForRanking) {
  const structuredQcodes = Array.isArray(signal.assumption.structured_value?.iptc_qcodes)
    ? signal.assumption.structured_value.iptc_qcodes.map(String)
    : [];
  const qcodes = Array.from(new Set<string>([
    ...structuredQcodes,
    ...(signal.qcode ? [signal.qcode] : [])
  ]));
  if (!qcodes.length) return 0;

  const primary = max(qcodes.map((goalQcode) =>
    iptcHierarchySimilarity(goalQcode, article.primary_iptc_qcode)
  ));
  const secondary = max(qcodes.flatMap((goalQcode) =>
    (article.secondary_iptc_qcodes || []).map((articleQcode) =>
      iptcHierarchySimilarity(goalQcode, articleQcode) * 0.85
    )
  ));
  return Math.max(primary, secondary);
}

function bestGoalMatch(
  goals: Signal[],
  article: ArticleForRanking,
  goalVectors: StoredGoalVector[] = []
): GoalMatch {
  const positives = goals.filter((signal) => signal.weight > 0.02);
  if (!positives.length) {
    return { signal: null, total: 0, semantic: 0, concepts: 0, taxonomy: 0, hasConceptVector: false };
  }

  const vectorByAssumption = new Map(goalVectors.map((vector) => [vector.assumptionId, vector]));
  const articleConceptEmbedding = parseEmbedding(article.concept_embedding);

  const matches = positives.map((signal) => {
    const stored = vectorByAssumption.get(signal.assumption.id);
    const semantic = calibratedEmbeddingScore(article.embedding, stored?.semanticEmbedding);
    const concepts = calibratedEmbeddingScore(articleConceptEmbedding, stored?.conceptEmbedding);
    const taxonomy = goalTaxonomyScore(signal, article);
    const hasConceptVector = Boolean(articleConceptEmbedding?.length && stored?.conceptEmbedding?.length);

    const total = (hasConceptVector
      ? clamp(0.55 * concepts + 0.30 * semantic + 0.15 * taxonomy)
      : clamp(0.65 * semantic + 0.35 * taxonomy)) * signal.weight;

    return { signal, total, semantic, concepts, taxonomy, hasConceptVector };
  });

  return matches.sort((a, b) => b.total - a.total)[0];
}

function levelValue(level?: string | null) {
  const lower = (level || '').toLowerCase();
  if (lower.includes('intro')) return 0.2;
  if (lower.includes('inter')) return 0.55;
  if (lower.includes('adv')) return 0.88;
  return 0.5;
}

function normalisedKnowledgeLevel(rawLevel: unknown) {
  if (typeof rawLevel === 'number' && Number.isFinite(rawLevel)) return clamp(rawLevel / 3);
  const value = String(rawLevel || '').toLowerCase();
  if (value.includes('advanced') || value.includes('well')) return 0.9;
  if (value.includes('regular') || value.includes('closely')) return 0.65;
  if (value.includes('basic')) return 0.4;
  return 0.25;
}

function knowledgeCompatibility(level: number, article: ArticleForRanking, progression = 0.12) {
  const target = clamp(level + progression);
  return clamp(1 - Math.abs(levelValue(article.complexity_level) - target));
}

function knowledgeFit(assumptions: UserAssumption[], article: ArticleForRanking) {
  const knowledge = effectiveSignals(assumptions, 'knowledge');
  const candidates = knowledge
    .map((signal) => ({ signal, match: signalFit(signal, article) }))
    .filter((item) => item.match > 0.12)
    .sort((a, b) => b.match - a.match);
  if (!candidates.length) return 0.72;
  const level = normalisedKnowledgeLevel(candidates[0].signal.assumption.structured_value?.level);
  return knowledgeCompatibility(level, article, 0.12);
}

function goalLearningSettings(goal: Signal | null) {
  const structured = goal?.assumption.structured_value || {};
  const rawKnowledgeValue = structured.knowledge_level;
  const rawKnowledge = rawKnowledgeValue === null || rawKnowledgeValue === undefined || rawKnowledgeValue === ''
    ? Number.NaN
    : Number(rawKnowledgeValue);
  const knowledgeLevel = Number.isFinite(rawKnowledge) ? Math.max(0, Math.min(3, rawKnowledge)) : null;
  const rawMode = String(structured.learning_mode || 'deepen');
  const mode = rawMode === 'foundations' || rawMode === 'keep_up' ? rawMode : 'deepen';
  const priority = String(structured.priority || 'normal');
  return { knowledgeLevel, mode, priority };
}

function goalSpecificKnowledgeFit(goal: Signal | null, article: ArticleForRanking, fallback: number) {
  const settings = goalLearningSettings(goal);
  if (settings.knowledgeLevel === null) return fallback;
  const level = clamp(settings.knowledgeLevel / 3);
  const progression = settings.mode === 'foundations' ? 0.03 : settings.mode === 'keep_up' ? 0.08 : 0.18;
  return knowledgeCompatibility(level, article, progression);
}

function learningModeFit(
  goal: Signal | null,
  article: ArticleForRanking,
  stretchKnowledgeFit: number,
  freshness: number,
  evergreen: number
) {
  const { mode } = goalLearningSettings(goal);
  const articleType = normaliseLabel(article.article_type || '');
  const explainerFit = articleType.includes('explainer') || articleType.includes('analysis') || articleType.includes('essay') ? 1 : 0.62;
  const currentFit = articleType.includes('news') || articleType.includes('report') || articleType.includes('analysis') ? 1 : 0.68;

  if (mode === 'foundations') return clamp(0.58 * stretchKnowledgeFit + 0.24 * evergreen + 0.18 * explainerFit);
  if (mode === 'keep_up') return clamp(0.45 * stretchKnowledgeFit + 0.42 * freshness + 0.13 * currentFit);
  return clamp(0.72 * stretchKnowledgeFit + 0.18 * Math.max(evergreen, freshness * 0.7) + 0.10 * explainerFit);
}

function geographyFit(
  article: ArticleForRanking,
  preferences: Record<string, number | string> = {}
) {
  return geographyPreferenceFit(
    article.geographies || [],
    preferences
  );
}

function sourceFit(article: ArticleForRanking, sourceSignals: Signal[], sourceExposure: string[] = []) {
  const exact = sourceSignals.find((signal) => normaliseLabel(signal.label) === normaliseLabel(article.publisher_name));
  if (exact) return clamp(0.5 + exact.weight * 0.5);
  const familiar = sourceExposure.some((source) => normaliseLabel(source) === normaliseLabel(article.publisher_name));
  return familiar ? 0.5 : 0.62;
}

function excluded(article: ArticleForRanking, exclusions: string[] = []) {
  const textValues = new Set([
    normaliseLabel(article.primary_topic || ''),
    ...(article.secondary_topics || []).map(normaliseLabel),
    ...(article.atlus_tags || []).map(normaliseLabel)
  ]);
  const articleQcodes = [
    article.primary_iptc_qcode,
    ...(article.secondary_iptc_qcodes || [])
  ].filter(Boolean) as string[];

  return exclusions.some((item) => {
    if (textValues.has(normaliseLabel(item))) return true;
    return articleQcodes.some((articleQcode) => isIptcSameOrDescendant(articleQcode, item));
  });
}

function noveltyTarget(tolerance: string | undefined) {
  if (tolerance === 'low' || tolerance === 'gentle') return 0.58;
  if (tolerance === 'high' || tolerance === 'adventurous') return 0.32;
  return 0.44;
}

function noveltyFit(connection: number, tolerance: string | undefined) {
  const target = noveltyTarget(tolerance);
  const width = tolerance === 'high' || tolerance === 'adventurous' ? 0.42 : 0.34;
  return clamp(1 - Math.abs(connection - target) / width);
}

export function scoreArticle(
  article: ArticleForRanking,
  assumptions: UserAssumption[],
  slot: SlotType,
  recentTopics: string[],
  recentPublishers: string[],
  vectors: UserRecommendationVectors = {},
  context: RecommendationContext = {}
) {
  const preferences = effectiveSignals(assumptions, 'preference');
  const goals = effectiveSignals(assumptions, 'goal');
  const avoidances = [...effectiveSignals(assumptions, 'avoidance'), ...preferences.filter((signal) => signal.weight < 0).map((signal) => ({ ...signal, weight: Math.abs(signal.weight) }))];
  const sourcePreferences = effectiveSignals(assumptions, 'source_preference');

  const preferenceFit = combinedSimilarity(preferences, article, vectors.preferenceEmbedding);
  const aggregateGoalFit = combinedSimilarity(goals, article, vectors.goalEmbedding);
  const goalMatch = bestGoalMatch(goals, article, vectors.goalVectors || []);
  const specificGoalFit = goalMatch.total;
  const goalSemanticFit = goalMatch.semantic;
  const goalConceptFit = goalMatch.concepts;
  const goalTaxonomyFit = goalMatch.taxonomy;
  const goalConnection = Math.max(aggregateGoalFit, specificGoalFit);
  const avoidanceFit = combinedSimilarity(avoidances, article, vectors.avoidanceEmbedding);
  const knowledgeLevelFit = knowledgeFit(assumptions, article);
  const quality = clamp(Number(article.quality_score ?? 0.5));
  const freshness = clamp(Number(article.freshness_score ?? 0.4));
  const evergreen = clamp(Number(article.evergreen_score ?? 0.4));
  const freshnessOrEvergreen = Math.max(freshness, evergreen);
  const stretchKnowledgeLevelFit = goalSpecificKnowledgeFit(goalMatch.signal, article, knowledgeLevelFit);
  const goalModeFit = learningModeFit(goalMatch.signal, article, stretchKnowledgeLevelFit, freshness, evergreen);
  const goalSettings = goalLearningSettings(goalMatch.signal);
  const source = sourceFit(article, sourcePreferences, context.sourceExposure);
  const geography = geographyFit(article, context.geographyPreferences);
  const readingTime = article.reading_time_minutes == null ? null : Number(article.reading_time_minutes);
  const readingTimeFit = readingTime == null || !Number.isFinite(readingTime)
    ? null
    : readingTime <= 3 ? 0.58 : readingTime <= 15 ? 0.9 : readingTime <= 24 ? 0.7 : 0.45;
  const connection = Math.max(preferenceFit, goalConnection);
  const discoveryNovelty = noveltyFit(connection, context.noveltyTolerance);
  const moreLikeFit = feedbackSignalFit(article, vectors.articleFeedbackSignals || [], 'more_like_this');
  const lessLikeFit = feedbackSignalFit(article, vectors.articleFeedbackSignals || [], 'less_like_this');
  const tooSimilarFit = feedbackSignalFit(article, vectors.articleFeedbackSignals || [], 'too_similar');

  const topic = article.primary_iptc_qcode || article.primary_topic || 'Unknown';
  const recentTopicCount = recentTopics.filter((value) => value === topic).length;
  const recentPublisherCount = recentPublishers.filter((value) => value === article.publisher_name).length;
  const repetitionPenalty = Math.min(0.36, recentTopicCount * 0.12);
  const publisherPenalty = Math.min(0.22, recentPublisherCount * 0.08);
  const avoidancePenalty = avoidanceFit * 0.7;
  const semanticFeedbackBoost = 0.10 * moreLikeFit - 0.12 * lessLikeFit;
  const tooSimilarPenalty = 0.14 * clamp((tooSimilarFit - 0.42) / 0.58);
  const sourceAccessCount = article.source_id ? Number(context.sourceAccessIssueCounts?.[article.source_id] || 0) : 0;
  const sourceAccessPenalty = Math.min(0.12, sourceAccessCount * 0.04);
  const publisher = normaliseLabel(article.publisher_name);
  const isExcluded = excluded(article, context.topicExclusions) ||
    (context.sourceExclusions || []).some((source) =>
      source.split('/').some((name) => normaliseLabel(name) === publisher)
    );

  let score = 0;
  let eligible = !isExcluded;
  if (slot === 'core') {
    eligible = eligible && preferenceFit >= 0.12;
    score = 0.55 * preferenceFit + 0.08 * aggregateGoalFit + 0.13 * quality + 0.08 * knowledgeLevelFit + 0.08 * freshnessOrEvergreen + 0.04 * source + 0.04 * geography;
  } else if (slot === 'stretch') {
    const conceptBridge = goalConceptFit >= 0.32;
    const taxonomyBridge = goalTaxonomyFit >= 0.62;
    eligible =
      eligible &&
      goalMatch.hasConceptVector &&
      goalSemanticFit >= 0.18 &&
      goalConceptFit >= 0.22 &&
      specificGoalFit >= 0.28 &&
      (conceptBridge || taxonomyBridge);

    score =
      0.54 * specificGoalFit +
      0.06 * preferenceFit +
      0.12 * quality +
      0.12 * stretchKnowledgeLevelFit +
      0.09 * goalModeFit +
      0.04 * freshnessOrEvergreen +
      0.02 * source +
      0.01 * geography;
  } else {
    eligible = eligible && connection >= 0.12 && preferenceFit <= 0.82 && quality >= 0.50;
    const bridge = clamp(0.65 * connection + 0.35 * Math.max(goalConnection, preferenceFit * 0.65));
    score = 0.30 * bridge + 0.25 * discoveryNovelty + 0.18 * quality + 0.08 * knowledgeLevelFit + 0.08 * freshnessOrEvergreen + 0.04 * source + 0.04 * geography + 0.03 * goalConnection;
  }

  score += semanticFeedbackBoost;
  score -= repetitionPenalty + publisherPenalty + avoidancePenalty + tooSimilarPenalty + sourceAccessPenalty;
  if (!eligible) score -= 10;

  const matchedPreference = strongestSignal(preferences, article)?.label || null;
  const matchedGoal = goalMatch.signal?.label || strongestSignal(goals, article)?.label || null;
  const reasonCodes: string[] = [];
  if (preferenceFit >= 0.18) reasonCodes.push('matched_user_interest');
  if (specificGoalFit >= 0.28) reasonCodes.push('matched_learning_goal');
  if (quality >= 0.72) reasonCodes.push('high_quality_article');
  if (evergreen >= 0.72) reasonCodes.push('evergreen_article');
  if (freshness >= 0.72) reasonCodes.push('timely_article');
  if (slot === 'discovery') reasonCodes.push('different_but_connected');
  if (moreLikeFit >= 0.45) reasonCodes.push('similar_to_positive_feedback');
  if ((slot === 'stretch' ? stretchKnowledgeLevelFit : knowledgeLevelFit) >= 0.72) reasonCodes.push('appropriate_knowledge_level');

  const features: RecommendationFeatureSnapshot = {
    preferenceFit: Number(preferenceFit.toFixed(4)),
    goalFit: Number(specificGoalFit.toFixed(4)),
    aggregateGoalFit: Number(aggregateGoalFit.toFixed(4)),
    goalSemanticFit: Number(goalSemanticFit.toFixed(4)),
    goalConceptFit: Number(goalConceptFit.toFixed(4)),
    goalTaxonomyFit: Number(goalTaxonomyFit.toFixed(4)),
    goalHasConceptVector: goalMatch.hasConceptVector,
    avoidanceFit: Number(avoidanceFit.toFixed(4)),
    knowledgeLevelFit: Number(knowledgeLevelFit.toFixed(4)),
    stretchKnowledgeLevelFit: Number(stretchKnowledgeLevelFit.toFixed(4)),
    goalModeFit: Number(goalModeFit.toFixed(4)),
    goalLearningMode: goalSettings.mode,
    goalKnowledgeLevel: goalSettings.knowledgeLevel,
    goalPriority: goalSettings.priority,
    quality,
    freshness,
    evergreen,
    freshnessOrEvergreen,
    sourceFit: Number(source.toFixed(4)),
    geographyFit: Number(geography.toFixed(4)),
    readingTimeFit,
    discoveryNovelty: Number(discoveryNovelty.toFixed(4)),
    connection: Number(connection.toFixed(4)),
    moreLikeFit: Number(moreLikeFit.toFixed(4)),
    lessLikeFit: Number(lessLikeFit.toFixed(4)),
    tooSimilarFit: Number(tooSimilarFit.toFixed(4)),
    semanticFeedbackBoost: Number(semanticFeedbackBoost.toFixed(4)),
    repetitionPenalty,
    publisherPenalty,
    avoidancePenalty: Number(avoidancePenalty.toFixed(4)),
    tooSimilarPenalty: Number(tooSimilarPenalty.toFixed(4)),
    sourceAccessPenalty: Number(sourceAccessPenalty.toFixed(4)),
    processingConfidence: Number(article.processing_confidence ?? 0.5),
    primaryIptcQcode: article.primary_iptc_qcode || null,
    matchedPreference,
    matchedGoal,
    eligible
  };

  return { score: Number(score.toFixed(4)), eligible, features, reasonCodes };
}

function entityOverlapPenalty(article: ArticleForRanking, selected: RankedCandidate[]) {
  const current = new Set((article.entities || []).map(normaliseLabel));
  if (!current.size) return 0;
  let overlap = 0;
  for (const item of selected) {
    for (const entity of item.article.entities || []) if (current.has(normaliseLabel(entity))) overlap += 1;
  }
  return Math.min(0.24, overlap * 0.08);
}

function explanationFor(candidate: RankedCandidate) {
  const preference = String(candidate.features.matchedPreference || '');
  const goal = String(candidate.features.matchedGoal || '');
  if (candidate.slot === 'core' && preference) return `This closely matches your interest in ${preference}.`;
  if (candidate.slot === 'stretch' && goal) {
    const mode = String(candidate.features.goalLearningMode || 'deepen');
    if (mode === 'foundations') return `This helps build the foundations for “${goal}” at your current level.`;
    if (mode === 'keep_up') return `This helps you keep up with new developments in “${goal}” at your current level.`;
    return `This helps you go deeper on “${goal}” at your current level.`;
  }
  if (candidate.slot === 'discovery') {
    const anchor = preference || goal || 'your current interests';
    return `This is meaningfully different from your usual reading, while still connecting to ${anchor}.`;
  }
  return 'Chosen because it is a strong fit for your current reading profile.';
}

export function buildSlate(input: {
  readingMode: ReadingMode;
  articles: ArticleForRanking[];
  assumptions: UserAssumption[];
  recentTopics: string[];
  recentPublishers: string[];
  vectors?: UserRecommendationVectors;
  context?: RecommendationContext;
  explorationRate?: number;
}) {
  const slots = SLOT_COUNTS[input.readingMode] || SLOT_COUNTS.standard;
  const distinctSlots = Array.from(new Set(slots));
  const candidates: RankedCandidate[] = [];

  for (const slot of distinctSlots) {
    const ranked = input.articles
      .map((article) => {
        const scored = scoreArticle(article, input.assumptions, slot, input.recentTopics, input.recentPublishers, input.vectors, input.context);
        return { article, slot, rawScore: scored.score, finalScore: scored.score, eligible: scored.eligible, rankBeforeSlate: 0, selected: false, exploration: false, selectionProbability: null, selectionPolicy: null, features: scored.features, reasonCodes: scored.reasonCodes } as RankedCandidate;
      })
      .sort((a, b) => b.rawScore - a.rawScore);
    ranked.forEach((candidate, index) => { candidate.rankBeforeSlate = index + 1; });
    candidates.push(...ranked);
  }

  const selected: RankedCandidate[] = [];
  const usedArticleIds = new Set<string>();
  const usedTopics = new Map<string, number>();
  const usedPublishers = new Map<string, number>();
  const explorationRate = input.explorationRate ?? 0.08;

  for (const slot of slots) {
    const pool = candidates
      .filter((candidate) => candidate.slot === slot && candidate.eligible && !usedArticleIds.has(candidate.article.id))
      .map((candidate) => {
        const topic = candidate.article.primary_iptc_qcode || candidate.article.primary_topic || '';
        const slateTopicPenalty = (usedTopics.get(topic) || 0) * 0.2;
        const slatePublisherPenalty = (usedPublishers.get(candidate.article.publisher_name) || 0) * 0.12;
        const entityPenalty = entityOverlapPenalty(candidate.article, selected);
        return { candidate, adjusted: candidate.rawScore - slateTopicPenalty - slatePublisherPenalty - entityPenalty };
      })
      .sort((a, b) => b.adjusted - a.adjusted);

    if (!pool.length) continue;
    let pick = pool[0];
    let exploration = false;
    let selectionProbability = 1;
    let selectionPolicy = 'deterministic_top';

    if (slot === 'discovery' && pool.length >= 4) {
      const safeExplorationPool = pool.slice(1, 8).filter(({ candidate }) => Number(candidate.features.quality || 0) >= 0.58 && Number(candidate.features.connection || 0) >= 0.08);
      if (safeExplorationPool.length) {
        if (Math.random() < explorationRate) {
          pick = safeExplorationPool[Math.floor(Math.random() * safeExplorationPool.length)];
          exploration = true;
          selectionProbability = explorationRate / safeExplorationPool.length;
          selectionPolicy = 'epsilon_safe_explore';
        } else {
          selectionProbability = 1 - explorationRate;
          selectionPolicy = 'epsilon_greedy_top';
        }
      }
    }

    pick.candidate.selected = true;
    pick.candidate.exploration = exploration;
    pick.candidate.selectionProbability = Number(selectionProbability.toFixed(8));
    pick.candidate.selectionPolicy = selectionPolicy;
    pick.candidate.finalScore = Number(pick.adjusted.toFixed(4));
    pick.candidate.explanation = explanationFor(pick.candidate);
    selected.push(pick.candidate);
    usedArticleIds.add(pick.candidate.article.id);
    const topic = pick.candidate.article.primary_iptc_qcode || pick.candidate.article.primary_topic || '';
    usedTopics.set(topic, (usedTopics.get(topic) || 0) + 1);
    usedPublishers.set(pick.candidate.article.publisher_name, (usedPublishers.get(pick.candidate.article.publisher_name) || 0) + 1);
  }

  return { selected, candidates };
}

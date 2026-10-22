import { buildSlate, effectiveSignals } from '@/lib/recommender';
import type { UserRecommendationVectors } from '@/lib/recommender';
import type { ArticleForRanking, ReadingMode, UserAssumption } from '@/lib/types';
import { improveRecommendationExplanations } from '@/lib/recommendation-explanations';

export const RECOMMENDER_VERSION = 'recommender_v1.4_feedback_v2_ready';

function countForMode(mode: ReadingMode) { return mode === 'light' ? 1 : mode === 'deep' ? 5 : 3; }

function parseDbVector(value: unknown): number[] | null {
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
      if (Array.isArray(parsed)) {
        const numbers = parsed.map(Number).filter(Number.isFinite);
        return numbers.length ? numbers : null;
      }
    } catch {
      const numbers = trimmed
        .replace(/^\[/, '')
        .replace(/\]$/, '')
        .split(',')
        .map((item) => Number(item.trim()))
        .filter(Number.isFinite);
      return numbers.length ? numbers : null;
    }
  }
  return null;
}

function feedbackDecayWeight(createdAt: string, kind: 'more_like_this' | 'less_like_this' | 'too_similar') {
  const ageDays = Math.max(0, (Date.now() - new Date(createdAt).getTime()) / 86_400_000);
  const decayDays = kind === 'too_similar' ? 28 : 150;
  return Math.exp(-ageDays / decayDays);
}

async function loadStoredQueryVectors(
  supabase: any,
  userId: string,
  assumptions: UserAssumption[]
): Promise<UserRecommendationVectors> {
  const { data: aggregateRows, error: aggregateError } = await supabase
    .from('user_recommendation_embeddings')
    .select('embedding_kind,embedding')
    .eq('user_id', userId)
    .eq('embedding_version', 'v1');
  if (aggregateError) throw aggregateError;

  const aggregate = new Map<string, number[] | null>();
  for (const row of aggregateRows || []) aggregate.set(String(row.embedding_kind), parseDbVector(row.embedding));

  const goals = assumptions.filter((assumption) => assumption.active && assumption.assumption_type === 'goal');
  const goalVectors: NonNullable<UserRecommendationVectors['goalVectors']> = [];

  if (goals.length) {
    const { data: rows, error } = await supabase
      .from('user_assumption_embeddings')
      .select('assumption_id,embedding_kind,embedding')
      .in('assumption_id', goals.map((goal) => goal.id))
      .eq('embedding_version', 'v1');
    if (error) throw error;

    const byGoal = new Map<string, { semanticEmbedding?: number[] | null; conceptEmbedding?: number[] | null }>();
    for (const row of rows || []) {
      const current = byGoal.get(row.assumption_id) || {};
      if (row.embedding_kind === 'semantic') current.semanticEmbedding = parseDbVector(row.embedding);
      if (row.embedding_kind === 'concepts') current.conceptEmbedding = parseDbVector(row.embedding);
      byGoal.set(row.assumption_id, current);
    }

    for (const goal of goals) {
      const vectors = byGoal.get(goal.id);
      if (!vectors) continue;
      goalVectors.push({
        assumptionId: goal.id,
        semanticEmbedding: vectors.semanticEmbedding || null,
        conceptEmbedding: vectors.conceptEmbedding || null
      });
    }
  }

  const feedbackSince = new Date(Date.now() - 240 * 86_400_000).toISOString();
  const { data: feedbackRows, error: feedbackError } = await supabase
    .from('feedback_events')
    .select('article_id,feedback_type,created_at')
    .eq('user_id', userId)
    .in('feedback_type', ['more_like_this', 'less_like_this', 'too_similar'])
    .not('article_id', 'is', null)
    .gte('created_at', feedbackSince)
    .order('created_at', { ascending: false })
    .limit(120);
  if (feedbackError) throw feedbackError;

  const feedbackArticleIds = Array.from(new Set((feedbackRows || []).map((row: any) => String(row.article_id)).filter(Boolean)));
  const feedbackArticleVectors = new Map<string, { embedding: number[] | null; conceptEmbedding: number[] | null }>();
  if (feedbackArticleIds.length) {
    const { data: rows, error } = await supabase
      .from('articles_for_ranking_view')
      .select('id,embedding,concept_embedding')
      .in('id', feedbackArticleIds);
    if (error) throw error;
    for (const row of rows || []) {
      feedbackArticleVectors.set(String(row.id), {
        embedding: parseDbVector(row.embedding),
        conceptEmbedding: parseDbVector(row.concept_embedding)
      });
    }
  }

  const articleFeedbackSignals: NonNullable<UserRecommendationVectors['articleFeedbackSignals']> = [];
  const seenDirectionalArticles = new Set<string>();
  const seenTooSimilarArticles = new Set<string>();
  for (const row of feedbackRows || []) {
    const articleId = String(row.article_id);
    const kind = String(row.feedback_type) as 'more_like_this' | 'less_like_this' | 'too_similar';
    if (kind === 'too_similar') {
      if (seenTooSimilarArticles.has(articleId)) continue;
      seenTooSimilarArticles.add(articleId);
    } else {
      if (seenDirectionalArticles.has(articleId)) continue;
      seenDirectionalArticles.add(articleId);
    }

    const stored = feedbackArticleVectors.get(articleId);
    if (!stored || (!stored.embedding?.length && !stored.conceptEmbedding?.length)) continue;
    articleFeedbackSignals.push({
      articleId,
      kind,
      embedding: stored.embedding,
      conceptEmbedding: stored.conceptEmbedding,
      weight: feedbackDecayWeight(String(row.created_at), kind)
    });
  }

  return {
    preferenceEmbedding: aggregate.get('preferences') || null,
    goalEmbedding: aggregate.get('goals') || null,
    avoidanceEmbedding: aggregate.get('avoidances') || null,
    goalVectors,
    articleFeedbackSignals
  };
}

function userStateSnapshot(profile: any, assumptions: UserAssumption[]) {
  return {
    reading_mode: profile?.reading_mode || 'standard',
    novelty_tolerance: profile?.novelty_tolerance || 'medium',
    geography_preferences: profile?.geography_preferences || {},
    source_exposure: profile?.source_exposure || [],
    topic_exclusions: profile?.topic_exclusions || [],
    perspective_preferences: profile?.perspective_preferences || {},
    explicit_preferences: effectiveSignals(assumptions, 'preference').map((s) => ({ label: s.label, weight: s.weight, qcode: s.qcode, tag: s.tag })),
    goals: effectiveSignals(assumptions, 'goal').map((s) => ({
      label: s.label,
      weight: s.weight,
      qcode: s.qcode,
      tag: s.tag,
      concepts: Array.isArray(s.assumption.structured_value?.concepts) ? s.assumption.structured_value.concepts : [],
      iptc_qcodes: Array.isArray(s.assumption.structured_value?.iptc_qcodes) ? s.assumption.structured_value.iptc_qcodes : []
    })),
    representation_mode: 'precomputed_v1',
    exploration_rate: 0.08,
    generated_at: new Date().toISOString()
  };
}

export async function generateRecommendationsForUser(supabase: any, userId: string) {
  const { data: profile, error: profileError } = await supabase.from('user_profiles').select('*').eq('user_id', userId).maybeSingle();
  if (profileError) throw profileError;
  const readingMode: ReadingMode = profile?.reading_mode || 'standard';

  const { data: assumptions, error: assumptionsError } = await supabase.from('user_assumptions').select('*').eq('user_id', userId).eq('active', true);
  if (assumptionsError) throw assumptionsError;
  const activeAssumptions = (assumptions || []) as UserAssumption[];

  const { data: recentItems } = await supabase
    .from('recommendation_items_view')
    .select('article,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(60);

  const recentTopics = (recentItems || []).map((row: any) => row.article?.primary_iptc_qcode || row.article?.primary_topic).filter(Boolean);
  const recentPublishers = (recentItems || []).map((row: any) => row.article?.publisher_name).filter(Boolean);
  const recentlyShownIds = (recentItems || []).slice(0, 30).map((row: any) => row.article?.id).filter(Boolean);

  let query = supabase.from('articles_for_ranking_view').select('*').eq('status', 'active').gte('quality_score', 0.32).order('published_at', { ascending: false, nullsFirst: false }).limit(800);
  if (recentlyShownIds.length) query = query.not('id', 'in', `(${recentlyShownIds.join(',')})`);
  const { data: articles, error: articlesError } = await query;
  if (articlesError) throw articlesError;

  // Slate generation uses stored vectors; it should not need a model call.
  const vectors = await loadStoredQueryVectors(supabase, userId, activeAssumptions);

  const accessSince = new Date(Date.now() - 60 * 86_400_000).toISOString();
  const { data: accessIssues, error: accessError } = await supabase
    .from('source_access_issues')
    .select('source_id')
    .eq('user_id', userId)
    .eq('status', 'open')
    .gte('created_at', accessSince);
  if (accessError) throw accessError;
  const sourceAccessIssueCounts: Record<string, number> = {};
  for (const issue of accessIssues || []) {
    if (!issue.source_id) continue;
    sourceAccessIssueCounts[issue.source_id] = (sourceAccessIssueCounts[issue.source_id] || 0) + 1;
  }

  const built = buildSlate({
    readingMode,
    articles: (articles || []) as ArticleForRanking[],
    assumptions: activeAssumptions,
    recentTopics,
    recentPublishers,
    vectors,
    context: {
      noveltyTolerance: profile?.novelty_tolerance || 'medium',
      geographyPreferences: profile?.geography_preferences || {},
      sourceExposure: profile?.source_exposure || [],
      sourceExclusions: profile?.source_exclusions || [],
      topicExclusions: profile?.topic_exclusions || [],
      sourceAccessIssueCounts
    },
    explorationRate: 0.08
  });

  const selectedIds = built.selected.map((item) => item.article.id);
  const summaryByArticle = new Map<string, string | null>();
  if (selectedIds.length) {
    const { data: explanationArticles } = await supabase
      .from('articles')
      .select('id,summary')
      .in('id', selectedIds);
    for (const row of explanationArticles || []) summaryByArticle.set(String(row.id), row.summary || null);
  }

  const explanations = await improveRecommendationExplanations(
    built.selected.map((item) => ({
      article: item.article,
      slot: item.slot,
      features: item.features,
      reasonCodes: item.reasonCodes,
      fallback: item.explanation || 'Chosen because it is a strong fit for your current reading profile.',
      summary: summaryByArticle.get(item.article.id) || null
    }))
  );

  const requested = countForMode(readingMode);
  const { data: run, error: runError } = await supabase.from('recommendation_runs').insert({
    user_id: userId,
    model_version: RECOMMENDER_VERSION,
    reading_mode: readingMode,
    status: 'complete',
    requested_count: requested,
    generated_count: built.selected.length,
    fallback_used: built.selected.length < requested,
    user_state_snapshot: userStateSnapshot(profile, activeAssumptions)
  }).select('*').single();
  if (runError) throw runError;

  const candidateRows = built.candidates.map((candidate) => ({
    recommendation_run_id: run.id,
    user_id: userId,
    article_id: candidate.article.id,
    slot_type: candidate.slot,
    raw_score: candidate.rawScore,
    final_score: candidate.selected ? candidate.finalScore : candidate.rawScore,
    eligible: candidate.eligible,
    rank_before_slate: candidate.rankBeforeSlate,
    selected: candidate.selected,
    exploration: candidate.exploration,
    selection_probability: candidate.selectionProbability,
    selection_policy: candidate.selectionPolicy,
    feature_snapshot: candidate.features,
    model_version: RECOMMENDER_VERSION
  }));

  const candidatesToLog = candidateRows
    .filter((row) => row.selected || (row.eligible && row.rank_before_slate <= 60) || row.rank_before_slate <= 20)
    .slice(0, 240);
  if (candidatesToLog.length) {
    const { error: candidateError } = await supabase.from('recommendation_candidates').insert(candidatesToLog);
    if (candidateError) throw candidateError;
  }

  const itemRows = built.selected.map((item, index) => ({
    recommendation_run_id: run.id,
    user_id: userId,
    article_id: item.article.id,
    slot_type: item.slot,
    rank_position: index + 1,
    score: item.finalScore,
    explanation_text: explanations.get(item.article.id) || item.explanation,
    explanation_reason_codes: item.reasonCodes,
    feature_snapshot: {
      ...item.features,
      exploration: item.exploration,
      selectionProbability: item.selectionProbability,
      selectionPolicy: item.selectionPolicy
    },
    model_version: RECOMMENDER_VERSION
  }));
  if (itemRows.length) {
    const { error: itemError } = await supabase.from('recommendation_items').insert(itemRows);
    if (itemError) throw itemError;
  }

  return run;
}

import OpenAI from 'openai';
import {
  ATLUS_SUBTOPICS,
  IPTC_TOPICS,
  iptcCandidateTopicsForText,
  iptcLabel,
  iptcQcodeForAtlusSubtopic
} from '@/lib/iptc';
import {
  extractGeographies,
  normaliseArticleGeographies
} from '@/lib/geography';

const ZERO_VECTOR = Array.from({ length: 1536 }, () => 0);

type QualityComponents = {
  depth: number;
  substance: number;
  clarity: number;
  originality: number;
};

export type ProcessedArticle = {
  primary_topic: string;
  secondary_topics: string[];
  primary_iptc_qcode: string;
  secondary_iptc_qcodes: string[];
  atlus_tags: string[];
  concepts: string[];
  geographies: string[];
  entities: string[];
  article_type: string;
  complexity_level: string;
  content_depth: 'metadata_only' | 'short_excerpt' | 'full_text';
  processing_confidence: number;
  quality_components: QualityComponents;
  quality_score: number;
  evergreen_score: number;
  freshness_score: number;
  reading_time_minutes: number | null;
  summary: string;
  embedding: number[];
  concept_embedding: number[];
};

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function clampScore(value: unknown, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? clamp(n) : fallback;
}

function detectContentDepth(body?: string | null, subtitle?: string | null): ProcessedArticle['content_depth'] {
  const length = (body || '').trim().length;
  if (length >= 2500) return 'full_text';
  if (length >= 500 || (subtitle || '').length >= 350) return 'short_excerpt';
  return 'metadata_only';
}

function roughReadingTime(text: string, contentDepth: ProcessedArticle['content_depth']) {
  if (contentDepth !== 'full_text') return null;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return words ? Math.max(1, Math.round(words / 220)) : null;
}

function articleTypeFromText(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes('live updates') || lower.includes('live blog') || lower.includes('as it happened')) return 'live';
  if (lower.includes('breaking')) return 'breaking_news';
  if (lower.includes('explained') || lower.includes('what is') || lower.includes('how to') || lower.includes('guide')) return 'explainer';
  if (lower.includes('investigation')) return 'investigation';
  if (lower.includes('review')) return 'review';
  if (lower.includes('opinion') || lower.includes('essay') || lower.includes('comment is free')) return 'essay';
  if (lower.includes('interview')) return 'interview';
  return 'analysis';
}

function freshnessHalfLifeDays(articleType: string) {
  if (articleType === 'live') return 1;
  if (articleType === 'breaking_news') return 2.5;
  if (articleType === 'news') return 4;
  if (articleType === 'analysis' || articleType === 'interview' || articleType === 'investigation') return 14;
  if (articleType === 'explainer' || articleType === 'essay' || articleType === 'review') return 45;
  return 10;
}

function scoreFreshness(publishedAt: string | null | undefined, articleType: string) {
  if (!publishedAt) return 0.45;
  const published = new Date(publishedAt).getTime();
  if (Number.isNaN(published)) return 0.45;
  const ageDays = Math.max(0, (Date.now() - published) / (1000 * 60 * 60 * 24));
  const halfLife = freshnessHalfLifeDays(articleType);
  return Number(Math.max(0.05, Math.exp((-Math.log(2) * ageDays) / halfLife)).toFixed(4));
}

function evergreenTypePrior(articleType: string) {
  if (articleType === 'live') return 0.08;
  if (articleType === 'breaking_news') return 0.15;
  if (articleType === 'news') return 0.3;
  if (articleType === 'analysis' || articleType === 'interview') return 0.62;
  if (articleType === 'investigation') return 0.72;
  if (articleType === 'review') return 0.68;
  if (articleType === 'explainer') return 0.88;
  if (articleType === 'essay') return 0.82;
  return 0.55;
}

function qualityHeuristics(text: string, contentDepth: ProcessedArticle['content_depth']): QualityComponents {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const lower = text.toLowerCase();
  const depth = contentDepth === 'full_text' ? clamp(0.55 + Math.min(words, 2500) / 5000) : contentDepth === 'short_excerpt' ? 0.48 : 0.35;
  let substance = 0.55;
  if (words >= 700) substance += 0.08;
  if (words >= 1400) substance += 0.08;
  if (/(analysis|investigation|evidence|research|data|explained|essay)/.test(lower)) substance += 0.08;
  if (/(live updates|rumour|rumor|celebrity gossip)/.test(lower)) substance -= 0.12;
  const clarity = /(explained|guide|what is|how to)/.test(lower) ? 0.72 : 0.62;
  const originality = /(investigation|interview|exclusive|research|essay)/.test(lower) ? 0.72 : 0.56;
  return { depth: clamp(depth), substance: clamp(substance), clarity: clamp(clarity), originality: clamp(originality) };
}

function overallQuality(components: QualityComponents) {
  return clamp(
    components.depth * 0.25 +
    components.substance * 0.35 +
    components.clarity * 0.25 +
    components.originality * 0.15
  );
}

const TOPIC_KEYWORDS: Record<string, string[]> = {
  '01000000': ['culture', 'film', 'television', 'book', 'literature', 'music', 'media', 'journalism', 'art'],
  '02000000': ['crime', 'court', 'law', 'justice', 'police', 'legal'],
  '03000000': ['disaster', 'earthquake', 'flood', 'wildfire', 'emergency', 'accident'],
  '04000000': ['economy', 'inflation', 'market', 'business', 'finance', 'trade', 'productivity', 'company'],
  '05000000': ['education', 'school', 'university', 'student', 'teacher'],
  '06000000': ['climate', 'environment', 'carbon', 'emissions', 'biodiversity', 'renewable'],
  '07000000': ['health', 'medical', 'medicine', 'hospital', 'disease', 'public health'],
  '08000000': ['human interest', 'family', 'personal story', 'community'],
  '09000000': ['labour', 'labor', 'jobs', 'employment', 'wages', 'workers', 'workplace'],
  '10000000': ['lifestyle', 'travel', 'food', 'fashion', 'leisure'],
  '11000000': ['politics', 'government', 'policy', 'election', 'parliament', 'minister', 'regulation'],
  '12000000': ['religion', 'faith', 'belief', 'church', 'islam', 'christian'],
  '13000000': ['science', 'technology', 'ai', 'artificial intelligence', 'research', 'software', 'space', 'biotech', 'cybersecurity', 'cyber security', 'computer security', 'model security', 'llm security', 'adversarial machine learning'],
  '14000000': ['society', 'migration', 'demographic', 'inequality', 'social'],
  '15000000': ['sport', 'football', 'tennis', 'cricket', 'rugby', 'athletics'],
  '16000000': ['war', 'conflict', 'military', 'peace', 'security', 'ceasefire'],
  '17000000': ['weather', 'forecast', 'storm', 'temperature']
};

function rankTopLevelTopics(text: string) {
  const lower = text.toLowerCase();
  return IPTC_TOPICS
    .map((topic) => ({
      ...topic,
      score: (TOPIC_KEYWORDS[topic.qcode] || []).reduce(
        (sum, term) => sum + (lower.includes(term) ? 1 : 0),
        0
      )
    }))
    .sort((a, b) => b.score - a.score);
}

function classificationCandidates(text: string) {
  const rankedRoots = rankTopLevelTopics(text);
  const roots = rankedRoots
    .filter((topic) => topic.score > 0)
    .slice(0, 4)
    .map((topic) => topic.qcode);

  const branchCandidates = iptcCandidateTopicsForText(text, roots, 180);
  const globalCandidates = iptcCandidateTopicsForText(text, [], 80);
  const combined = new Map<string, (typeof branchCandidates)[number]>();
  for (const topic of [...branchCandidates, ...globalCandidates]) combined.set(topic.qcode, topic);
  return Array.from(combined.values()).slice(0, 220);
}

function fallbackTopic(text: string) {
  const lower = text.toLowerCase();
  const rankedRoots = rankTopLevelTopics(text);
  const broadPrimary = rankedRoots[0]?.score
    ? rankedRoots[0]
    : IPTC_TOPICS.find((topic) => topic.qcode === '01000000')!;
  const candidates = classificationCandidates(text);

  const specificByLabel = candidates
    .filter((topic) => topic.depth > 1 && topic.label.length >= 4)
    .filter((topic) => lower.includes(topic.label.toLowerCase()));

  const specificByAtlusAlias = ATLUS_SUBTOPICS
    .filter((topic) => [topic.label, ...(topic.aliases || [])]
      .some((alias) => lower.includes(alias.toLowerCase())))
    .map((topic) => iptcQcodeForAtlusSubtopic(topic))
    .filter(Boolean)
    .map((qcode) => candidates.find((topic) => topic.qcode === qcode))
    .filter(Boolean);

  const specific = Array.from(new Map(
    [...specificByAtlusAlias, ...specificByLabel]
      .filter(Boolean)
      .map((topic: any) => [topic.qcode, topic])
  ).values())
    .sort((a: any, b: any) => b.depth - a.depth || b.label.length - a.label.length);

  const primary = (specific[0] as any) || broadPrimary;
  const secondarySpecific = specific
    .filter((topic: any) => topic.qcode !== primary.qcode)
    .slice(0, 3);
  const secondary = secondarySpecific.length
    ? secondarySpecific
    : rankedRoots
      .filter((topic) => topic.score > 0 && topic.qcode !== primary.qcode)
      .slice(0, 3);

  return { primary, secondary };
}

function fallbackTags(text: string) {
  const lower = text.toLowerCase();
  return ATLUS_SUBTOPICS
    .map((topic) => ({
      topic,
      score: [topic.label, ...(topic.aliases || [])].reduce((sum, alias) => sum + (lower.includes(alias.toLowerCase()) ? 1 : 0), 0)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item) => item.topic.label);
}

function fallbackGeographies(text: string) {
  return extractGeographies(text).slice(0, 6);
}

function fallbackClassification(title: string, subtitle: string | null | undefined, body: string, publishedAt?: string | null): Omit<ProcessedArticle, 'embedding' | 'concept_embedding'> {
  const combined = [title, subtitle || '', body].join(' ');
  const contentDepth = detectContentDepth(body, subtitle);
  const articleType = articleTypeFromText(combined);
  const topic = fallbackTopic(combined);
  const qualityComponents = qualityHeuristics(combined, contentDepth);
  const complexityLevel = body.length > 7000 ? 'advanced' : body.length > 2500 ? 'intermediate' : 'introductory';
  return {
    primary_topic: topic.primary.uiLabel,
    secondary_topics: topic.secondary.map((item) => item.uiLabel),
    primary_iptc_qcode: topic.primary.qcode,
    secondary_iptc_qcodes: topic.secondary.map((item) => item.qcode),
    atlus_tags: fallbackTags(combined),
    concepts: Array.from(new Set([
      ...fallbackTags(combined),
      topic.primary.uiLabel,
      ...topic.secondary.map((item) => item.uiLabel)
    ])).slice(0, 8),
    geographies: fallbackGeographies(combined),
    entities: [],
    article_type: articleType,
    complexity_level: complexityLevel,
    content_depth: contentDepth,
    processing_confidence: contentDepth === 'full_text' ? 0.58 : contentDepth === 'short_excerpt' ? 0.46 : 0.34,
    quality_components: qualityComponents,
    quality_score: overallQuality(qualityComponents),
    evergreen_score: evergreenTypePrior(articleType),
    freshness_score: scoreFreshness(publishedAt, articleType),
    reading_time_minutes: roughReadingTime(body, contentDepth),
    summary: body && contentDepth !== 'metadata_only' ? body.slice(0, 360) : [title, subtitle].filter(Boolean).join(' — ').slice(0, 360)
  };
}

export async function processArticle(input: {
  title: string;
  body?: string | null;
  subtitle?: string | null;
  publishedAt?: string | null;
}): Promise<ProcessedArticle> {
  const body = input.body || input.subtitle || input.title;
  const fallback = fallbackClassification(input.title, input.subtitle, body, input.publishedAt);

  if (!process.env.OPENAI_API_KEY) return { ...fallback, embedding: ZERO_VECTOR, concept_embedding: ZERO_VECTOR };

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const combinedForTopic = [input.title, input.subtitle || '', body].join(' ');
  const candidateTopics = classificationCandidates(combinedForTopic);
  const allowedTopics = candidateTopics
    .map((topic) => [
      topic.qcode,
      `depth=${topic.depth}`,
      `parent=${topic.parentQcode || '-'}`,
      topic.label,
      topic.definition ? `— ${topic.definition.slice(0, 180)}` : ''
    ].filter(Boolean).join(' | '))
    .join('\n');
  const suggestedTags = ATLUS_SUBTOPICS.map((topic) => topic.label).join(', ');

  const classificationPrompt = `Classify this article for Atlus, a personalised reading recommender.

Choose the MOST SPECIFIC applicable IPTC Media Topic from this candidate vocabulary as primary_iptc_qcode, and up to 3 additional materially relevant topics as secondary_iptc_qcodes.

Parent and depth are supplied so you can prefer a precise child when the article is genuinely about that child. Do not choose a narrow topic merely because it is briefly mentioned.

${allowedTopics}

Return strict JSON with:
- primary_iptc_qcode: exact QCode string from the list above, WITHOUT the "medtop:" prefix
- secondary_iptc_qcodes: exact QCode strings from the list above, WITHOUT the "medtop:" prefix
- atlus_tags: string[] (prefer these when applicable: ${suggestedTags}; otherwise concise product-specific concepts are allowed)
- geographies: string[] of specific countries materially discussed. Use a broad region only when the article genuinely discusses that region as a whole. Use canonical English names (for example "Italy", not "Italian"). Do not add "Europe" merely because Italy is in Europe; Atlus resolves the hierarchy itself.
- entities: string[] of important named people, organisations, policies, products or events
- concepts: string[] of 3 to 8 concise semantic concepts that capture what the article is substantially about. Resolve ambiguous terms from context; prefer specific concepts such as "AI system security" or "Israeli intelligence agencies" over generic words such as "security" or "intelligence".
- article_type: one of "news", "breaking_news", "live", "analysis", "explainer", "essay", "investigation", "interview", "review"
- complexity_level: "introductory" | "intermediate" | "advanced"
- quality_components: {"depth":0..1,"substance":0..1,"clarity":0..1,"originality":0..1}
- evergreen_score: 0..1, meaning how useful the piece remains weeks/months later
- summary: <= 90 words, factual and useful for semantic retrieval

Prefer the deepest accurate IPTC topic. Do not score freshness. Do not reward a sensational headline. Judge quality from the information available and be conservative when only metadata/excerpts are available.

Title: ${input.title}
Subtitle: ${input.subtitle ?? ''}
Published at: ${input.publishedAt ?? 'unknown'}
Available content: ${body.slice(0, 9000)}`;

  let classified = { ...fallback };
  let llmSucceeded = false;

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_CLASSIFICATION_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Return valid JSON only. Never invent an IPTC QCode outside the supplied candidate vocabulary. Prefer the deepest accurate topic.' },
        { role: 'user', content: classificationPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1
    });
    const raw = completion.choices[0]?.message?.content;
    if (raw) {
      const parsed = JSON.parse(raw);
      const allowedQcodes = new Set(candidateTopics.map((topic) => topic.qcode));
      const normaliseQcode = (value: unknown) => String(value || '').replace(/^medtop:/, '').trim();
      const returnedPrimaryQcode = normaliseQcode(parsed.primary_iptc_qcode);
      const primaryQcode = allowedQcodes.has(returnedPrimaryQcode)
        ? returnedPrimaryQcode
        : fallback.primary_iptc_qcode;
      const secondaryQcodes = Array.isArray(parsed.secondary_iptc_qcodes)
        ? parsed.secondary_iptc_qcodes
          .map(normaliseQcode)
          .filter((qcode: string) => allowedQcodes.has(qcode) && qcode !== primaryQcode)
          .slice(0, 3)
        : fallback.secondary_iptc_qcodes;
      const parsedQuality = parsed.quality_components || {};
      const llmComponents: QualityComponents = {
        depth: clampScore(parsedQuality.depth, fallback.quality_components.depth),
        substance: clampScore(parsedQuality.substance, fallback.quality_components.substance),
        clarity: clampScore(parsedQuality.clarity, fallback.quality_components.clarity),
        originality: clampScore(parsedQuality.originality, fallback.quality_components.originality)
      };
      const qualityComponents: QualityComponents = {
        depth: 0.7 * llmComponents.depth + 0.3 * fallback.quality_components.depth,
        substance: 0.7 * llmComponents.substance + 0.3 * fallback.quality_components.substance,
        clarity: 0.7 * llmComponents.clarity + 0.3 * fallback.quality_components.clarity,
        originality: 0.7 * llmComponents.originality + 0.3 * fallback.quality_components.originality
      };
      const articleType = String(parsed.article_type || fallback.article_type);
      classified = {
        ...fallback,
        primary_iptc_qcode: primaryQcode,
        primary_topic: iptcLabel(primaryQcode) || fallback.primary_topic,
        secondary_iptc_qcodes: secondaryQcodes,
        secondary_topics: secondaryQcodes.map((qcode: string) => iptcLabel(qcode)).filter(Boolean) as string[],
        atlus_tags: Array.isArray(parsed.atlus_tags)
          ? parsed.atlus_tags.map(String).map((s: string) => s.trim()).filter(Boolean).slice(0, 8)
          : fallback.atlus_tags,
        geographies: Array.isArray(parsed.geographies)
          ? normaliseArticleGeographies(
            parsed.geographies.map(String)
          ).slice(0, 6)
          : fallback.geographies,
        entities: Array.isArray(parsed.entities)
          ? parsed.entities.map(String).map((s: string) => s.trim()).filter(Boolean).slice(0, 15)
          : [],
        concepts: Array.isArray(parsed.concepts)
          ? Array.from(new Set<string>(parsed.concepts.map(String).map((s: string) => s.trim()).filter(Boolean))).slice(0, 8)
          : fallback.concepts,
        article_type: articleType,
        complexity_level: ['introductory', 'intermediate', 'advanced'].includes(String(parsed.complexity_level))
          ? String(parsed.complexity_level)
          : fallback.complexity_level,
        quality_components: qualityComponents,
        quality_score: overallQuality(qualityComponents),
        evergreen_score: clamp(0.7 * clampScore(parsed.evergreen_score, fallback.evergreen_score) + 0.3 * evergreenTypePrior(articleType)),
        freshness_score: scoreFreshness(input.publishedAt, articleType),
        summary: String(parsed.summary || fallback.summary).slice(0, 700),
        processing_confidence: fallback.content_depth === 'full_text'
          ? 0.9
          : fallback.content_depth === 'short_excerpt'
            ? 0.76
            : 0.62
      };
      llmSucceeded = true;
    }
  } catch (error) {
    console.error('Article classification failed; using deterministic fallback:', error);
  }

  let embedding = ZERO_VECTOR;
  let conceptEmbedding = ZERO_VECTOR;
  let embeddingSucceeded = false;
  try {
    const embeddingInput = [
      input.title,
      input.subtitle,
      classified.summary,
      `IPTC topic: ${classified.primary_topic}`,
      classified.atlus_tags.length ? `Tags: ${classified.atlus_tags.join(', ')}` : '',
      classified.entities.length ? `Entities: ${classified.entities.join(', ')}` : '',
      body.slice(0, 7000)
    ].filter(Boolean).join('\n\n');

    const conceptInput = classified.concepts.length
      ? classified.concepts.join('\n')
      : [classified.primary_topic, ...classified.secondary_topics, ...classified.atlus_tags].filter(Boolean).join('\n');

    const response = await openai.embeddings.create({
      model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      input: [embeddingInput, conceptInput]
    });
    embedding = response.data[0]?.embedding ?? ZERO_VECTOR;
    conceptEmbedding = response.data[1]?.embedding ?? ZERO_VECTOR;
    embeddingSucceeded = embedding.some((value) => value !== 0) && conceptEmbedding.some((value) => value !== 0);
  } catch (error) {
    console.error('Article embedding failed. Using zero vectors:', error);
  }

  classified.processing_confidence = clamp(classified.processing_confidence * (embeddingSucceeded ? 1 : 0.75) * (llmSucceeded ? 1 : 0.85));
  return { ...classified, embedding, concept_embedding: conceptEmbedding };
}

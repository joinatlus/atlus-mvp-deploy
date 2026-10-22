import OpenAI from 'openai';
import type { ArticleForRanking, RecommendationFeatureSnapshot, SlotType } from '@/lib/types';

type ExplanationInput = {
  article: ArticleForRanking;
  slot: SlotType;
  features: RecommendationFeatureSnapshot;
  reasonCodes: string[];
  fallback: string;
  summary?: string | null;
};

function cleanOneSentence(value: unknown) {
  if (typeof value !== 'string') return null;
  const cleaned = value
    .replace(/^why (?:this one|atlus chose it)\s*:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return null;
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length < 7 || words.length > 26) return null;
  if (/\b(score|embedding|algorithm|rank(?:ing)?|cosine|model score)\b/i.test(cleaned)) return null;
  return cleaned;
}

export async function improveRecommendationExplanations(items: ExplanationInput[]) {
  const fallback = new Map(items.map((item) => [item.article.id, item.fallback]));
  if (!items.length || !process.env.OPENAI_API_KEY) return fallback;

  const payload = items.map((item) => {
    const concepts = (item.article.concepts || []).slice(0, 8);

    const preferenceFit = Number(item.features.preferenceFit || 0);
    const goalFit = Number(item.features.goalFit || 0);

    const discoveryAnchor =
      item.slot === 'discovery'
        ? preferenceFit >= goalFit
          ? item.features.matchedPreference || item.features.matchedGoal || null
          : item.features.matchedGoal || item.features.matchedPreference || null
        : null;

    return {
      article_id: item.article.id,
      slot: item.slot,
      title: item.article.title,
      subtitle: item.article.subtitle,
      publisher: item.article.publisher_name,
      summary: item.summary || null,
      concepts,
      primary_topic: item.article.primary_topic,
      article_type: item.article.article_type,
      complexity_level: item.article.complexity_level,

      matched_interest: item.features.matchedPreference || null,
      matched_goal: item.features.matchedGoal || null,
      goal_knowledge_level: item.features.goalKnowledgeLevel ?? null,
      goal_learning_mode: item.features.goalLearningMode || null,

      discovery_anchor: discoveryAnchor,
      discovery_article_topic:
        item.slot === 'discovery'
          ? item.article.primary_topic || concepts[0] || null
          : null,

      recommendation_reasons: item.reasonCodes
    };
  });

  const prompt = `Locale: en-GB.
Write Atlus's short "Why this one" explanation for each already-selected article.

These explanations do NOT decide what gets recommended.The ranking has already happened.Your job is only to explain the real selection reason clearly, specifically and naturally.

A good "Why this one" is not a summary.

A summary says what the article discusses.
    A "Why this one" explains what this particular reader stands to gain from reading it.

If your draft could plausibly serve as the article's subtitle or generic description, rewrite it.

GENERAL RULES:
  - Exactly one sentence per article.
- Aim for 12 - 22 words and never exceed 26 words.
- Be specific about what the article covers and why that is useful to this reader.
- Ground every claim only in the supplied title, subtitle, summary, concepts and recommendation signals.
- Never invent article content, arguments, conclusions, facts or user preferences.
- Do not simply restate the headline.
- Do not mention "the algorithm", "embedding", "score", "matches your profile", "Core", "Stretch" or "Discovery".
- Avoid promotional language such as "perfect", "must-read", "you'll love", "fascinating" or "essential".
- For political, legal or contested subjects, explain relevance or learning value neutrally.Do not tell the reader what view to hold.
- Avoid generic or formulaic language.
- Do not merely say that a connection exists.State what the substantive connection actually is.
- Prefer explaining the mechanism, theme, concept, institution, historical link, artistic technique, case study or intellectual bridge that makes the article useful.
- If the supplied information is too thin to support a specific connection, stay conservative rather than inventing one.
- Vary sentence structure across articles.

NEVER USE PHRASES SUCH AS:
  - "relevant to your interests"
    - "connects to your interest"
    - "aligns with your goals"
    - "offers a unique perspective"
    - "explores the intersection of"
    - "starting from..."
    - "given your interest in..."
    - "this connects..."
    - "this links..."

  CORE:
  - Explain why this article is especially pertinent to something the reader already cares about.
- Identify the specific angle, development, mechanism or case that makes it worth their attention.
- Do not merely say that it matches an interest.
- Answer: "Why is this especially relevant to something I already care about?"

  STRETCH:
  - Do not merely describe what the article is about.
- Explain what the reader is likely to understand better after reading it, specifically in relation to their learning goal.
- Focus on the learning payoff: the concept, mechanism, distinction, case study or perspective the article can add.
- Make the connection to the exact learning goal concrete when the supplied information supports it.
- Do not simply mention the learning goal; explain the concrete progress this article can support.
- Take the supplied knowledge level and learning mode into account where relevant.
- Answer: "How does reading this move me forward on what I want to learn?"

  DISCOVERY:
  - Do not merely summarise the article.
- Explain the unfamiliar lens, subject or perspective that makes the article a worthwhile departure from the reader's normal reading.
    - Use discovery_anchor as the familiar starting point when supplied.
- Identify the less - familiar subject, lens or perspective using the supplied article information.
  - Explain how that unfamiliar angle extends, reframes, complicates or broadens something the reader already cares about.
- Integrate the familiar bridge naturally into the sentence rather than mechanically naming the user's interest category at the start.
    - Do not use a repeated template such as "Starting from X..."
      - If the explanation could be shown unchanged to a random reader, it is not personalised enough.
- Answer: "What does this expose me to that I probably would not have chosen myself, and why is that useful?"

For Discovery, the underlying structure should usually be:
familiar anchor -> unfamiliar lens -> useful intellectual payoff

Do not copy that structure mechanically into the wording.

Return JSON only in exactly this shape:
  { "explanations": [{ "article_id": "...", "text": "..." }] }

  Articles:
${JSON.stringify(payload, null, 2)}`;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_EXPLANATION_MODEL || process.env.OPENAI_CLASSIFICATION_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You write concise, factual recommendation rationales. Return valid JSON only and never invent unsupported content.'
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 1
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.explanations)) return fallback;

    const allowedIds = new Set(items.map((item) => item.article.id));
    for (const row of parsed.explanations) {
      const articleId = String(row?.article_id || '');
      if (!allowedIds.has(articleId)) continue;
      const text = cleanOneSentence(row?.text);
      if (text) fallback.set(articleId, text);
    }
  } catch (error) {
    console.warn('Atlus explanation generation failed; using deterministic explanations.', error);
  }

  return fallback;
}

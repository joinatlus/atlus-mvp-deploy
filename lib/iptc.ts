import generated from '@/lib/iptc-media-topics.generated.json';

export type IptcTopic = {
  qcode: string;
  label: string;
  uiLabel: string;
  definition: string;
  parentQcode: string | null;
  topLevelQcode: string;
  depth: number;
};

type GeneratedTopic = {
  qcode: string;
  label: string;
  definition?: string;
  parentQcode?: string | null;
  topLevelQcode: string;
  depth: number;
};

const TOP_LEVEL_UI_LABELS: Record<string, string> = {
  '01000000': 'Arts, culture & media',
  '02000000': 'Crime, law & justice',
  '03000000': 'Disasters & emergencies',
  '04000000': 'Economics & business',
  '05000000': 'Education',
  '06000000': 'Environment & climate',
  '07000000': 'Health',
  '08000000': 'Human interest',
  '09000000': 'Work & labour',
  '10000000': 'Lifestyle & leisure',
  '11000000': 'Politics',
  '12000000': 'Religion & belief',
  '13000000': 'Science & technology',
  '14000000': 'Society',
  '15000000': 'Sport',
  '16000000': 'Conflict, war & peace',
  '17000000': 'Weather'
};

function cleanQcode(value?: string | null) {
  return String(value || '').replace(/^medtop:/, '').trim();
}

function normalise(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export const IPTC_MEDIA_TOPICS: IptcTopic[] = (
  generated as { topics: GeneratedTopic[] }
).topics
  .map((topic) => ({
    qcode: cleanQcode(topic.qcode),
    label: topic.label,
    uiLabel: TOP_LEVEL_UI_LABELS[cleanQcode(topic.qcode)] || topic.label,
    definition: topic.definition || '',
    parentQcode: topic.parentQcode ? cleanQcode(topic.parentQcode) : null,
    topLevelQcode: cleanQcode(topic.topLevelQcode),
    depth: Number(topic.depth || 1)
  }))
  .filter((topic) => topic.qcode && topic.label);

const IPTC_BY_QCODE = new Map(IPTC_MEDIA_TOPICS.map((topic) => [topic.qcode, topic]));

export const IPTC_TOPICS: IptcTopic[] = IPTC_MEDIA_TOPICS
  .filter((topic) => topic.depth === 1)
  .sort((a, b) => a.qcode.localeCompare(b.qcode));

export type AtlusSubtopic = {
  slug: string;
  label: string;
  parentQcode: string;
  aliases?: string[];
};

export const ATLUS_SUBTOPICS: AtlusSubtopic[] = [
  { slug: 'ai', label: 'Artificial intelligence', parentQcode: '13000000', aliases: ['AI', 'machine learning', 'LLM', 'generative AI'] },
  { slug: 'tech-policy', label: 'Technology policy', parentQcode: '13000000', aliases: ['technology regulation', 'tech regulation'] },
  { slug: 'space', label: 'Space & astronomy', parentQcode: '13000000', aliases: ['space', 'astronomy'] },
  { slug: 'biotech', label: 'Biotech & genetics', parentQcode: '13000000', aliases: ['biotechnology', 'genetics'] },
  { slug: 'scientific-research', label: 'Scientific research', parentQcode: '13000000', aliases: ['research', 'science'] },
  { slug: 'consumer-tech', label: 'Consumer technology', parentQcode: '13000000', aliases: ['gadgets', 'consumer tech'] },

  { slug: 'macroeconomics', label: 'Macroeconomics', parentQcode: '04000000', aliases: ['inflation', 'growth', 'monetary policy'] },
  { slug: 'markets-finance', label: 'Markets & finance', parentQcode: '04000000', aliases: ['markets', 'finance', 'stocks'] },
  { slug: 'energy-resources', label: 'Energy & resources', parentQcode: '04000000', aliases: ['energy', 'resources'] },
  { slug: 'business-startups', label: 'Business & startups', parentQcode: '04000000', aliases: ['startups', 'business'] },
  { slug: 'trade-globalisation', label: 'Trade & globalisation', parentQcode: '04000000', aliases: ['trade', 'globalisation', 'globalization'] },
  { slug: 'housing-costs', label: 'Housing & cost of living', parentQcode: '04000000', aliases: ['housing', 'cost of living'] },

  { slug: 'government-policy', label: 'Government & policy', parentQcode: '11000000', aliases: ['government', 'public policy'] },
  { slug: 'international-relations', label: 'International relations', parentQcode: '11000000', aliases: ['foreign policy', 'geopolitics'] },
  { slug: 'elections', label: 'Elections', parentQcode: '11000000', aliases: ['election', 'voting'] },
  { slug: 'political-institutions', label: 'Political institutions', parentQcode: '11000000', aliases: ['institutions', 'parliament', 'civil service'] },
  { slug: 'technology-regulation', label: 'Technology regulation', parentQcode: '11000000', aliases: ['AI regulation', 'tech regulation'] },
  { slug: 'energy-policy', label: 'Energy policy', parentQcode: '11000000', aliases: ['energy policy'] },

  { slug: 'climate-change', label: 'Climate change', parentQcode: '06000000', aliases: ['climate', 'global warming'] },
  { slug: 'nature-ecosystems', label: 'Nature & ecosystems', parentQcode: '06000000', aliases: ['nature', 'biodiversity', 'ecosystem'] },
  { slug: 'clean-energy', label: 'Clean energy', parentQcode: '06000000', aliases: ['renewables', 'solar', 'wind', 'clean energy'] },

  { slug: 'medical-research', label: 'Medical research', parentQcode: '07000000', aliases: ['medical research', 'clinical research'] },
  { slug: 'public-health', label: 'Public health', parentQcode: '07000000', aliases: ['public health'] },
  { slug: 'mental-health', label: 'Mental health', parentQcode: '07000000', aliases: ['mental health'] },

  { slug: 'news-media', label: 'News media & journalism', parentQcode: '01000000', aliases: ['journalism', 'news media'] },
  { slug: 'books-literature', label: 'Books & literature', parentQcode: '01000000', aliases: ['books', 'literature'] },
  { slug: 'history-ideas', label: 'History & ideas', parentQcode: '01000000', aliases: ['history', 'ideas'] },
  { slug: 'film-tv', label: 'Film & television', parentQcode: '01000000', aliases: ['film', 'television', 'TV'] },

  { slug: 'wages-employment', label: 'Wages & employment', parentQcode: '09000000', aliases: ['wages', 'employment', 'jobs'] },
  { slug: 'future-of-work', label: 'Future of work', parentQcode: '09000000', aliases: ['future of work', 'automation and jobs'] },

  { slug: 'demographics-migration', label: 'Demographics & migration', parentQcode: '14000000', aliases: ['demographics', 'migration', 'immigration'] },
  { slug: 'inequality', label: 'Inequality', parentQcode: '14000000', aliases: ['inequality', 'poverty'] },
  { slug: 'social-change', label: 'Social change', parentQcode: '14000000', aliases: ['social change', 'social norms'] },

  { slug: 'courts-law', label: 'Courts & law', parentQcode: '02000000', aliases: ['court', 'law', 'legal'] },
  { slug: 'crime-justice', label: 'Crime & criminal justice', parentQcode: '02000000', aliases: ['crime', 'criminal justice'] },

  { slug: 'schools', label: 'Schools', parentQcode: '05000000', aliases: ['school', 'schools'] },
  { slug: 'universities', label: 'Universities & research education', parentQcode: '05000000', aliases: ['university', 'higher education'] },

  { slug: 'conflict-security', label: 'Conflict & security', parentQcode: '16000000', aliases: ['war', 'conflict', 'security'] },
  { slug: 'peace-diplomacy', label: 'Peace & diplomacy', parentQcode: '16000000', aliases: ['peace', 'diplomacy'] }
];

export const ONBOARDING_SOURCES = [
  'BBC News',
  'Sky News',
  'The Guardian',
  'Daily Mail / MailOnline',
  'The Times',
  'The Telegraph',
  'Financial Times',
  'The Economist',
  'The Sun',
  'ITV News',
  'New York Times',
  'CNN',
  'Substack newsletters',
  'Podcasts',
  'Reddit',
  'YouTube'
];

export type LearningGoalSuggestion = {
  label: string;
  subtopicSlugs?: string[];
  broadQcodes?: string[];
};

export const LEARNING_GOAL_SUGGESTIONS: LearningGoalSuggestion[] = [
  { label: 'Understand how modern AI systems actually work', subtopicSlugs: ['ai'] },
  { label: 'Understand AI safety, security and misuse', subtopicSlugs: ['ai'] },
  { label: 'Understand how AI and technology regulation is developing', subtopicSlugs: ['ai', 'tech-policy', 'technology-regulation'] },
  { label: 'Understand how governments regulate powerful technologies', subtopicSlugs: ['tech-policy', 'technology-regulation'] },
  { label: 'Understand the science and economics of the modern space industry', subtopicSlugs: ['space'] },
  { label: 'Understand how gene editing and modern biotechnology work', subtopicSlugs: ['biotech'] },
  { label: 'Understand how scientific evidence is produced and challenged', subtopicSlugs: ['scientific-research'] },
  { label: 'Understand the technologies shaping everyday digital life', subtopicSlugs: ['consumer-tech'] },

  { label: 'Build a proper intuition for inflation, growth and monetary policy', subtopicSlugs: ['macroeconomics'] },
  { label: 'Understand how financial markets actually work', subtopicSlugs: ['markets-finance'] },
  { label: 'Understand energy markets, security and natural resources', subtopicSlugs: ['energy-resources'] },
  { label: 'Understand how companies scale, compete and fail', subtopicSlugs: ['business-startups'] },
  { label: 'Understand trade, supply chains and globalisation', subtopicSlugs: ['trade-globalisation'] },
  { label: 'Understand why housing is expensive and what policies change it', subtopicSlugs: ['housing-costs'] },

  { label: 'Understand how public policy is made and implemented', subtopicSlugs: ['government-policy'] },
  { label: 'Understand the forces shaping geopolitics and international relations', subtopicSlugs: ['international-relations'] },
  { label: 'Understand how electoral systems and campaigns shape outcomes', subtopicSlugs: ['elections'] },
  { label: 'Understand how government institutions actually work', subtopicSlugs: ['political-institutions', 'government-policy'] },
  { label: 'Understand the trade-offs in energy policy', subtopicSlugs: ['energy-policy'] },

  { label: 'Understand climate science and the policy trade-offs around it', subtopicSlugs: ['climate-change'] },
  { label: 'Understand biodiversity loss and ecosystem change', subtopicSlugs: ['nature-ecosystems'] },
  { label: 'Understand how electricity grids and clean-energy systems work', subtopicSlugs: ['clean-energy', 'energy-resources', 'energy-policy'] },

  { label: 'Understand how medical evidence and clinical research work', subtopicSlugs: ['medical-research'] },
  { label: 'Understand public-health policy and evidence', subtopicSlugs: ['public-health'] },
  { label: 'Understand what research really says about mental health', subtopicSlugs: ['mental-health'] },

  { label: 'Understand how modern news media and information ecosystems work', subtopicSlugs: ['news-media'] },
  { label: 'Read more deeply about literature and literary ideas', subtopicSlugs: ['books-literature'] },
  { label: 'Build a stronger understanding of major historical ideas and periods', subtopicSlugs: ['history-ideas'] },
  { label: 'Understand film and television as industries and art forms', subtopicSlugs: ['film-tv'] },

  { label: 'Understand wages, labour markets and employment', subtopicSlugs: ['wages-employment'] },
  { label: 'Understand how automation and AI are changing work', subtopicSlugs: ['future-of-work'] },
  { label: 'Understand demographic change and migration', subtopicSlugs: ['demographics-migration'] },
  { label: 'Understand the causes and consequences of inequality', subtopicSlugs: ['inequality'] },
  { label: 'Understand how social norms and institutions change', subtopicSlugs: ['social-change'] },

  { label: 'Understand how courts and legal systems shape public life', subtopicSlugs: ['courts-law'] },
  { label: 'Understand crime, policing and criminal-justice policy', subtopicSlugs: ['crime-justice'] },
  { label: 'Understand how school systems and education policy work', subtopicSlugs: ['schools'] },
  { label: 'Understand universities, research funding and higher education', subtopicSlugs: ['universities'] },
  { label: 'Understand modern conflict, security and military power', subtopicSlugs: ['conflict-security'] },
  { label: 'Understand diplomacy, peace processes and conflict resolution', subtopicSlugs: ['peace-diplomacy'] },

  { label: 'Understand the ideas shaping culture and public debate', broadQcodes: ['01000000'] },
  { label: 'Understand how law, courts and justice systems work', broadQcodes: ['02000000'] },
  { label: 'Understand how societies prepare for disasters and emergencies', broadQcodes: ['03000000'] },
  { label: 'Build a stronger understanding of economics and business', broadQcodes: ['04000000'] },
  { label: 'Understand how education systems and policy work', broadQcodes: ['05000000'] },
  { label: 'Understand climate, energy and environmental change', broadQcodes: ['06000000'] },
  { label: 'Understand health research, systems and public health', broadQcodes: ['07000000'] },
  { label: 'Understand the human stories behind social change', broadQcodes: ['08000000'] },
  { label: 'Understand labour markets and the future of work', broadQcodes: ['09000000'] },
  { label: 'Understand the forces shaping lifestyle and leisure', broadQcodes: ['10000000'] },
  { label: 'Understand how government, policy and political institutions work', broadQcodes: ['11000000'] },
  { label: 'Understand religion, belief and their role in society', broadQcodes: ['12000000'] },
  { label: 'Understand important developments in science and technology', broadQcodes: ['13000000'] },
  { label: 'Understand the forces driving social and demographic change', broadQcodes: ['14000000'] },
  { label: 'Understand the economics, culture and institutions around sport', broadQcodes: ['15000000'] },
  { label: 'Understand conflict, security and international power', broadQcodes: ['16000000'] },
  { label: 'Understand weather, forecasting and climate extremes', broadQcodes: ['17000000'] }
];

export function goalSuggestionsForSelection(
  broadQcodes: string[],
  subtopicSlugs: string[],
  limit = 10
) {
  const broad = new Set(broadQcodes);
  const subtopics = new Set(subtopicSlugs);
  const exact = LEARNING_GOAL_SUGGESTIONS.filter((suggestion) =>
    suggestion.subtopicSlugs?.some((slug) => subtopics.has(slug))
  );
  const fallbacks = LEARNING_GOAL_SUGGESTIONS.filter((suggestion) =>
    !suggestion.subtopicSlugs?.some((slug) => subtopics.has(slug)) &&
    suggestion.broadQcodes?.some((qcode) => broad.has(qcode))
  );
  return Array.from(new Set([...exact, ...fallbacks].map((suggestion) => suggestion.label))).slice(0, limit);
}

export const GOAL_SUGGESTIONS = LEARNING_GOAL_SUGGESTIONS
  .filter((suggestion) => suggestion.broadQcodes)
  .slice(0, 6)
  .map((suggestion) => suggestion.label);

export const GEOGRAPHIES = [
  'United Kingdom',
  'Europe',
  'United States',
  'China',
  'Middle East',
  'South Asia',
  'East Asia',
  'Africa',
  'Latin America',
  'Global'
];

export function iptcTopic(qcode?: string | null) {
  return IPTC_BY_QCODE.get(cleanQcode(qcode)) || null;
}

export function iptcLabel(qcode?: string | null) {
  return iptcTopic(qcode)?.uiLabel || null;
}

export function iptcAncestors(qcode?: string | null, includeSelf = false) {
  const result: IptcTopic[] = [];
  const seen = new Set<string>();
  let current = iptcTopic(qcode);

  if (!includeSelf) {
    current = current?.parentQcode ? iptcTopic(current.parentQcode) : null;
  }

  while (current && !seen.has(current.qcode)) {
    seen.add(current.qcode);
    result.push(current);
    current = current.parentQcode ? iptcTopic(current.parentQcode) : null;
  }
  return result;
}

export function isIptcSameOrDescendant(qcode?: string | null, ancestorQcode?: string | null) {
  const child = cleanQcode(qcode);
  const ancestor = cleanQcode(ancestorQcode);
  if (!child || !ancestor) return false;
  if (child === ancestor) return true;
  return iptcAncestors(child).some((topic) => topic.qcode === ancestor);
}

export function iptcHierarchySimilarity(a?: string | null, b?: string | null) {
  const left = iptcTopic(a);
  const right = iptcTopic(b);
  if (!left || !right) return 0;
  if (left.qcode === right.qcode) return 1;

  if (isIptcSameOrDescendant(right.qcode, left.qcode)) {
    const distance = Math.max(1, right.depth - left.depth);
    return Math.max(0.72, 1 - 0.08 * distance);
  }

  if (isIptcSameOrDescendant(left.qcode, right.qcode)) {
    const distance = Math.max(1, left.depth - right.depth);
    return Math.max(0.55, 0.82 - 0.09 * distance);
  }

  const leftPath = [left, ...iptcAncestors(left.qcode)];
  const rightQcodes = new Set([right.qcode, ...iptcAncestors(right.qcode).map((topic) => topic.qcode)]);
  const common = leftPath.find((topic) => rightQcodes.has(topic.qcode));
  if (!common) return 0;
  if (common.depth >= 3) return 0.5;
  if (common.depth === 2) return 0.38;
  return 0.2;
}

export function iptcTopicsUnder(topLevelQcodes: string[]) {
  const roots = new Set(topLevelQcodes.map(cleanQcode));
  return IPTC_MEDIA_TOPICS.filter((topic) => roots.has(topic.topLevelQcode));
}

export function iptcQcodeForLabel(label?: string | null) {
  if (!label) return null;
  const wanted = normalise(label);
  return IPTC_MEDIA_TOPICS.find((topic) => normalise(topic.label) === wanted)?.qcode || null;
}

export function iptcQcodeForAtlusSubtopic(subtopic: AtlusSubtopic) {
  const names = new Set([subtopic.label, ...(subtopic.aliases || [])].map(normalise));
  return IPTC_MEDIA_TOPICS
    .filter((topic) => isIptcSameOrDescendant(topic.qcode, subtopic.parentQcode))
    .filter((topic) => names.has(normalise(topic.label)))
    .sort((a, b) => b.depth - a.depth)[0]?.qcode || null;
}

function lexicalTopicScore(topic: IptcTopic, text: string, tokens: Set<string>) {
  const label = normalise(topic.label);
  const definition = normalise(topic.definition || '');
  let score = 0;
  if (label && text.includes(label)) score += 10 + topic.depth * 0.3;

  const labelTokens = label.split(/\s+/).filter((word) => word.length > 2);
  const labelHits = labelTokens.filter((word) => tokens.has(word)).length;
  if (labelTokens.length) score += (labelHits / labelTokens.length) * 4;

  const definitionTokens = definition.split(/\s+/).filter((word) => word.length > 4);
  const definitionHits = definitionTokens.filter((word) => tokens.has(word)).length;
  score += Math.min(2, definitionHits * 0.18);
  return score;
}

export function iptcCandidateTopicsForText(
  value: string,
  rootQcodes: string[] = [],
  limit = 220
) {
  const text = normalise(value);
  const tokens = new Set(text.split(/\s+/).filter((word) => word.length > 2));
  const pool = rootQcodes.length ? iptcTopicsUnder(rootQcodes) : IPTC_MEDIA_TOPICS;

  const atlusBoosts = new Set<string>();
  for (const subtopic of ATLUS_SUBTOPICS) {
    const matched = [subtopic.label, ...(subtopic.aliases || [])]
      .some((alias) => text.includes(normalise(alias)));
    if (!matched) continue;
    const official = iptcQcodeForAtlusSubtopic(subtopic);
    if (official) atlusBoosts.add(official);
  }

  const roots = new Set(rootQcodes.map(cleanQcode));
  const ranked = pool
    .map((topic) => ({
      topic,
      score: lexicalTopicScore(topic, text, tokens)
        + (atlusBoosts.has(topic.qcode) ? 12 : 0)
        + (roots.has(topic.qcode) ? 5 : 0)
    }))
    .sort((a, b) => b.score - a.score || b.topic.depth - a.topic.depth);

  const selected = new Map<string, IptcTopic>();

  for (const topic of pool) {
    if (roots.has(topic.qcode) || (topic.depth === 2 && roots.has(topic.topLevelQcode))) {
      selected.set(topic.qcode, topic);
    }
  }

  for (const item of ranked) {
    if (selected.size >= limit) break;
    if (item.score <= 0 && selected.size >= Math.min(80, limit)) break;
    selected.set(item.topic.qcode, item.topic);
  }

  return Array.from(selected.values()).slice(0, limit);
}

export function subtopicBySlug(slug?: string | null) {
  return ATLUS_SUBTOPICS.find((topic) => topic.slug === slug) || null;
}

export function subtopicsForParent(qcode: string) {
  return ATLUS_SUBTOPICS.filter((topic) => topic.parentQcode === qcode);
}

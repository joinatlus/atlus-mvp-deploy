export const ONBOARDING_GEOGRAPHIES = [
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
] as const;

type OnboardingGeography = (typeof ONBOARDING_GEOGRAPHIES)[number];

const REGION_COUNTRIES: Partial<Record<OnboardingGeography, string[]>> = {
  Europe: [
    'Albania', 'Andorra', 'Austria', 'Belarus', 'Belgium',
    'Bosnia and Herzegovina', 'Bulgaria', 'Croatia', 'Cyprus',
    'Czech Republic', 'Denmark', 'Estonia', 'Finland', 'France',
    'Germany', 'Greece', 'Hungary', 'Iceland', 'Ireland', 'Italy',
    'Kosovo', 'Latvia', 'Liechtenstein', 'Lithuania', 'Luxembourg',
    'Malta', 'Moldova', 'Monaco', 'Montenegro', 'Netherlands',
    'North Macedonia', 'Norway', 'Poland', 'Portugal', 'Romania',
    'San Marino', 'Serbia', 'Slovakia', 'Slovenia', 'Spain',
    'Sweden', 'Switzerland', 'Ukraine', 'Vatican City'
  ],
  'Middle East': [
    'Bahrain', 'Iran', 'Iraq', 'Israel', 'Jordan', 'Kuwait',
    'Lebanon', 'Oman', 'Palestine', 'Qatar', 'Saudi Arabia',
    'Syria', 'Turkey', 'United Arab Emirates', 'Yemen'
  ],
  'South Asia': [
    'Afghanistan', 'Bangladesh', 'Bhutan', 'India',
    'Maldives', 'Nepal', 'Pakistan', 'Sri Lanka'
  ],
  'East Asia': [
    'Hong Kong', 'Japan', 'Macau', 'Mongolia',
    'North Korea', 'South Korea', 'Taiwan'
  ],
  Africa: [
    'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso',
    'Burundi', 'Cabo Verde', 'Cameroon', 'Central African Republic',
    'Chad', 'Comoros', 'Democratic Republic of the Congo',
    'Republic of the Congo', "Cote d'Ivoire", 'Djibouti', 'Egypt',
    'Equatorial Guinea', 'Eritrea', 'Eswatini', 'Ethiopia',
    'Gabon', 'Gambia', 'Ghana', 'Guinea', 'Guinea-Bissau',
    'Kenya', 'Lesotho', 'Liberia', 'Libya', 'Madagascar',
    'Malawi', 'Mali', 'Mauritania', 'Mauritius', 'Morocco',
    'Mozambique', 'Namibia', 'Niger', 'Nigeria', 'Rwanda',
    'Sao Tome and Principe', 'Senegal', 'Seychelles',
    'Sierra Leone', 'Somalia', 'South Africa', 'South Sudan',
    'Sudan', 'Tanzania', 'Togo', 'Tunisia', 'Uganda',
    'Zambia', 'Zimbabwe'
  ],
  'Latin America': [
    'Argentina', 'Belize', 'Bolivia', 'Brazil', 'Chile',
    'Colombia', 'Costa Rica', 'Cuba', 'Dominican Republic',
    'Ecuador', 'El Salvador', 'Guatemala', 'Guyana', 'Haiti',
    'Honduras', 'Mexico', 'Nicaragua', 'Panama', 'Paraguay',
    'Peru', 'Suriname', 'Uruguay', 'Venezuela'
  ]
};

const COUNTRY_TO_REGION = new Map<string, OnboardingGeography>();
for (const [region, countries] of Object.entries(REGION_COUNTRIES)) {
  for (const country of countries || []) {
    COUNTRY_TO_REGION.set(country, region as OnboardingGeography);
  }
}

const CANONICAL = new Map<string, string>();
for (const region of ONBOARDING_GEOGRAPHIES) {
  CANONICAL.set(region.toLowerCase(), region);
}
for (const country of COUNTRY_TO_REGION.keys()) {
  CANONICAL.set(country.toLowerCase(), country);
}

const ALIASES: Record<string, string> = {
  uk: 'United Kingdom',
  'u.k.': 'United Kingdom',
  britain: 'United Kingdom',
  'great britain': 'United Kingdom',
  england: 'United Kingdom',
  scotland: 'United Kingdom',
  wales: 'United Kingdom',
  us: 'United States',
  'u.s.': 'United States',
  usa: 'United States',
  'u.s.a.': 'United States',
  america: 'United States',
  eu: 'Europe',
  'european union': 'Europe',
  uae: 'United Arab Emirates',
  'republic of korea': 'South Korea',
  dprk: 'North Korea',
  'ivory coast': "Cote d'Ivoire",
  'dr congo': 'Democratic Republic of the Congo',
  drc: 'Democratic Republic of the Congo',
  'congo-kinshasa': 'Democratic Republic of the Congo',
  'congo-brazzaville': 'Republic of the Congo',
  czechia: 'Czech Republic',
  vatican: 'Vatican City'
};

const EXTRA_SEARCH_TERMS: Record<string, string[]> = {
  'United Kingdom': ['british', 'england', 'english', 'scotland', 'scottish', 'wales', 'welsh'],
  'United States': ['american', 'washington'],
  China: ['chinese', 'beijing'],
  Italy: ['italian'],
  France: ['french'],
  Germany: ['german'],
  Spain: ['spanish'],
  Ireland: ['irish'],
  Japan: ['japanese'],
  India: ['indian'],
  Pakistan: ['pakistani'],
  Brazil: ['brazilian'],
  Mexico: ['mexican'],
  Nigeria: ['nigerian'],
  Israel: ['israeli'],
  Palestine: ['palestinian'],
  Ukraine: ['ukrainian']
};

function normaliseKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function canonicalGeography(value: string): string | null {
  const key = normaliseKey(value);
  if (!key) return null;
  return ALIASES[key] || CANONICAL.get(key) || value.trim();
}

export function parentOnboardingRegion(value: string): OnboardingGeography | null {
  const canonical = canonicalGeography(value);
  if (!canonical) return null;

  if (canonical === 'United Kingdom' || canonical === 'United States' || canonical === 'China') {
    return canonical;
  }

  if ((ONBOARDING_GEOGRAPHIES as readonly string[]).includes(canonical)) {
    return canonical as OnboardingGeography;
  }

  return COUNTRY_TO_REGION.get(canonical) || null;
}

export function normaliseArticleGeographies(values: string[]): string[] {
  return Array.from(
    new Set(values.map(canonicalGeography).filter((value): value is string => Boolean(value)))
  ).slice(0, 8);
}

export function extractGeographies(text: string): string[] {
  const lower = ` ${text.toLowerCase()} `;
  const matches: string[] = [];
  const candidates = ['United Kingdom', 'United States', 'China', ...COUNTRY_TO_REGION.keys()];

  for (const place of candidates) {
    const terms = [place.toLowerCase(), ...(EXTRA_SEARCH_TERMS[place] || [])];
    if (terms.some((term) => lower.includes(term.toLowerCase()))) {
      matches.push(place);
    }
  }

  for (const region of ['Europe', 'Middle East', 'South Asia', 'East Asia', 'Africa', 'Latin America', 'Global']) {
    if (lower.includes(region.toLowerCase())) matches.push(region);
  }

  return normaliseArticleGeographies(matches);
}

function preferenceValue(raw: number | string | undefined) {
  if (typeof raw === 'number') return Math.max(0, Math.min(1, (raw + 1) / 2));
  if (raw === 'more' || raw === 'very_interested') return 1;
  if (raw === 'less' || raw === 'rather_not') return 0.15;
  return 0.55;
}

function inheritedPreference(value: number) {
  return 0.55 + 0.9 * (value - 0.55);
}

export function geographyPreferenceFit(
  articleGeographies: string[] = [],
  preferences: Record<string, number | string> = {}
) {
  if (!articleGeographies.length || !Object.keys(preferences).length) return 0.55;

  const geographies = normaliseArticleGeographies(articleGeographies);
  const collapsed = geographies.filter((geo) => {
    if (!(ONBOARDING_GEOGRAPHIES as readonly string[]).includes(geo)) return true;
    return !geographies.some((other) => other !== geo && parentOnboardingRegion(other) === geo);
  });

  const scores = collapsed
    .filter((geo) => geo !== 'Global')
    .map((geo) => {
      const exact = preferences[geo];
      if (exact !== undefined) return preferenceValue(exact);

      const parent = parentOnboardingRegion(geo);
      const inherited = parent ? preferences[parent] : undefined;
      return inherited === undefined ? 0.55 : inheritedPreference(preferenceValue(inherited));
    });

  let result = scores.length
    ? scores.reduce((sum, value) => sum + value, 0) / scores.length
    : 0.55;

  const globalRaw = preferences.Global;
  if (globalRaw !== undefined) {
    const representedRegions = new Set(
      collapsed
        .filter((geo) => geo !== 'Global')
        .map((geo) => parentOnboardingRegion(geo) || geo)
    );

    if (geographies.includes('Global') || representedRegions.size >= 2) {
      result = 0.82 * result + 0.18 * preferenceValue(globalRaw);
    }
  }

  return Math.max(0, Math.min(1, result));
}

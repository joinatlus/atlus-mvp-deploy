const SITE_URL = "https://joinatlus.com";
const SITE_NAME = "Atlus";
const SOCIAL_IMAGE = `${SITE_URL}/og-atlus.png`;

type PageHeadOptions = {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article" | "profile";
  socialTitle?: string;
  socialDescription?: string;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
};

export function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).toString();
}

/** Shared, crawlable metadata for every public page. */
export function pageHead({
  title,
  description,
  path,
  type = "website",
  socialTitle = title,
  socialDescription = description,
  structuredData,
}: PageHeadOptions) {
  const url = absoluteUrl(path);
  const schemas = structuredData
    ? Array.isArray(structuredData)
      ? structuredData
      : [structuredData]
    : [];
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: socialTitle },
      { property: "og:description", content: socialDescription },
      { property: "og:type", content: type },
      { property: "og:url", content: url },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:locale", content: "en_GB" },
      { property: "og:image", content: SOCIAL_IMAGE },
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:width", content: "2400" },
      { property: "og:image:height", content: "1260" },
      { property: "og:image:alt", content: "Atlus: daily news, personalised for you" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: socialTitle },
      { name: "twitter:description", content: socialDescription },
      { name: "twitter:image", content: SOCIAL_IMAGE },
      { name: "twitter:image:alt", content: "Atlus: daily news, personalised for you" },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: schemas.map((schema) => ({
      type: "application/ld+json",
      children: JSON.stringify(schema),
    })),
  };
}

export const siteStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: SOCIAL_IMAGE,
      email: "sam@joinatlus.com",
      description:
        "Atlus is a small, deliberate daily paper that uses personalisation to widen readers' views.",
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "sam@joinatlus.com",
        availableLanguage: "en-GB",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export function webPageStructuredData(name: string, description: string, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description,
    url: absoluteUrl(path),
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#organization` },
  };
}

import { Link, createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Page } from "@/components/atlus/SiteChrome";
import { pageHead } from "@/lib/seo";

const title = "Why now: the case for a finite news feed | Atlus";
const description =
  "Audiences are turning away from engagement feeds, people are paying to scroll less, and regulators are targeting addictive design. Why Atlus is built for this moment.";
const path = "/why-now";

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Why now: the case for a finite news feed",
  description,
  author: { "@type": "Organization", name: "Atlus" },
  publisher: {
    "@type": "Organization",
    name: "Atlus",
    url: "https://joinatlus.com",
    logo: { "@type": "ImageObject", url: "https://joinatlus.com/og-atlus.png" },
  },
  mainEntityOfPage: "https://joinatlus.com/why-now",
  datePublished: "2026-09-24",
  dateModified: "2026-09-24",
  citation: [
    "https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2026/dnr-executive-summary",
    "https://academic.oup.com/pnasnexus/article/4/3/pgaf062/8052060",
    "https://arxiv.org/abs/2604.11517",
    "https://www.pnas.org/doi/10.1073/pnas.2213114120",
    "https://digital-strategy.ec.europa.eu/en/news/commission-preliminarily-finds-tiktoks-addictive-design-breach-digital-services-act",
  ],
};

export const Route = createFileRoute("/why-now")({
  head: () =>
    pageHead({
      title,
      description,
      path,
      type: "article",
      socialTitle: "The case for a finite news feed",
      socialDescription:
        "The audience is not done with news. It is done with the way the feed delivers it.",
      structuredData: articleSchema,
    }),
  component: WhyNowPage,
});

// Keep editorial data separate from the page structure so figures and wording are easy to review.
const audienceStats = [
  ["37%", "Global trust in news, the lowest since tracking began in 2015."],
  ["42%", "Sometimes or often avoid the news, up from 29% in 2017."],
  ["54%", "Use social and video networks for news, ahead of news sites and apps (51%)."],
  ["52%", "Of 18–24s say social, video or AI is their main source of news."],
] as const;

const attentionProducts = [
  ["Opal", "1M+ daily active users and $10M+ ARR; claims 500M hours of screen time saved."],
  ["one sec", "A PNAS study found app openings fell 57% over six weeks (n = 280)."],
  ["Bloom", "60,000+ physical blockers sold."],
  ["Brick", "A $59 physical blocker with strong growth among 20–35 year olds."],
] as const;

const policyTimeline = [
  [
    "Dec 2025",
    "Australia",
    "Under-16 social-media ban takes effect; penalties can reach AUD 49.5M.",
  ],
  ["Jan 2026", "France", "Lawmakers pass a bill to ban social media for under-15s."],
  [
    "Feb 2026",
    "European Union",
    "The Commission preliminarily finds TikTok's addictive design may breach the Digital Services Act.",
  ],
  ["Feb 2026", "Spain", "Government announces an under-16 social-media plan."],
  [
    "Feb 2026",
    "Portugal",
    "Parental consent required for 13–16s, with fines tied to global revenue.",
  ],
  ["Mar 2026", "Indonesia", "Under-16 restrictions announced for high-risk platforms."],
  [
    "Mar 2026",
    "United States",
    "Los Angeles jury finds Meta and YouTube negligent in a social-media addiction trial.",
  ],
  [
    "Jun–Jul 2026",
    "United Kingdom",
    "Under-16 restrictions, a night-time curfew, and infinite scroll and autoplay proposals move forward.",
  ],
  [
    "2025–26",
    "Across the world",
    "Denmark, Norway, Greece, Poland, Slovenia, Malaysia and Canada advance age-limit proposals.",
  ],
] as const;

function WhyNowPage() {
  return (
    <Page headerVariant="light">
      <article
        className="mx-auto max-w-5xl px-6 pb-24 pt-40 sm:px-10"
        style={{ fontFamily: "var(--font-serif)", color: "var(--color-royal)" }}
      >
        <header className="max-w-4xl">
          <p className="mb-5 text-sm tracking-[0.25em]" style={{ color: "var(--color-amber)" }}>
            WHY NOW
          </p>
          <h1
            className="text-[clamp(2.8rem,7vw,5.6rem)] leading-[0.98] tracking-tight"
            style={{ fontFamily: "var(--font-display)", fontWeight: 800 }}
          >
            The problem isn't the news. It's the feed.
          </h1>
          <p
            className="mt-8 max-w-3xl text-[clamp(1.35rem,3vw,2rem)] leading-snug"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Audiences are turning away from engagement feeds, people are paying to use their phones
            less, and governments are moving from warnings to enforcement. Atlus is built for that
            moment.
          </p>
        </header>

        <section
          className="mt-12 rounded-3xl p-7 sm:p-12"
          style={{ background: "var(--color-royal)", color: "var(--color-platinum)" }}
        >
          <div className="grid gap-7 sm:grid-cols-2">
            <div>
              <p
                className="text-[clamp(4.5rem,10vw,7rem)] leading-none"
                style={{ fontFamily: "var(--font-display)", fontWeight: 800 }}
              >
                42%
              </p>
              <p className="mt-3 text-lg leading-snug opacity-80">
                of people sometimes or often avoid the news.
              </p>
            </div>
            <div>
              <p
                className="text-[clamp(4.5rem,10vw,7rem)] leading-none"
                style={{ fontFamily: "var(--font-display)", fontWeight: 800 }}
              >
                37%
              </p>
              <p className="mt-3 text-lg leading-snug opacity-80">
                global trust in news, the lowest since tracking began in 2015.
              </p>
            </div>
          </div>
          <p
            className="mt-9 max-w-3xl text-xl leading-relaxed"
            style={{ fontFamily: "var(--font-display)" }}
          >
            The audience has not stopped wanting news. It has stopped trusting the way news reaches
            it.
          </p>
          <SourceLink
            href="https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2026/dnr-executive-summary"
            dark
          >
            Reuters Institute Digital News Report 2026
          </SourceLink>
        </section>

        <ContentSection id="audiences" title="Audiences are leaving the feed">
          <p>
            The feed has become the default route to news: convenient, ambient, and designed around
            engagement. The result is a growing gap between being exposed to news and feeling
            informed by it.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {audienceStats.map(([stat, meaning]) => (
              <StatCard key={stat} stat={stat} meaning={meaning} />
            ))}
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <Fact title="Trust has collapsed">
              Trust fell significantly in 29 of 48 markets. Only 22% trust news found on social
              media and 20% trust it from AI chatbots; 62% are concerned about what is real online.
            </Fact>
            <Fact title="People are switching off">
              The share who are very or extremely interested in news has fallen 13 points since
              2021. Casual, low-interest news users have grown from 16% to 25%.
            </Fact>
            <Fact title="News is increasingly incidental">
              Most Facebook, Instagram and TikTok users encounter news while doing something else.
              For many younger readers, it is no longer a deliberate habit.
            </Fact>
            <Fact title="Demand for better news remains">
              45% prefer news that does not take sides, and values-led reasons remain a major reason
              people pay for journalism.
            </Fact>
          </div>
          <p className="mt-6 text-sm opacity-70">
            <SourceLink href="https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2026/dnr-executive-summary">
              Source: Reuters Institute Digital News Report 2026
            </SourceLink>
          </p>
        </ContentSection>

        <ContentSection id="attention" title="People are paying to scroll less">
          <p>
            Screen-time and blocker tools have gone mainstream. They show that people will pay to
            take back control of their attention. Atlus is the news-shaped version of that movement.
          </p>
          <div
            className="mt-8 overflow-x-auto rounded-2xl border"
            style={{ borderColor: "rgba(13,27,42,0.16)" }}
          >
            <table className="min-w-[620px] w-full border-collapse text-left">
              <caption className="sr-only">Evidence that people pay to reduce screen time</caption>
              <thead style={{ background: "rgba(13,27,42,0.06)" }}>
                <tr>
                  <th className="p-5" scope="col">
                    Product
                  </th>
                  <th className="p-5" scope="col">
                    Proof point
                  </th>
                </tr>
              </thead>
              <tbody>
                {attentionProducts.map(([product, proof]) => (
                  <tr
                    key={product}
                    className="border-t"
                    style={{ borderColor: "rgba(13,27,42,0.12)" }}
                  >
                    <th className="p-5 align-top" scope="row">
                      {product}
                    </th>
                    <td className="p-5 align-top">{proof}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Fact title="Blockers subtract">They take the feed away, often successfully.</Fact>
            <Fact title="Atlus adds back what is worth keeping">
              A finite daily edition, stated preferences, a reason for every recommendation, and a
              link back to the original publisher.
            </Fact>
          </div>
          <p className="mt-6 text-sm opacity-70">
            Sources:{" "}
            <SourceLink href="https://www.pnas.org/doi/10.1073/pnas.2213114120">
              one sec PNAS study
            </SourceLink>
            ,{" "}
            <SourceLink href="https://www.revenuecat.com/blog/growth/kenneth-schlenker-sub-club-podcast-2026">
              RevenueCat on Opal
            </SourceLink>
            , and{" "}
            <SourceLink href="https://fortune.com/2026/02/13/analog-gen-z-phone-addiction-bloom-brick-app-blockers-dumb-phones-social-media/">
              Fortune on Bloom and Brick
            </SourceLink>
            .
          </p>
        </ContentSection>

        <ContentSection id="policy" title="Policy is moving against the engagement model">
          <p>
            Governments and courts are increasingly targeting how platforms are designed: infinite
            scroll, autoplay, push notifications and engagement-optimised recommenders.
          </p>
          <div
            className="mt-8 overflow-x-auto rounded-2xl border"
            style={{ borderColor: "rgba(13,27,42,0.16)" }}
          >
            <table className="min-w-[720px] w-full border-collapse text-left">
              <caption className="sr-only">Recent policy action on social-media design</caption>
              <thead style={{ background: "rgba(13,27,42,0.06)" }}>
                <tr>
                  <th className="p-5" scope="col">
                    Date
                  </th>
                  <th className="p-5" scope="col">
                    Where
                  </th>
                  <th className="p-5" scope="col">
                    What happened
                  </th>
                </tr>
              </thead>
              <tbody>
                {policyTimeline.map(([date, place, event]) => (
                  <tr
                    key={`${date}-${place}`}
                    className="border-t"
                    style={{ borderColor: "rgba(13,27,42,0.12)" }}
                  >
                    <td className="p-5 align-top whitespace-nowrap">{date}</td>
                    <th className="p-5 align-top" scope="row">
                      {place}
                    </th>
                    <td className="p-5 align-top">{event}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div
            className="mt-8 overflow-x-auto rounded-2xl border"
            style={{ borderColor: "rgba(13,27,42,0.16)" }}
          >
            <table className="min-w-[680px] w-full border-collapse text-left">
              <caption className="sr-only">
                What regulators target and what Atlus does instead
              </caption>
              <thead style={{ background: "var(--color-royal)", color: "white" }}>
                <tr>
                  <th className="p-5" scope="col">
                    What regulators are targeting
                  </th>
                  <th className="p-5" scope="col">
                    What Atlus does instead
                  </th>
                </tr>
              </thead>
              <tbody>
                <ComparisonRow
                  left="Infinite scroll"
                  right="A finite daily edition: Light (1), Standard (3), or Deep (5) articles."
                />
                <ComparisonRow
                  left="Autoplay"
                  right="Nothing plays; readers choose what to open."
                />
                <ComparisonRow
                  left="Notifications engineered to pull people back"
                  right="One daily dispatch."
                />
                <ComparisonRow
                  left="Opaque, engagement-optimised recommenders"
                  right="Stated preferences, with a reason shown for every pick."
                />
              </tbody>
            </table>
          </div>
          <p className="mt-8 text-2xl leading-snug" style={{ fontFamily: "var(--font-display)" }}>
            Atlus is aligned with where regulation is heading, not where it has been.
          </p>
          <p className="mt-6 text-sm opacity-70">
            Sources:{" "}
            <SourceLink href="https://digital-strategy.ec.europa.eu/en/news/commission-preliminarily-finds-tiktoks-addictive-design-breach-digital-services-act">
              European Commission on TikTok
            </SourceLink>
            ,{" "}
            <SourceLink href="https://www.npr.org/2026/03/25/nx-s1-5746125/meta-youtube-social-media-trial-verdict">
              NPR on the Los Angeles verdict
            </SourceLink>
            , and{" "}
            <SourceLink href="https://techcrunch.com/2026/04/08/social-media-ban-children-countries-list">
              TechCrunch country tracker
            </SourceLink>
            .
          </p>
        </ContentSection>

        <ContentSection id="research" title="The research behind Atlus">
          <div className="grid gap-5 sm:grid-cols-2">
            <Fact title="Milli et al., 2025">
              Engagement ranking amplified emotionally charged, hostile political content that users
              said made them feel worse. Ranking by stated preference reduced angry, partisan and
              hostile content.
            </Fact>
            <Fact title="Kim, Buntain & Ciampaglia, 2026">
              Young adults said they wanted high-quality news but often engaged with lower-quality
              posts. Their stated-preference feeds were rated more satisfying and higher quality.
            </Fact>
          </div>
          <p className="mt-8 text-2xl leading-snug" style={{ fontFamily: "var(--font-display)" }}>
            What people click and what people want are different things. Atlus builds for what they
            want.
          </p>
          <Link
            to="/science/stated-preference-feed"
            className="mt-7 inline-flex rounded-full px-6 py-3 text-sm font-semibold tracking-wide transition-transform hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
            style={{ background: "var(--color-royal)", color: "white" }}
          >
            Read the research →
          </Link>
        </ContentSection>

        <ContentSection id="sources" title="Sources">
          <ul className="space-y-4 text-base leading-relaxed">
            <li>
              <SourceLink href="https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2026/dnr-executive-summary">
                Reuters Institute, Digital News Report 2026
              </SourceLink>
            </li>
            <li>
              <SourceLink href="https://academic.oup.com/pnasnexus/article/4/3/pgaf062/8052060">
                Milli et al. (2025), PNAS Nexus
              </SourceLink>
            </li>
            <li>
              <SourceLink href="https://arxiv.org/abs/2604.11517">
                Kim, Buntain & Ciampaglia (2026), arXiv preprint
              </SourceLink>
            </li>
            <li>
              <SourceLink href="https://www.pnas.org/doi/10.1073/pnas.2213114120">
                Grüning, Riedel & Lorenz-Spreen (2023), PNAS
              </SourceLink>
            </li>
            <li>
              <SourceLink href="https://www.revenuecat.com/blog/growth/kenneth-schlenker-sub-club-podcast-2026">
                RevenueCat on Opal growth
              </SourceLink>
              ,{" "}
              <SourceLink href="https://fortune.com/2026/02/13/analog-gen-z-phone-addiction-bloom-brick-app-blockers-dumb-phones-social-media/">
                Fortune on Bloom and Brick
              </SourceLink>
            </li>
            <li>
              <SourceLink href="https://digital-strategy.ec.europa.eu/en/news/commission-preliminarily-finds-tiktoks-addictive-design-breach-digital-services-act">
                European Commission on TikTok’s addictive design
              </SourceLink>
            </li>
            <li>
              <SourceLink href="https://www.npr.org/2026/03/25/nx-s1-5746125/meta-youtube-social-media-trial-verdict">
                NPR on the Los Angeles verdict
              </SourceLink>
              ,{" "}
              <SourceLink href="https://www.cnbc.com/2026/07/15/social-media-ban-uk-midnight-curfews-infinite-scroll-teens.html">
                CNBC on UK proposals
              </SourceLink>
              , and{" "}
              <SourceLink href="https://techcrunch.com/2026/04/08/social-media-ban-children-countries-list">
                TechCrunch country tracker
              </SourceLink>
            </li>
          </ul>
        </ContentSection>

        <section
          className="mt-24 rounded-3xl px-7 py-12 text-center sm:px-12"
          style={{ background: "var(--color-royal)", color: "white" }}
        >
          <h2 className="text-4xl" style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>
            Read with more intention.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed opacity-80">
            A small daily paper, chosen with you in mind.
          </p>
          <a
            href="/#join"
            className="mt-7 inline-flex rounded-full px-6 py-3 text-sm font-semibold tracking-wide"
            style={{ background: "var(--color-amber)", color: "var(--color-royal)" }}
          >
            Start onboarding
          </a>
        </section>
      </article>
    </Page>
  );
}

function ContentSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mt-24 scroll-mt-10">
      <h2
        className="mb-8 text-[clamp(2rem,4vw,3.4rem)] leading-tight"
        style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
      >
        {title}
      </h2>
      <div className="text-lg leading-relaxed">{children}</div>
    </section>
  );
}

function StatCard({ stat, meaning }: { stat: string; meaning: string }) {
  return (
    <div className="rounded-2xl p-6" style={{ background: "white" }}>
      <p
        className="text-5xl leading-none"
        style={{ color: "var(--color-amber)", fontFamily: "var(--font-display)", fontWeight: 800 }}
      >
        {stat}
      </p>
      <p className="mt-3 text-base leading-relaxed opacity-80">{meaning}</p>
    </div>
  );
}

function Fact({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      className="rounded-2xl border p-6"
      style={{ borderColor: "rgba(13,27,42,0.16)", background: "white" }}
    >
      <h3
        className="text-2xl leading-tight"
        style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
      >
        {title}
      </h3>
      <p className="mt-3 text-base leading-relaxed opacity-80">{children}</p>
    </section>
  );
}

function ComparisonRow({ left, right }: { left: string; right: string }) {
  return (
    <tr className="border-t" style={{ borderColor: "rgba(13,27,42,0.12)" }}>
      <th className="p-5 align-top" scope="row">
        {left}
      </th>
      <td className="p-5 align-top">{right}</td>
    </tr>
  );
}

function SourceLink({
  href,
  dark = false,
  children,
}: {
  href: string;
  dark?: boolean;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="underline decoration-1 underline-offset-4"
      style={{ color: dark ? "var(--color-platinum)" : "var(--color-amber)" }}
    >
      {children}
    </a>
  );
}

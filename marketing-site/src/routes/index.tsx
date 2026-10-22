import { Link, createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import type { ReactNode } from "react";
import { Hero15a } from "@/components/atlus/Hero15a";
import { AnimatedHero } from "@/components/atlus/AnimatedHero";
import { Handwriting } from "@/components/atlus/Handwriting";
import { SiteHeader, SiteFooter } from "@/components/atlus/SiteChrome";
import { DoubleUnderline, CurvedArrow, PhotoCircle } from "@/components/atlus/marks";
import { pageHead, webPageStructuredData } from "@/lib/seo";
import { joinUrl, signInUrl } from "@/lib/product-links";

export const Route = createFileRoute("/")({
  head: () =>
    pageHead({
      title: "Atlus: daily news, personalised for you",
      description:
        "Atlus is a small, deliberate daily paper. Personalisation that widens your view instead of narrowing it. Never sold. Never the feed.",
      path: "/",
      structuredData: webPageStructuredData(
        "Atlus: daily news, personalised for you",
        "Atlus is a small, deliberate daily paper. Personalisation widens your view instead of narrowing it.",
        "/",
      ),
    }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div
      className="relative"
      style={{ background: "var(--color-platinum)", color: "var(--color-royal)" }}
    >
      <SiteHeader variant="dark" />
      <Hero15a />

      <Problem />
      <Solution />
      <SourceCarousel />
      <PracticalDetails />
      <Personalisation />
      <WhyUs />
      <Explore />
      <JoinSection />

      <SiteFooter />
    </div>
  );
}

/* ---------- shared bits ---------- */

function Section({
  id,
  eyebrow,
  title,
  children,
  bg,
  color,
  className = "",
}: {
  id?: string;
  eyebrow?: string;
  title: ReactNode;
  children: ReactNode;
  bg?: string;
  color?: string;
  className?: string;
}) {
  // Bright amber only clears WCAG contrast on the royal ground. On the light
  // grounds rebind --color-amber to the darker ink here, so the eyebrow and every
  // <Handwritten> inside inherit a readable accent without each one knowing which
  // section it landed in.
  const onRoyal = (bg ?? "").includes("royal");
  return (
    <section
      id={id}
      className={`px-6 py-24 sm:px-10 sm:py-32 ${className}`}
      style={{
        background: bg ?? "var(--color-platinum)",
        color: color ?? "var(--color-royal)",
        ...(onRoyal ? {} : { ["--color-amber" as string]: "var(--color-amber-ink)" }),
      }}
    >
      <div className="mx-auto max-w-5xl">
        {eyebrow && (
          <p
            className="mb-4 text-sm tracking-[0.25em]"
            style={{ fontFamily: "var(--font-serif)", color: "var(--color-amber)" }}
          >
            {eyebrow.toUpperCase()}
          </p>
        )}
        <h2
          className="mb-10 max-w-3xl text-[clamp(2rem,4.5vw,3.6rem)] leading-[1.05] tracking-tight"
          style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
        >
          {title}
        </h2>
        <div className="text-lg leading-relaxed" style={{ fontFamily: "var(--font-serif)" }}>
          {children}
        </div>
      </div>
    </section>
  );
}

function Handwritten({ children, className = "" }: { children: string; className?: string }) {
  return (
    <Handwriting
      text={children}
      className={`hand ${className}`}
      style={{ color: "var(--color-amber)", fontSize: "1.35em", lineHeight: 1 }}
    />
  );
}

/** Adds one reveal class when an element first enters the viewport. */
function useViewportReveal() {
  const ref = React.useRef<HTMLElement>(null);
  const [revealed, setRevealed] = React.useState(false);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setRevealed(true);
        observer.disconnect();
      },
      { threshold: 0.22 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, revealed };
}

/* ---------- sections ---------- */

function Problem() {
  return (
    <Section eyebrow="The problem" title="The news is broken.">
      <p className="max-w-3xl">
        The journalism is often good. The way it reaches us is not. Three problems explain why so
        many people feel poorly informed, even when news is everywhere.
      </p>

      <div className="mt-12 grid gap-5 lg:grid-cols-3">
        <article
          className="rounded-2xl border p-6 sm:p-7"
          style={{ borderColor: "rgba(13,27,42,0.14)", background: "white" }}
        >
          <p className="text-xs tracking-[0.2em] opacity-55">01</p>
          <h3
            className="mt-4 text-3xl leading-tight"
            style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
          >
            It rewards <Handwritten>reaction</Handwritten>, not understanding.
          </h3>
          <p className="mt-5 text-base leading-relaxed opacity-80">
            Engagement ranking pushes angry, hostile content because it keeps people clicking, even
            when readers say that content makes them feel worse.
          </p>
          <p className="mt-5 text-sm opacity-65">
            <StudyLink href="https://academic.oup.com/pnasnexus/article/4/3/pgaf062/8052060">
              Milli et al., PNAS Nexus (2025)
            </StudyLink>
          </p>
        </article>

        <article
          className="rounded-2xl border p-6 sm:p-7"
          style={{ borderColor: "rgba(13,27,42,0.14)", background: "white" }}
        >
          <p className="text-xs tracking-[0.2em] opacity-55">02</p>
          <h3
            className="mt-4 text-3xl leading-tight"
            style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
          >
            It mistakes <Handwritten>attention</Handwritten> for approval.
          </h3>
          <p className="mt-5 text-base leading-relaxed opacity-80">
            People often open low-quality stories they do not endorse. A click shows what caught
            your eye, not what you value or want more of.
          </p>
          <p className="mt-5 text-sm opacity-65">
            <StudyLink href="https://arxiv.org/abs/2604.11517">
              Kim, Buntain &amp; Ciampaglia (2026 preprint)
            </StudyLink>
          </p>
        </article>

        <article
          className="rounded-2xl border p-6 sm:p-7"
          style={{ borderColor: "rgba(13,27,42,0.14)", background: "white" }}
        >
          <p className="text-xs tracking-[0.2em] opacity-55">03</p>
          <h3
            className="mt-4 text-3xl leading-tight"
            style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
          >
            It makes staying informed feel <Handwritten>exhausting</Handwritten>.
          </h3>
          <p className="mt-5 text-base leading-relaxed opacity-80">
            Forty-two per cent of people now sometimes or often avoid the news, while global trust
            has fallen to 37 per cent. More news has not created more confidence.
          </p>
          <p className="mt-5 text-sm opacity-65">
            <StudyLink href="https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2026/dnr-executive-summary">
              Reuters Institute Digital News Report 2026
            </StudyLink>
          </p>
        </article>
      </div>
    </Section>
  );
}

function StudyLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="underline decoration-1 underline-offset-4 transition-opacity hover:opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
    >
      {children}
    </a>
  );
}

function Solution() {
  return (
    <Section id="how" eyebrow="The solution" title="Three stories. Chosen for you." bg="#F1E9DE">
      <p className="max-w-3xl">
        Atlus is a finite daily edition: three articles selected to reflect what you care about,
        deepen what you want to learn, and introduce something worth discovering.
      </p>
      <p className="mt-8 max-w-3xl">
        It uses recommendation technology to serve the interests you name, not to maximise the time
        you spend scrolling. Each edition contains a <strong>Core</strong>, <strong>Stretch</strong>
        , and <strong>Discovery</strong> story.
      </p>
      <div
        className="mt-10 rounded-2xl px-5 py-7 sm:px-8"
        style={{ background: "var(--color-royal)", ["--color-amber" as string]: "var(--amber)" }}
      >
        <p
          className="mb-6 text-sm tracking-[0.25em]"
          style={{ color: "var(--color-platinum)", fontFamily: "var(--font-serif)" }}
        >
          THE DAILY ATLUS
        </p>
        <AnimatedHero showIntroduction={false} />
      </div>
    </Section>
  );
}

const FEATURED_SOURCES = [
  {
    name: "Associated Press",
    logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Associated_Press_logo_2012.svg",
  },
  {
    name: "Reuters",
    logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Reuters_Logo.svg",
  },
  {
    name: "BBC News",
    logo: "https://commons.wikimedia.org/wiki/Special:FilePath/BBC_News_2022_(Alt).svg",
  },
  {
    name: "Financial Times",
    logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Financial_Times_corporate_logo.svg",
  },
  {
    name: "The Economist",
    logo: "https://commons.wikimedia.org/wiki/Special:FilePath/The_Economist_Logo.svg",
  },
  {
    name: "The Guardian",
    logo: "https://cdn.simpleicons.org/theguardian/052962",
  },
  {
    name: "Works in Progress",
    logo: "https://worksinprogress.co/wip-image/uploads/2025/04/Logo.png",
  },
  {
    name: "Al Jazeera English",
    logo: "https://upload.wikimedia.org/wikipedia/commons/f/f2/Aljazeera_eng.svg",
  },
] as const;

function SourceCarousel() {
  return (
    <Section
      eyebrow="The sources"
      title="A wider view starts with wider sources."
      bg="var(--color-royal)"
      color="var(--color-platinum)"
      className="overflow-hidden"
    >
      <p className="max-w-3xl opacity-80">
        Our starting list mixes familiar institutions with specialist, independent and international
        publishers. Every outlet is reviewed before inclusion. We are developing a short political-
        perspective note for each source, so you can judge the source as well as the story.
      </p>
      <div className="source-marquee mt-10" aria-label="A selection of Atlus sources">
        <div className="source-marquee__track">
          {[false, true].map((duplicate) => (
            <div
              className="source-marquee__group"
              aria-hidden={duplicate || undefined}
              key={duplicate ? "duplicate" : "primary"}
            >
              {FEATURED_SOURCES.map((source) => (
                <div className="source-card" key={source.name}>
                  <img
                    src={source.logo}
                    alt={`${source.name} logo`}
                    className="source-card__logo"
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                  <span className="source-card__name" aria-hidden="true">
                    {source.name}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-6 max-w-3xl text-sm opacity-70">
        Political leaning is context, not a quality score. No outlet label can guarantee an
        individual article is impartial or accurate; we will publish each assessment with its basis
        and update it when the evidence changes.
      </p>
    </Section>
  );
}

function PracticalDetails() {
  const details = [
    {
      eyebrow: "DELIVERY",
      title: "Once a day, in your inbox",
      body: "Choose the time it arrives. We recommend about 30 minutes after you wake up, when there is space to read but before the day runs away with you.",
    },
    {
      eyebrow: "READING",
      title: "The publisher's full article",
      body: "Atlus sends you to the publisher's original article, not an AI summary. If a link is blocked for you, tell us so we can improve future picks.",
    },
    {
      eyebrow: "PRICE",
      title: "Free",
      body: "Atlus costs nothing to use.",
    },
    {
      eyebrow: "AVAILABILITY",
      title: "Start reading now",
      body: "Create an account, complete onboarding, and see your first recommendations on Today. Choose when your daily email arrives.",
    },
  ];

  return (
    <Section eyebrow="The practical bit" title="A daily habit, not another feed." bg="#F1E9DE">
      <div className="grid gap-5 sm:grid-cols-2">
        {details.map((detail) => (
          <div
            key={detail.eyebrow}
            className="rounded-2xl border p-6 sm:p-7"
            style={{ borderColor: "rgba(13,27,42,0.14)", background: "white" }}
          >
            <p
              className="text-xs tracking-[0.2em]"
              style={{ color: "var(--color-amber)", fontFamily: "var(--font-serif)" }}
            >
              {detail.eyebrow}
            </p>
            <h3
              className="mt-3 text-2xl leading-tight"
              style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
            >
              {detail.title}
            </h3>
            <p className="mt-3 text-base leading-relaxed opacity-80">{detail.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Personalisation() {
  return (
    <Section
      eyebrow="Personalisation"
      title="You set the direction."
      bg="var(--color-royal)"
      color="var(--color-platinum)"
    >
      <p className="max-w-3xl">
        The Atlus onboarding process lets <Handwritten>you</Handwritten> tell{" "}
        <Handwritten>us</Handwritten> what you want, in an intuitive way.
      </p>
      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {[
          { k: "Preferences", body: "what you actually enjoy reading." },
          {
            k: "Goals",
            body: "what you want to understand better.",
          },
          {
            k: "Knowledge",
            body: "what you already know, so we don't repeat it.",
          },
        ].map((c, i) => (
          <div
            key={c.k}
            className="rounded-2xl border p-6"
            style={{
              borderColor: "rgba(248,249,250,0.22)",
              background: "white",
              color: "var(--color-royal)",
            }}
          >
            <p
              className="mb-3 text-sm tracking-[0.25em] opacity-70"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              0{i + 1}
            </p>
            <h3
              className="mb-3 text-3xl"
              style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
            >
              {c.k}
            </h3>
            <p className="opacity-80">{c.body}</p>
          </div>
        ))}
      </div>

      <p className="mt-16 max-w-3xl text-lg opacity-80">
        Every assumption Atlus makes about you is visible and adjustable. Every recommendation also
        carries a short explanation: the interest it maps to, the goal it answers, or the new
        perspective it introduces. If it misses the mark, tell us and correct it.
      </p>
    </Section>
  );
}

function WhyUs() {
  const { ref, revealed } = useViewportReveal();

  return (
    <Section eyebrow="Why us" title="Two perspectives, one purpose." bg="#F1E9DE">
      <figure
        ref={ref}
        className={`why-us-pop relative mx-auto mt-10 max-w-4xl overflow-hidden rounded-2xl${revealed ? " is-revealed" : ""}`}
      >
        <img
          src="/images/founders.jpg"
          alt="Sam Oliver and Henry Hudson with friends at a Durham formal."
          className="founders-photo aspect-[4/3] w-full object-cover"
          loading="lazy"
        />
        <UniversityMarks />
        <img
          src="/images/josephine-butler-college-crest-transparent.png"
          alt="Josephine Butler College crest"
          className="butler-crest"
          loading="lazy"
        />
        <PhotoCircle
          x="65%"
          y="56%"
          w="15%"
          h="24%"
          label="Sam"
          labelPosition="above"
          color="var(--amber)"
        />
        <PhotoCircle
          x="52%"
          y="53%"
          w="15%"
          h="24%"
          label="Henry"
          labelPosition="above"
          color="var(--amber)"
        />
      </figure>
      <p className="mt-5 max-w-3xl">
        We are building Atlus for a problem our generation lives with. Sam brings editorial context,
        economic history and natural-language processing; Henry brings computer science, machine
        learning and experience working on news recommendation systems. Together, that gives Atlus
        both a point of view about healthier news and the technical ability to build it.
      </p>
      <div className="mt-12 grid gap-8 sm:grid-cols-2">
        <div
          className="rounded-2xl p-8"
          style={{ background: "var(--color-royal)", color: "var(--color-platinum)" }}
        >
          <h3 className="text-2xl" style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>
            Sam Oliver, CEO &amp; Co-founder
          </h3>
          <p className="mt-3 text-base leading-relaxed opacity-80">
            First-Class Honours in History from Durham University, focused on economic history and
            natural-language processing. Participant in the Durham Venture School accelerator.
          </p>
        </div>
        <div
          className="rounded-2xl p-8"
          style={{ background: "var(--color-royal)", color: "var(--color-platinum)" }}
        >
          <h3 className="text-2xl" style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>
            Henry B. Hudson, CTO &amp; Co-founder
          </h3>
          <p className="mt-3 text-base leading-relaxed opacity-80">
            First-Class Honours in Computer Science from Durham University. Incoming MPhil in
            Machine Learning and Machine Intelligence at Cambridge. Previously worked on
            recommendation systems at News UK for <em>The Sun</em> and <em>The Times</em>.
          </p>
        </div>
      </div>
    </Section>
  );
}

function UniversityMarks() {
  return (
    <div className="university-marks" aria-label="University affiliations">
      <img
        src="/images/durham-university-wordmark.png"
        alt="Durham University"
        className="university-mark university-mark--durham"
        loading="lazy"
      />
      <img
        src="/images/cambridge-university-wordmark.jpeg"
        alt="University of Cambridge"
        className="university-mark university-mark--cambridge"
        loading="lazy"
      />
    </div>
  );
}

function Explore() {
  const pages = [
    {
      to: "/science/stated-preference-feed",
      eyebrow: "Research",
      title: "The stated-preference feed",
      body: "Why a news feed built around what you say you want can lead somewhere better than one built around clicks.",
    },
    {
      to: "/privacy",
      eyebrow: "Privacy",
      title: "Personalisation, kept personal",
      body: "What reader information is for, and why it is never a product to be sold.",
    },
    {
      to: "/faq",
      eyebrow: "Questions",
      title: "A few useful answers",
      body: "The essentials about Atlus, its daily edition and how recommendations work.",
    },
    {
      to: "/manifesto",
      eyebrow: "Our view",
      title: "The Atlus manifesto",
      body: "Why the feed needs a new purpose, and the principles behind a healthier daily paper.",
    },
  ] as const;

  return (
    <Section
      id="explore"
      eyebrow="Go deeper"
      title="Read the thinking behind the paper."
      bg="var(--color-royal)"
      color="var(--color-platinum)"
    >
      <p className="max-w-3xl">
        Atlus is built around a simple question: what would news feel like if it followed the
        interests you name, rather than the impulses a feed can measure? Explore the research,
        product principles and practical details.
      </p>
      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        {pages.map((page) => (
          <Link
            key={page.to}
            to={page.to}
            className="group flex min-h-56 flex-col justify-between rounded-2xl border p-6 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
            style={{
              borderColor: "rgba(13,27,42,0.16)",
              background: "white",
              color: "var(--color-royal)",
            }}
          >
            <div>
              <p
                className="text-xs tracking-[0.2em]"
                style={{ color: "var(--color-amber)", fontFamily: "var(--font-serif)" }}
              >
                {page.eyebrow.toUpperCase()}
              </p>
              <h3
                className="mt-4 text-3xl leading-tight"
                style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
              >
                {page.title}
              </h3>
              <p className="mt-3 text-base leading-relaxed opacity-80">{page.body}</p>
            </div>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold underline decoration-1 underline-offset-4">
              Read more{" "}
              <span
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
              >
                →
              </span>
            </span>
          </Link>
        ))}
      </div>
    </Section>
  );
}

function JoinSection() {
  return (
    <section
      id="join"
      className="relative px-6 py-32 sm:px-10"
      style={{
        background: "var(--color-platinum)",
        color: "var(--color-royal)",
        ["--color-amber" as string]: "var(--color-amber-ink)",
      }}
    >
      <div className="mx-auto max-w-3xl text-center">
        <div className="mb-4 flex justify-center">
          <CurvedArrow />
        </div>
        <h2
          className="mb-6 text-[clamp(2.4rem,6vw,4.4rem)] leading-[1]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 800 }}
        >
          Join{" "}
          <span className="relative inline-block">
            Atl
            <Handwriting text="u" className="brand-u" style={{ color: "var(--color-amber)" }} />s
          </span>
        </h2>
        <Handwriting
          text="begin with what matters to you"
          className="mb-10 block text-2xl"
          style={{ color: "var(--color-amber)" }}
        />

        <a
          href={joinUrl}
          className="inline-flex min-h-11 items-center justify-center rounded-full px-7 py-3 text-sm font-semibold tracking-wide transition-opacity hover:opacity-85"
          style={{
            background: "var(--color-royal)",
            color: "var(--color-platinum)",
            fontFamily: "var(--font-serif)",
          }}
        >
          Join Atlus{" "}
          <span className="ml-2" aria-hidden="true">
            ↗
          </span>
        </a>
        <p className="mt-4 text-sm opacity-60" style={{ fontFamily: "var(--font-serif)" }}>
          {import.meta.env.DEV
            ? "Local preview — explore the full flow without an account or email."
            : "No endless feed. No selling your data. Three stories, then you're done."}
        </p>
        <p className="mt-3 text-sm" style={{ fontFamily: "var(--font-serif)" }}>
          Already have an account?{" "}
          <a className="underline underline-offset-4" href={signInUrl}>
            Sign in
          </a>
        </p>
      </div>
    </section>
  );
}

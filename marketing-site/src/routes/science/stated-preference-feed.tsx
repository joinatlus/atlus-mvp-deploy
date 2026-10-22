/*
  [CONFIRM] before launch:
  - Check the 62% / 52% anger figures against the final PNAS Nexus paper.
  - Confirm whether the Khambatta et al. recommendations were articles.
  - Confirm Henry's wording on any behavioural signals and whether to include it.
  - Confirm the Apple News / Google News answer; do not add competitor claims without a source.
  - Confirm the Article author, publication dates, and logo path in the JSON-LD below.
  - Confirm the UK 50% news-avoidance figure against the Reuters Institute UK country page.
*/
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/atlus/SiteChrome";
import { pageHead } from "@/lib/seo";

const title = "The Stated-Preference Feed: News by What You Want | Atlus";
const description =
  "A stated-preference feed ranks news by what readers say they want, not what they click. The research on engagement algorithms, anger and news avoidance.";
const path = "/science/stated-preference-feed";

const sources = [
  [
    "Milli, S., Carroll, M., Wang, Y., Pandey, S., Zhao, S. & Dragan, A. D. (2025). Engagement, user satisfaction, and the amplification of divisive content on social media. PNAS Nexus, 4(3), pgaf062.",
    "https://doi.org/10.1093/pnasnexus/pgaf062",
  ],
  [
    "Milli, S. et al. (2024). Engagement, User Satisfaction, and the Amplification of Divisive Content on Social Media. Knight First Amendment Institute.",
    "https://knightcolumbia.org/content/engagement-user-satisfaction-and-the-amplification-of-divisive-content-on-social-media",
  ],
  [
    "Kleinberg, J., Mullainathan, S. & Raghavan, M. (2024). The challenge of understanding what users want: Inconsistent preferences and engagement optimization. Management Science, 70(9), 6336–6355.",
    "https://doi.org/10.1287/mnsc.2022.03683",
  ],
  [
    "Khambatta, P., Mariadassou, S., Morris, J. & Wheeler, S. C. (2023). Tailoring recommendation algorithms to ideal preferences makes users better off. Scientific Reports, 13, 9325.",
    "https://doi.org/10.1038/s41598-023-34192-x",
  ],
  [
    "Kim, D. W., Buntain, C. & Ciampaglia, G. L. (2026). Understanding the Gap Between Stated and Revealed Preferences in News Curation: A Study of Young Adult Social Media Users. arXiv:2604.11517 (preprint).",
    "https://arxiv.org/abs/2604.11517",
  ],
  [
    "Cunningham, T. et al. (2024). What We Know About Using Non-Engagement Signals in Content Ranking. arXiv:2402.06831 (preprint).",
    "https://arxiv.org/abs/2402.06831",
  ],
  [
    "Reuters Institute for the Study of Journalism (2025). Digital News Report 2025.",
    "https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2025/dnr-executive-summary",
  ],
  [
    "Reuters Institute for the Study of Journalism (2026). Digital News Report 2026.",
    "https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2026/dnr-executive-summary",
  ],
  [
    "Press Gazette (2026). News publishing trends for 2026.",
    "https://pressgazette.co.uk/publishers/digital-journalism/news-publishing-trends-for-2026/",
  ],
  [
    "Milli, S., Belli, L. & Hardt, M. (2021). From Optimizing Engagement to Measuring Value. Proceedings of the 2021 ACM Conference on Fairness, Accountability, and Transparency, 714–722.",
    "https://doi.org/10.1145/3442188.3445933",
  ],
] as const;

const sourceNumbers = {
  S1: 1,
  S1b: 2,
  S2: 3,
  S3: 4,
  S4: 5,
  S5b: 6,
  S5: 7,
  S6: 8,
  S7: 9,
  S8: 10,
} as const;
type SourceId = keyof typeof sourceNumbers;

const faqs = [
  {
    question: "What is a stated-preference feed?",
    answer:
      "A feed that ranks content by what readers explicitly say they want to read and learn, rather than by predicting what they will click. The term contrasts with revealed preference, which infers what you want from your behaviour.",
    citations: ["S1"] as SourceId[],
  },
  {
    question: "Why do engagement-based feeds make people angry?",
    answer:
      "Because anger and hostility drive engagement. A preregistered audit of Twitter found its engagement algorithm amplified angry, hostile political content compared with a chronological feed, and users said this content made them feel worse about people on the other side.",
    citations: ["S1"] as SourceId[],
  },
  {
    question: "Don't people just want the content they click on?",
    answer:
      "Not always. Research on inconsistent preferences shows that choices made in the moment often differ from what people actually want. When a recommender was tuned to people's ideal preferences, they clicked slightly less but felt better off.",
    citations: ["S2", "S3"] as SourceId[],
  },
  {
    question: "Does a stated-preference feed create an echo chamber?",
    answer:
      "It can if it is the only signal. Research found that ranking purely by stated preference reduced exposure to opposing views. Atlus counters this with daily Stretch and Discovery picks outside your usual interests.",
    citations: ["S1"] as SourceId[],
  },
  {
    question: "Why are so many people avoiding the news?",
    answer:
      "42% of people globally now sometimes or often avoid the news. The top reasons are its negative effect on mood and feeling worn out by the volume.",
    citations: ["S6", "S5"] as SourceId[],
  },
  {
    question: "How is Atlus different from Apple News or Google News?",
    answer:
      "Atlus asks what you want to understand, gives you a small daily set of articles, and tells you why each one was chosen. Then it lets you stop.",
    citations: [] as SourceId[],
  },
];

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "The Stated-Preference Feed: A feed built on what you want, not what you click",
  description:
    "A stated-preference feed ranks content by what readers say they want to read and learn, rather than by predicting what they will click, like or share.",
  author: { "@type": "Person", name: "Sam Oliver", jobTitle: "Co-founder, Atlus" },
  publisher: {
    "@type": "Organization",
    name: "Atlus",
    url: "https://joinatlus.com",
    logo: { "@type": "ImageObject", url: "https://joinatlus.com/og-atlus.png" },
  },
  mainEntityOfPage: "https://joinatlus.com/science/stated-preference-feed",
  datePublished: "2026-09-22",
  dateModified: "2026-09-22",
  citation: [
    "https://doi.org/10.1093/pnasnexus/pgaf062",
    "https://doi.org/10.1287/mnsc.2022.03683",
    "https://doi.org/10.1038/s41598-023-34192-x",
    "https://arxiv.org/abs/2604.11517",
    "https://arxiv.org/abs/2402.06831",
    "https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2026/dnr-executive-summary",
  ],
};

const definedTermSchema = {
  "@context": "https://schema.org",
  "@type": "DefinedTerm",
  name: "Stated-preference feed",
  description:
    "A content feed ranked by what readers explicitly say they want to read and learn, rather than by predicted engagement such as clicks, likes or shares.",
  url: "https://joinatlus.com/science/stated-preference-feed",
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.slice(0, 5).map(({ question, answer }) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: { "@type": "Answer", text: answer },
  })),
};

export const Route = createFileRoute("/science/stated-preference-feed")({
  head: () =>
    pageHead({
      title,
      description,
      path,
      type: "article",
      socialTitle: "The Stated-Preference Feed",
      socialDescription:
        "Why ranking news by what you say you want beats ranking by what you click. The research, and its limits.",
      structuredData: [articleSchema, definedTermSchema, faqSchema],
    }),
  component: StatedPreferenceFeedPage,
});

function Cite({ ids }: { ids: SourceId[] }) {
  return (
    <sup className="ml-1 whitespace-nowrap text-xs font-semibold leading-none">
      {ids.map((id, index) => (
        <span key={id}>
          {index > 0 && ","}
          <a
            className="underline decoration-1 underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            href={`#source-${sourceNumbers[id]}`}
            aria-label={`Source ${sourceNumbers[id]}`}
          >
            {sourceNumbers[id]}
          </a>
        </span>
      ))}
    </sup>
  );
}

function StatedPreferenceFeedPage() {
  return (
    <Page headerVariant="light">
      <article
        className="mx-auto max-w-4xl px-6 pb-24 pt-40 sm:px-10"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        <header className="max-w-3xl">
          <p className="mb-5 text-sm tracking-[0.25em]" style={{ color: "var(--color-amber)" }}>
            THE SCIENCE OF ATLUS
          </p>
          <h1
            className="text-[clamp(2.8rem,7vw,5.4rem)] leading-[0.98] tracking-tight"
            style={{ fontFamily: "var(--font-display)", fontWeight: 800 }}
          >
            A feed built on what you want, not what you click
          </h1>
          <p
            className="mt-9 text-[clamp(1.45rem,3vw,2rem)] leading-snug"
            style={{ fontFamily: "var(--font-display)" }}
          >
            A <strong>stated-preference feed</strong> ranks content by what readers tell it they
            want to read and learn, rather than by predicting what they will click, like or share.
          </p>
          <p className="mt-6 text-xl leading-relaxed opacity-80">
            Most feeds learn from your behaviour in the moment. Research shows that behaviour often
            isn't what you'd choose on reflection. Atlus is built on the difference.
            <Cite ids={["S1", "S2"]} />
          </p>
        </header>

        <Section id="problem" title="Why your feed doesn't give you what you want">
          <p>
            Most social and news feeds optimise for your <em>revealed preferences</em>: the clicks,
            shares and likes you produce.
            <Cite ids={["S1"]} /> The logic is simple. Watch what people do, then show them more of
            it.
          </p>
          <p>
            The trouble is that what we do in the moment often doesn't match what we actually want.
            <Cite ids={["S2"]} />
          </p>
          <p>
            Computer scientists Jon Kleinberg, Sendhil Mullainathan and Manish Raghavan explain it
            with a party. You empty the bowl of crisps on the table. Your host sees this, decides
            you want more, and refills it. You empty it again. You leave feeling you ate far too
            many. The host assumed your behaviour revealed your preference. It didn't.
            <Cite ids={["S2"]} />
          </p>
          <p className="text-2xl italic" style={{ fontFamily: "var(--font-display)" }}>
            An engagement-optimised feed is that host. It keeps refilling the bowl.
          </p>
        </Section>

        <Section id="evidence" title="What the research shows">
          <Evidence
            title="Engagement ranking amplifies anger that users don't want"
            citations={["S1", "S1b"]}
          >
            <li>
              In a preregistered audit, researchers from Berkeley and Cornell compared Twitter's
              engagement-ranked timeline with a simple reverse-chronological one.
              <Cite ids={["S1"]} />
            </li>
            <li>
              The engagement algorithm amplified emotionally charged, hostile content that made
              users feel worse about people on the other side of politics.
              <Cite ids={["S1"]} />
            </li>
            <li>
              Among political posts, 62% of those picked by the algorithm expressed anger, against
              52% in the chronological feed.
              <Cite ids={["S1b"]} />
            </li>
            <li>
              Users did <strong>not</strong> prefer the political posts the algorithm chose.
              <Cite ids={["S1"]} />
            </li>
            <li>
              When the researchers re-ranked the same posts by what users <em>said</em> they wanted,
              angry, partisan and hostile content fell.
              <Cite ids={["S1"]} />
            </li>
            <li className="mt-5 list-none text-sm opacity-70">
              <em>Study: Milli et al., PNAS Nexus (2025). 806 US Twitter users, February 2023.</em>
              <Cite ids={["S1", "S1b"]} />
            </li>
          </Evidence>
          <Evidence title="Ranking for your ideals makes you feel better off" citations={["S3"]}>
            <li>
              Researchers at UCLA and Stanford built recommendation systems tuned to either people's{" "}
              <em>actual</em> preferences or their <em>ideal</em> preferences, then tested them in a
              preregistered experiment with 6,488 participants.
              <Cite ids={["S3"]} />
            </li>
            <li>
              Targeting ideal preferences produced somewhat fewer clicks, but people felt better off
              and felt their time was better spent.
              <Cite ids={["S3"]} />
            </li>
            <li>
              They were also more willing to pay for the service, more likely to use it again, and
              more likely to feel the company had their best interests at heart.
              <Cite ids={["S3"]} />
            </li>
            <li className="mt-5 list-none text-sm opacity-70">
              <em>Study: Khambatta et al., Scientific Reports (2023).</em>
              <Cite ids={["S3"]} />
            </li>
          </Evidence>
          <Evidence
            title="Young adults want better news than their feeds give them"
            citations={["S4"]}
          >
            <li>
              A 2026 University of Maryland study of 18–24-year-olds found participants often
              engaged with low-quality content they didn't endorse, despite wanting high-quality
              information.
              <Cite ids={["S4"]} />
            </li>
            <li>
              When asked to design an ideal news feed, they prioritised values such as accuracy and
              diversity, and rated the result as more satisfying and higher quality.
              <Cite ids={["S4"]} />
            </li>
            <li>
              Sixteen of 20 participants put balance first when designing their ideal feed, while
              only five prioritised entertainment. The stated-preference feed differed from the
              engagement feed more than a random feed did, without reducing viewpoint diversity.
              <Cite ids={["S4"]} />
            </li>
            <li className="mt-5 list-none text-sm opacity-70">
              <em>
                Study: Kim, Buntain and Ciampaglia, arXiv preprint (2026), not yet peer reviewed.
              </em>
              <Cite ids={["S4"]} />
            </li>
          </Evidence>
          <p className="mt-8 text-base leading-relaxed opacity-75">
            This matters because people are switching off. 42% of people across 48 markets now
            sometimes or often avoid the news, up from 29% in 2017.
            <Cite ids={["S6"]} /> In the UK the figure is 50%.
            <Cite ids={["S7"]} /> The most common reasons given are the news worsening their mood
            and feeling worn out by the sheer volume.
            <Cite ids={["S5"]} />
          </p>
          <p
            className="mt-8 rounded-2xl p-6 text-2xl leading-snug"
            style={{
              background: "var(--color-royal)",
              color: "var(--color-platinum)",
              fontFamily: "var(--font-display)",
            }}
          >
            Together, the evidence suggests that what people click and what people want are
            different things. Atlus builds for what they want.
          </p>
        </Section>

        <Section id="comparison" title="Revealed preference vs stated preference">
          <div
            className="overflow-x-auto rounded-2xl border"
            style={{ borderColor: "rgba(13,27,42,0.16)" }}
          >
            <table className="min-w-[820px] w-full border-collapse text-left text-base leading-relaxed">
              <caption className="sr-only">
                Comparison of engagement and stated-preference feeds
              </caption>
              <thead style={{ background: "rgba(13,27,42,0.06)" }}>
                <tr>
                  <th className="p-5" scope="col"></th>
                  <th className="p-5" scope="col">
                    Engagement feed
                    <br />
                    <span className="font-normal opacity-70">Revealed preference</span>
                  </th>
                  <th className="p-5" scope="col">
                    Stated-preference feed
                  </th>
                </tr>
              </thead>
              <tbody>
                <ComparisonRow
                  label="Learns from"
                  left={
                    <>
                      Clicks, likes, shares, dwell time
                      <Cite ids={["S1"]} />
                    </>
                  }
                  right="What you tell it you want to read and learn"
                />
                <ComparisonRow
                  label="Optimises for"
                  left="Keeping you engaged"
                  right={
                    <>
                      Content you'd endorse on reflection
                      <Cite ids={["S1", "S3"]} />
                    </>
                  }
                />
                <ComparisonRow
                  label="Mental model"
                  left={
                    <>
                      The host who keeps refilling the bowl
                      <Cite ids={["S2"]} />
                    </>
                  }
                  right="Asking you what you'd actually like"
                />
                <ComparisonRow
                  label="Known risk"
                  left={
                    <>
                      Amplifies anger and hostility
                      <Cite ids={["S1"]} />
                    </>
                  }
                  right={
                    <>
                      Can narrow you towards views you already hold
                      <Cite ids={["S1"]} />
                    </>
                  }
                />
                <ComparisonRow
                  label="Atlus's answer to the risk"
                  left="n/a"
                  right="Stretch and Discovery picks outside your usual diet"
                />
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="atlus-in-practice" title="How Atlus puts it into practice">
          <div className="grid gap-5 sm:grid-cols-2">
            <Feature title="You tell us, up front.">
              Onboarding asks three things: what you enjoy reading (<strong>Preferences</strong>),
              what you want to understand better (<strong>Goals</strong>), and what you already know
              (<strong>Knowledge</strong>), so we don't repeat it.
            </Feature>
            <Feature title="A few picks, then done.">
              Choose Light (1 article), Standard (3) or Deep (5) each day. No infinite scroll.
            </Feature>
            <Feature title="Deliberate breadth.">
              Every day mixes <strong>Core</strong> picks close to your interests,{" "}
              <strong>Stretch</strong> picks that serve your goals, and <strong>Discovery</strong>{" "}
              picks from outside your usual media diet.
            </Feature>
            <Feature title="You can see why.">
              Every article says why it was chosen, and you can view and edit what Atlus assumes
              about you.
            </Feature>
          </div>
        </Section>

        <Section id="limits" title="What the research doesn't say">
          <p>We'd rather be precise than oversell.</p>
          <ul className="mt-6 space-y-5 pl-6">
            <li>
              <strong>Stated preferences can narrow your view.</strong> In the Twitter study,
              ranking by stated preference cut hostile content, but it did so partly by showing
              fewer posts from people's political opponents.
              <Cite ids={["S1", "S1b"]} /> This is why Atlus builds Stretch and Discovery picks into
              every day.
            </li>
            <li>
              <strong>The Twitter experiment was small in scope.</strong> The stated-preference
              ranking re-ordered only about 20 posts per user, so results at full platform scale are
              untested.
              <Cite ids={["S1b"]} />
            </li>
            <li>
              <strong>Researchers don't say engagement data is useless.</strong> The authors of the
              Twitter study explicitly do not advocate abandoning it. They suggest combining it with
              what users say they want.
              <Cite ids={["S1b", "S8"]} />
            </li>
            <li>
              <strong>Explaining recommendations isn't proven to keep users.</strong> An
              industry-academic review found no strong evidence that transparency or explanations
              improve retention.
              <Cite ids={["S5b"]} /> We explain our picks because you deserve to know, not because
              it's a growth trick.
            </li>
            <li>
              <strong>One study is a preprint.</strong> The University of Maryland study has not yet
              been peer reviewed.
              <Cite ids={["S4"]} />
            </li>
          </ul>
        </Section>

        <Section id="faq" title="Frequently asked questions">
          <Faq />
        </Section>
        <Sources />
        <section
          id="join"
          className="mt-20 rounded-3xl px-7 py-12 text-center sm:px-12"
          style={{ background: "var(--color-royal)", color: "var(--color-platinum)" }}
        >
          <h2 className="text-4xl" style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>
            Read with more intention.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed opacity-80">
            A small daily paper, chosen with you in mind.
          </p>
          <a
            href="/#join"
            className="mt-7 inline-flex rounded-full px-6 py-3 text-sm font-semibold tracking-wide transition-transform hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
            style={{ background: "var(--color-amber)", color: "var(--color-royal)" }}
          >
            Start onboarding
          </a>
        </section>
      </article>
    </Page>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-24 scroll-mt-10">
      <h2
        className="mb-8 text-[clamp(2rem,4vw,3.2rem)] leading-tight"
        style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
      >
        {title}
      </h2>
      <div className="space-y-6 text-lg leading-relaxed">{children}</div>
    </section>
  );
}

function Evidence({
  title,
  citations,
  children,
}: {
  title: string;
  citations: SourceId[];
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-2xl border p-6 sm:p-8"
      style={{ borderColor: "rgba(13,27,42,0.16)", background: "white" }}
    >
      <h3
        className="text-2xl leading-tight"
        style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
      >
        {title}
        <Cite ids={citations} />
      </h3>
      <ul className="mt-5 space-y-4 pl-5">{children}</ul>
    </section>
  );
}

function ComparisonRow({
  label,
  left,
  right,
}: {
  label: string;
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <tr className="border-t" style={{ borderColor: "rgba(13,27,42,0.12)" }}>
      <th className="p-5 align-top" scope="row">
        {label}
      </th>
      <td className="p-5 align-top">{left}</td>
      <td className="p-5 align-top">{right}</td>
    </tr>
  );
}

function Feature({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      className="rounded-2xl border p-6"
      style={{ borderColor: "rgba(13,27,42,0.16)", background: "white" }}
    >
      <h3 className="text-2xl" style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>
        {title}
      </h3>
      <p className="mt-3 leading-relaxed opacity-85">{children}</p>
    </section>
  );
}

function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return (
    <div
      className="divide-y rounded-2xl border"
      style={{ borderColor: "rgba(13,27,42,0.16)", background: "white" }}
    >
      {faqs.map(({ question, answer, citations }, index) => {
        const isOpen = openIndex === index;
        const contentId = `faq-answer-${index}`;
        return (
          <section key={question} className="px-6">
            <h3>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-6 py-6 text-left text-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
                aria-expanded={isOpen}
                aria-controls={contentId}
                onClick={() => setOpenIndex(isOpen ? null : index)}
                style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
              >
                <span>{question}</span>
                <span aria-hidden="true" className="text-2xl">
                  {isOpen ? "−" : "+"}
                </span>
              </button>
            </h3>
            <div id={contentId} hidden={!isOpen} className="pb-6 text-lg leading-relaxed">
              {answer}
              {citations.length > 0 && <Cite ids={citations} />}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Sources() {
  return (
    <section id="sources" className="mt-24 scroll-mt-10">
      <h2
        className="mb-8 text-[clamp(2rem,4vw,3.2rem)]"
        style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
      >
        Sources
      </h2>
      <ol className="space-y-5 text-sm leading-relaxed opacity-80">
        {sources.map(([reference, url], index) => (
          <li id={`source-${index + 1}`} key={url} className="scroll-mt-10">
            <span className="mr-2 font-semibold">{index + 1}.</span>
            <a
              className="underline decoration-1 underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              href={url}
              target="_blank"
              rel="noopener"
            >
              {reference}
            </a>
          </li>
        ))}
      </ol>
      <h3 className="mt-12 text-2xl" style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>
        Further reading
      </h3>
      <ul className="mt-4 list-disc space-y-3 pl-6 text-sm leading-relaxed opacity-80">
        <li>
          Stray, J. et al. (2022). Building Human Values into Recommender Systems: An
          Interdisciplinary Synthesis. arXiv:2207.10192.
        </li>
        <li>
          Ekstrand, M. D. & Willemsen, M. C. (2016). Behaviorism is Not Enough: Better
          Recommendations through Listening to Users. RecSys '16, 221–224.
        </li>
      </ul>
    </section>
  );
}

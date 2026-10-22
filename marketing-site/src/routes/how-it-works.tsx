import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/atlus/SiteChrome";
import { pageHead, webPageStructuredData } from "@/lib/seo";

const title = "How Atlus works: a personalised daily news briefing";
const description =
  "Atlus builds a small daily paper around the interests you share: core stories you care about, stretch stories to help you learn, and discovery stories to widen your view.";

export const Route = createFileRoute("/how-it-works")({
  head: () =>
    pageHead({
      title,
      description,
      path: "/how-it-works",
      structuredData: webPageStructuredData(title, description, "/how-it-works"),
    }),
  component: HowItWorksPage,
});

function HowItWorksPage() {
  return (
    <Page headerVariant="light">
      <article
        className="mx-auto max-w-3xl px-6 pb-24 pt-40 sm:px-10"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        <p className="mb-5 text-sm tracking-[0.25em]" style={{ color: "var(--color-amber)" }}>
          HOW IT WORKS
        </p>
        <h1
          className="mb-8 text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.02] tracking-tight"
          style={{ fontFamily: "var(--font-display)", fontWeight: 800 }}
        >
          A daily paper built around what matters to you.
        </h1>
        <p className="text-xl leading-relaxed">
          Atlus is a personalised daily edition delivered by email once a day, at the time you
          choose. You tell us what interests you and what you want to understand; we use that
          context to select three full-length articles for you.
        </p>

        <section className="mt-14">
          <h2 className="text-3xl" style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>
            From onboarding to your inbox
          </h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            <StoryType
              name="Tell us"
              text="Share your interests, learning goals, existing knowledge, exclusions, and sources you already read."
            />
            <StoryType
              name="Check us"
              text="Review the profile Atlus assembles and correct anything it has misunderstood."
            />
            <StoryType
              name="Choose when"
              text="Set your delivery time. We recommend about 30 minutes after you wake up."
            />
          </div>
          <p className="mt-5 text-lg leading-relaxed">
            Create an account, complete onboarding, and see your first recommendations on Today.
            Choose when your daily email arrives.
          </p>
        </section>

        <section className="mt-14">
          <h2 className="text-3xl" style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>
            Three ways into the news
          </h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            <StoryType
              name="Core"
              text="Stories connected to the subjects you already care about."
            />
            <StoryType
              name="Stretch"
              text="Stories that move you closer to something you want to understand."
            />
            <StoryType
              name="Discovery"
              text="Stories from beyond your usual orbit, chosen to widen the view."
            />
          </div>
        </section>

        <section className="mt-14 space-y-5 text-lg leading-relaxed">
          <h2 className="text-3xl" style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>
            Personalisation with a reason
          </h2>
          <p>
            Atlus is designed to make its recommendations legible. A story should have a reason for
            appearing in your paper: something you follow, something you are trying to learn, or a
            useful connection you might otherwise miss.
          </p>
          <p>
            Onboarding creates the first version of your profile. The articles you open and feedback
            such as More like this, Less like this, Too basic, or Go further refine it over time.
            The assumptions behind those choices remain visible and editable.
          </p>
        </section>

        <section className="mt-14 space-y-5 text-lg leading-relaxed">
          <h2 className="text-3xl" style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>
            Original reporting, chosen more widely
          </h2>
          <p>
            Atlus links you to each publisher's full article rather than replacing it with an AI
            summary. Access to the original article depends on the publisher; if a link is blocked
            for you, let us know so we can improve future picks.
          </p>
          <p>
            Founder Sam Oliver curates the source list. It combines established publishers with
            specialist newsletters, independent Substacks, small outlets and international sources
            that rarely enter a typical Western media diet, including{" "}
            <a
              href="https://kuwaittimes.com/"
              target="_blank"
              rel="noopener"
              className="underline decoration-1 underline-offset-4"
            >
              Kuwait Times
            </a>
            .
          </p>
          <p>
            Every outlet is reviewed before inclusion. Alongside a recommendation, we aim to show
            its broad political perspective and where that assessment came from. A label is a clue
            about viewpoint, not a guarantee that an individual article is unbiased or accurate; the
            goal is to help you read with context and encounter more than one perspective.
          </p>
          <p>Atlus is free to use.</p>
        </section>
      </article>
    </Page>
  );
}

function StoryType({ name, text }: { name: string; text: string }) {
  return (
    <div
      className="rounded-2xl border p-5"
      style={{ borderColor: "rgba(13,27,42,0.14)", background: "white" }}
    >
      <h3 className="text-2xl" style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>
        {name}
      </h3>
      <p className="mt-2 leading-relaxed opacity-80">{text}</p>
    </div>
  );
}

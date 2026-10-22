import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/atlus/SiteChrome";
import { DoubleUnderline } from "@/components/atlus/marks";
import { Handwriting } from "@/components/atlus/Handwriting";
import { pageHead, webPageStructuredData } from "@/lib/seo";

export const Route = createFileRoute("/manifesto")({
  head: () =>
    pageHead({
      title: "Manifesto — Atlus",
      description:
        "Recommendation systems should help people become who they aspire to be. The Atlus manifesto for a healthier relationship with the news.",
      path: "/manifesto",
      type: "article",
      structuredData: webPageStructuredData(
        "Manifesto — Atlus",
        "The Atlus manifesto for a healthier relationship with the news.",
        "/manifesto",
      ),
    }),
  component: ManifestoPage,
});

function ManifestoPage() {
  return (
    <Page headerVariant="light">
      <article
        className="mx-auto max-w-3xl px-6 pb-24 pt-40 sm:px-10"
        style={{ fontFamily: "var(--font-serif)", color: "var(--color-royal)" }}
      >
        <p className="mb-6 text-sm tracking-[0.25em]" style={{ color: "var(--color-amber)" }}>
          MANIFESTO
        </p>
        <h1
          className="mb-10 text-[clamp(2.4rem,6vw,4.2rem)] leading-[1.02] tracking-tight"
          style={{ fontFamily: "var(--font-display)", fontWeight: 800 }}
        >
          Remove the noise. Join{" "}
          <span className="relative inline-block">
            Atl
            <Handwriting text="u" className="brand-u" style={{ color: "var(--color-amber)" }} />s
            <span className="pointer-events-none absolute left-0 top-[92%] w-full">
              <DoubleUnderline w={260} />
            </span>
          </span>
          .
        </h1>

        <div className="prose-lg space-y-6 text-lg leading-relaxed">
          <p>
            The feed was a good idea that outgrew its purpose. It began as a way to keep up with
            friends. Now it decides how most of the world learns what's happening, and it pushes
            news that is polemical, unverified and unchecked.
          </p>
          <p>
            Mainstream news has been unfit for purpose for longer. It still produces seriously good
            journalism, but it competes for clicks, and clicks come from emotional headlines, not
            thoughtful reporting.
          </p>
          <p>
            Atlus is built on a simple belief: the noise can be removed. The same recommendation
            systems that reward outrage can be redirected towards curiosity.
          </p>
          <p
            className="border-l-4 pl-6 text-2xl italic"
            style={{ borderColor: "var(--color-amber)", fontFamily: "var(--font-display)" }}
          >
            "Recommendation systems should help people become who they aspire to be."
          </p>
          <p className="mt-2 text-base not-italic" style={{ fontFamily: "var(--font-serif)" }}>
            Sam Oliver, Co-founder
          </p>
          <p>
            The data we hold about you is yours to see and yours to change. We keep it for one
            purpose only: improving your recommendations.
          </p>
          <p>
            Staying informed can be effortless and meaningful at the same time. That's why you
            should join Atlus.
          </p>
        </div>
      </article>
    </Page>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/atlus/SiteChrome";
import { pageHead } from "@/lib/seo";

const title = "Atlus FAQ: personalised daily news, explained";
const description =
  "How Atlus delivers three free, personalised articles by email each day, chooses sources, learns from feedback, and protects reader data.";

const questions = [
  {
    question: "What is Atlus?",
    answer:
      "Atlus is a personalised daily edition of three full-length articles, chosen around the interests you share, the subjects you want to understand, and worthwhile ideas outside your usual reading.",
  },
  {
    question: "Where and when does Atlus arrive?",
    answer:
      "By email, once a day, at the time you choose. We recommend setting it for about 30 minutes after you wake up: early enough to shape your morning, but not the first thing you see.",
  },
  {
    question: "Do I read full articles or Atlus summaries?",
    answer:
      "Full articles. Each recommendation links to the original publisher rather than replacing their reporting with an AI summary. Access can vary by publisher; tell us when an article is blocked so we can improve future picks.",
  },
  {
    question: "What does Atlus cost?",
    answer: "Nothing. Atlus is free to use.",
  },
  {
    question: "Can I start using Atlus now?",
    answer:
      "Yes. Create an account and complete onboarding to see your first recommendations on Today. You can also choose when your daily email arrives.",
  },
  {
    question: "What happens when I start onboarding?",
    answer:
      "You tell Atlus about your interests, what you want to understand, what you already know, what to avoid, and when your email should arrive. You then review the profile Atlus has assembled and correct anything it has misunderstood.",
  },
  {
    question: "What are Core, Stretch, and Discovery stories?",
    answer:
      "Core stories connect to subjects you already care about. Stretch stories help you move towards a subject you want to understand. Discovery stories introduce a useful perspective from beyond your usual reading.",
  },
  {
    question: "How are the sources selected?",
    answer:
      "Founder Sam Oliver reviews each outlet before it enters the source list, looking at ownership, sourcing, editorial standards, corrections, and whether a piece is reporting, analysis, or opinion. The list mixes established publishers with specialist newsletters, independent writers, small outlets, and international journalism. We do not treat a political leaning as a reason to exclude otherwise sound journalism.",
  },
  {
    question: "How does Atlus deal with political bias?",
    answer:
      "We make the source visible and are developing a short, sourced description of its broad political perspective to sit beside each recommendation. We also aim to prevent one viewpoint from dominating a reader's recommendations over time. An outlet label is context, not a claim that every article has the same slant, that a 'centre' outlet is unbiased, or that left/right predicts factual accuracy. If a source cannot sensibly be put on a left-right scale, we should say that rather than invent a label.",
  },
  {
    question: "Can I exclude a publisher, subject, or political perspective?",
    answer:
      "Yes. Add it to your Avoid list during onboarding or later from your profile. An exclusion can be edited or removed whenever you change your mind.",
  },
  {
    question: "Does Atlus learn from what I click?",
    answer:
      "Yes, but your explicit choices remain the foundation. Onboarding creates the first profile; the stories you open and the feedback you give then help Atlus refine it. Those changing assumptions remain visible and editable in your profile.",
  },
  {
    question: "How does feedback change my next edition?",
    answer:
      "Feedback such as More like this, Less like this, Too basic, or Go further adjusts the relevant interests and knowledge in your profile. The next edition is selected using that updated picture of you.",
  },
  {
    question: "What information does Atlus keep about me?",
    answer:
      "Your email, onboarding answers, delivery settings, exclusions, evolving recommendation profile, article opens, and direct feedback. It is kept while your account is active so Atlus can maintain your edition. You can inspect and change the information used to choose your articles, and delete your account and its data at any time. It is never sold.",
  },
  {
    question: "How can I contact Atlus?",
    answer: "Email sam@joinatlus.com.",
  },
];

const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: questions.map(({ question, answer }) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: { "@type": "Answer", text: answer },
  })),
};

export const Route = createFileRoute("/faq")({
  head: () => pageHead({ title, description, path: "/faq", structuredData: faqStructuredData }),
  component: FaqPage,
});

function FaqPage() {
  return (
    <Page headerVariant="light">
      <article
        className="mx-auto max-w-3xl px-6 pb-24 pt-40 sm:px-10"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        <p className="mb-5 text-sm tracking-[0.25em]" style={{ color: "var(--color-amber)" }}>
          FAQ
        </p>
        <h1
          className="mb-10 text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.02] tracking-tight"
          style={{ fontFamily: "var(--font-display)", fontWeight: 800 }}
        >
          A few useful answers.
        </h1>
        <div className="divide-y" style={{ borderColor: "rgba(13,27,42,0.14)" }}>
          {questions.map(({ question, answer }) => (
            <section className="py-7" key={question}>
              <h2
                className="text-2xl"
                style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
              >
                {question}
              </h2>
              <p className="mt-3 text-lg leading-relaxed opacity-85">{answer}</p>
            </section>
          ))}
        </div>
      </article>
    </Page>
  );
}

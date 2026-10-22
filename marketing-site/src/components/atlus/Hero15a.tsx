import { AnimatedHero } from "./AnimatedHero";

/** The brand's editorial introduction. The Daily Atlus lives in the solution section. */
export function Hero15a() {
  return (
    <section className="atlus-hero" aria-label="Welcome to Atlus">
      <AnimatedHero
        showEdition={false}
        ctas={
          <>
            <a href="#join" className="hero-primary-cta">
              Start onboarding <span aria-hidden="true">↗</span>
            </a>
            <a href="#how" className="hero-secondary-cta">
              The solution <span aria-hidden="true">↓</span>
            </a>
          </>
        }
      />
    </section>
  );
}

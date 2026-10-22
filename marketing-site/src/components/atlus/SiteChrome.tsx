import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Handwriting } from "./Handwriting";

/** Shared lockup keeps the header and footer brand treatment identical. */
function AtlusWordmark({ className }: { className: string }) {
  return (
    <span className={className} style={{ fontFamily: "var(--font-display)", fontWeight: 800 }}>
      <span className="sr-only">Atlus</span>
      <span aria-hidden="true">
        Atl
        <Handwriting text="u" className="brand-u" style={{ color: "var(--color-amber)" }} />s
      </span>
    </span>
  );
}

export function SiteHeader({ variant = "light" }: { variant?: "light" | "dark" }) {
  const dark = variant === "dark";
  return (
    <header
      className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between px-6 py-5 sm:px-10"
      style={{ color: dark ? "var(--color-platinum)" : "var(--color-royal)" }}
    >
      <Link to="/" aria-label="Atlus home" className="flex min-h-11 items-center gap-2">
        <AtlusWordmark className="text-2xl leading-none" />
      </Link>
      <nav className="flex items-center gap-6 text-sm" style={{ fontFamily: "var(--font-serif)" }}>
        <Link
          to="/manifesto"
          className="inline-flex min-h-11 items-center opacity-80 hover:opacity-100"
        >
          Manifesto
        </Link>
        <Link to="/team" className="inline-flex min-h-11 items-center opacity-80 hover:opacity-100">
          Team
        </Link>
        <a
          href="/#join"
          className="inline-flex min-h-11 items-center rounded-full px-4 py-2 text-xs font-semibold tracking-wide"
          style={{ background: "var(--color-amber)", color: "var(--color-royal)" }}
        >
          Start
        </a>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer
      className="relative px-6 py-14 sm:px-10"
      style={{
        background: "var(--color-royal)",
        color: "var(--color-platinum)",
        ["--color-amber" as string]: "var(--amber)",
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 sm:flex-row">
        <div>
          <AtlusWordmark className="text-3xl" />
          <p
            className="mt-3 max-w-sm text-sm opacity-70"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Daily news, personalised for you.
          </p>
        </div>
        <div
          className="grid grid-cols-2 gap-10 text-sm"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          <div>
            <p className="mb-3 text-xs uppercase tracking-widest opacity-60">Read</p>
            <ul className="-my-1 opacity-90">
              <li>
                <Link to="/" className="inline-flex min-h-11 items-center">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/manifesto" className="inline-flex min-h-11 items-center">
                  Manifesto
                </Link>
              </li>
              <li>
                <Link to="/why-now" className="inline-flex min-h-11 items-center">
                  Why now
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="inline-flex min-h-11 items-center">
                  How it works
                </Link>
              </li>
              <li>
                <Link to="/team" className="inline-flex min-h-11 items-center">
                  Team
                </Link>
              </li>
              <li>
                <Link to="/faq" className="inline-flex min-h-11 items-center">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="inline-flex min-h-11 items-center">
                  Privacy
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs uppercase tracking-widest opacity-60">Contact</p>
            <ul className="-my-1 opacity-90">
              <li>joinatlus.com</li>
              <li>
                <a href="mailto:sam@joinatlus.com" className="inline-flex min-h-11 items-center">
                  sam@joinatlus.com
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <p
        className="mx-auto mt-12 max-w-6xl text-xs opacity-50"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        © {new Date().getFullYear()} Atlus. Your data personalises your edition and is never sold.
      </p>
    </footer>
  );
}

export function Page({
  children,
  headerVariant = "light",
}: {
  children: ReactNode;
  headerVariant?: "light" | "dark";
}) {
  return (
    <div
      className="relative min-h-screen"
      style={{
        background: "var(--color-platinum)",
        color: "var(--color-royal)",
        // Light ground, so the accent has to be the darker ink to clear WCAG AA.
        // SiteFooter sits on royal and puts the bright amber back.
        ["--color-amber" as string]: "var(--color-amber-ink)",
      }}
    >
      <SiteHeader variant={headerVariant} />
      <Link
        to="/"
        className="absolute left-6 top-20 z-20 inline-flex items-center gap-2 text-sm underline decoration-1 underline-offset-4 opacity-75 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 sm:left-10"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        <span aria-hidden="true">←</span>
        Back to Atlus
      </Link>
      {children}
      <SiteFooter />
    </div>
  );
}

import {
  Outlet,
  Link,
  createRootRoute,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import appCss from "../styles.css?url";
import { siteStructuredData } from "../lib/seo";
import { SiteFooter, SiteHeader } from "../components/atlus/SiteChrome";

const socialImage = "https://joinatlus.com/og-atlus.png";

function FallbackHead({ title, description }: { title: string; description: string }) {
  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content="noindex, nofollow" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Atlus" />
      <meta property="og:image" content={socialImage} />
      <meta property="og:image:alt" content="Atlus: daily news, personalised for you" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={socialImage} />
    </>
  );
}

function FallbackPage({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative min-h-screen"
      style={{ background: "var(--color-platinum)", color: "var(--color-royal)" }}
    >
      <SiteHeader />
      <main className="flex min-h-[75vh] items-center justify-center px-6 pb-20 pt-32 sm:px-10">
        <div className="max-w-xl text-center">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}

function NotFoundComponent() {
  const title = "Page not found | Atlus";
  const description = "That page is no longer here. Return to Atlus and keep exploring.";

  return (
    <>
      <FallbackHead title={title} description={description} />
      <FallbackPage>
        <p
          className="text-2xl"
          style={{ color: "var(--color-amber-ink)", fontFamily: "var(--font-hand)" }}
        >
          A wrong turn.
        </p>
        <h1
          className="mt-3 text-[clamp(4.5rem,16vw,8rem)] font-bold leading-none"
          style={{ fontFamily: "var(--font-display)" }}
        >
          404
        </h1>
        <h2 className="mt-5 text-3xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
          Page not found
        </h2>
        <p className="mx-auto mt-4 max-w-md text-base opacity-70">{description}</p>
        <Link
          to="/"
          className="mt-8 inline-flex min-h-11 items-center justify-center rounded-full px-6 py-3 text-sm font-semibold"
          style={{ background: "var(--color-royal)", color: "var(--color-platinum)" }}
        >
          Back to Atlus
        </Link>
      </FallbackPage>
    </>
  );
}

function ErrorComponent({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const title = "This page didn't load | Atlus";
  const description = "Atlus hit a temporary problem. Try the page again or return home.";

  return (
    <>
      <FallbackHead title={title} description={description} />
      <FallbackPage>
        <p
          className="text-2xl"
          style={{ color: "var(--color-amber-ink)", fontFamily: "var(--font-hand)" }}
        >
          Something went awry.
        </p>
        <h1 className="mt-4 text-4xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
          This page didn't load
        </h1>
        <p className="mt-4 text-base opacity-70">{description}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-full px-6 py-3 text-sm font-semibold"
            style={{ background: "var(--color-royal)", color: "var(--color-platinum)" }}
          >
            Try again
          </button>
          <Link
            to="/"
            className="inline-flex min-h-11 items-center justify-center rounded-full border px-6 py-3 text-sm font-semibold"
            style={{ borderColor: "rgba(13,27,42,0.25)" }}
          >
            Go home
          </Link>
        </div>
      </FallbackPage>
    </>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { "script:ld+json": siteStructuredData },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,600;1,700&family=PT+Serif:ital,wght@0,400;0,700;1,400&family=Reenie+Beanie&family=Caveat:wght@500;700&family=Kalam:wght@400;700&family=Permanent+Marker&family=Shantell+Sans:wght@500;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}

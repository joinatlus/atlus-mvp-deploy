# Atlus marketing site

The public site for [joinatlus.com](https://joinatlus.com), built with TanStack Start, React,
TypeScript and Tailwind CSS.

## Local development

Use Node.js 20 or newer.

```sh
npm install
npm run dev
```

The development server prints its local address when it starts. To use a fixed port:

```sh
npm run dev -- --port 8080
```

## Checks

```sh
npm run lint
npm run build
```

## Site structure

- `src/routes` contains the public pages and their page metadata.
- `src/components/atlus` contains the shared Atlus interface and motion components.
- `src/lib/seo.ts` owns canonical URLs, social metadata and structured data.
- `public` contains the sitemap, crawler rules, social preview and brand images.

Set `VITE_APP_URL` when the newer product app is hosted somewhere other than
`https://app.joinatlus.com`. The public Join link opens account creation there;
the local link opens demo onboarding at `http://localhost:3000/onboarding`.

## Netlify deployment

Connect the `samoliverb-max/Atlus.news` GitHub repository as a **separate
Netlify site** for marketing. Set the production branch to `main`. In the
Netlify import screen, use these build settings, overriding automatic monorepo
detection if needed:

| Setting | Value |
| --- | --- |
| Base directory | `marketing-site` |
| Package directory | Leave unset |
| Build command | `npm run build` |
| Publish directory | `dist/client` |

The included `netlify.toml` supplies the build command and publish directory;
the Netlify Vite plugin supplies its server function. The base directory matters
because the repository root has no `package.json`.

Netlify will build new commits from GitHub after the pull request is merged into
`main`. A Deploy Preview can be built from the pull request branch before then.

Before assigning `joinatlus.com` to this site, move the product app to
`app.joinatlus.com`, set its `NEXT_PUBLIC_APP_URL` to that address, and allow
`https://app.joinatlus.com/auth/callback` in Supabase Auth. Then test account
creation and onboarding on the app subdomain before switching the public domain.

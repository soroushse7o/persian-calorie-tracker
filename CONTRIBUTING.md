# Contributing

Thanks for helping improve KaloriShomar (کالری‌شمار روزمره). This is an independent fork of
`soroushse7o/persian-calorie-tracker`; please open pull requests against
`persian-calorie-tracker-improved`.

## Prerequisites

- **Node.js >= 22** (declared as `"engines": { "node": ">=22" }` in `package.json`, matching CI and the `node:22-alpine` Docker builder). npm ships with Node.
- A POSIX-capable shell for the scripts (`bash` on Windows works via Git Bash).

## Local setup

```bash
git clone https://github.com/soroushse7o/persian-calorie-tracker-improved.git
cd persian-calorie-tracker-improved
npm ci
cp .env.example .env.local   # set VITE_SITE_URL for local builds
npx playwright install chromium   # browser required by the offline E2E test
npm run dev
```

Builds intentionally **fail without `VITE_SITE_URL`** so canonical URLs, OpenGraph tags and
`sitemap.xml` always use the real production domain:

```bash
VITE_SITE_URL="https://example.com" npm run build
```

## Tests and checks — all must pass before a PR

```bash
npm test                                             # unit + golden tests (279 tests)
npm run lint                                         # oxlint, 0 errors / 0 warnings
npm run test:coverage                                # coverage thresholds
VITE_SITE_URL="https://example.com" npm run build    # type-check + production build
npm run check:budget                                 # gzipped JS/CSS + font download budget
npm run test:e2e                                     # offline PWA + Service Worker (needs Chromium)
```

`npm run check:budget` resolves the real entry chunk from `dist/index.html` (not a filename
prefix) and fails if it cannot be found. It counts gzipped JS/CSS plus the raw bytes of the
self-hosted Vazirmatn woff2 fonts towards the total-download budget. If a legitimate change
increases the bundle, justify the new numbers in the PR description rather than silently
raising the limits.

## Pull request process

1. Fork the repository and create a focused branch from `main`.
2. Make one logical change; add or update tests for any behaviour change. Do not edit generated
   files under `dist/` (build output is not committed).
3. Run the full check list above locally.
4. Open a PR describing *what* changed, *why*, and how you verified it. Link any related issue.
5. Keep CI green. A Lighthouse CI failure is a real failure (`lighthouserc.json` treats all four
   categories as `error`), and the workflow does not use `continue-on-error`.

## Issue labels

This repository uses only these labels: `accessibility`, `bug`, `documentation`, `enhancement`,
`question`. Issue templates and Dependabot are configured with that set. If you create a
`dependencies` or `ci` label in GitHub Settings, update `.github/dependabot.yml` and the issue
templates accordingly — they currently map dependency and catalog updates to `enhancement`.

## Security

Please **do not** open a public issue for a security problem. Use the private disclosure route in
[SECURITY.md](./SECURITY.md).

## Deployment files

- `vercel.json` — Vercel headers/rewrites (`CSP`, HSTS preload, PWA caching).
- `Caddyfile` — Railway Docker runner; its CSP mirrors `vercel.json` and `public/_headers`.
- `public/_headers` + `public/_redirects` — Cloudflare Pages static hosting configuration.

Keep the security headers in these three places in sync when changing the CSP.

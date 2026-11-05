# Pixel Crawler Analytics

Track website visits, classify AI crawler user agents, and explore site-level
analytics. Built with Next.js, Supabase Auth/Postgres/Edge Functions, and shadcn UI.

[Live app](https://crawler-analytics.vercel.app) · [Architecture](docs/architecture.md) · [Testing guide](docs/testing.md)

## Improvements & tradeoffs

See [planned improvements](docs/improvements.md) for deliberate v1 tradeoffs,
known limitations, and future work beyond the assignment.

## Features

- Sign up, sign in, and sign out with email and password.
- Add websites and keep each account's site data isolated.
- Copy a site-specific tracking snippet with instructions for installing it.
- Check tracker installation from your browser without adding analytics events.
- View visit totals, active bots, timelines, platform breakdowns, top pages, and recent events.
- Filter all dashboard sections by 24h/7d/30d, platform, and bot type.
- Download a CSV of all recorded events for a site, across all dates.

## Demo

A captioned walkthrough recorded locally with synthetic data:

https://github.com/user-attachments/assets/85aea5de-9b59-41df-915e-37c6c73a59b0

[Download video to see with subtitles](docs/demo/crawler-analytics.mp4?raw=1) · [Captions](docs/demo/crawler-analytics.srt)

## Run locally

Prerequisites: **Node.js 24**, npm, and a running Docker-compatible runtime.
The Supabase CLI is included in the project dependencies.

From a fresh checkout:

```sh
npm ci
cp .env.example .env.local
npm run supabase:start
npx supabase migration up
npx supabase status
```

The first Supabase start downloads container images. Set `.env.local` using the
local publishable key (or legacy anon key) shown by `supabase status`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_LOCAL_PUBLISHABLE_KEY
```

Never use a secret/service-role key in these public variables. Start the functions
and frontend in separate terminals:

```sh
npm run functions:serve
```

```sh
npm run dev
```

Open [localhost:3000](http://localhost:3000), create an account, and add a hostname
such as `example.com` (no scheme, path, or port). Click a site to install its
tracker and see analytics. Restart Next.js after changing environment variables.

Stop terminal processes with Ctrl+C; stop local Supabase with `npx supabase stop`.
For a full local tracker installation check, follow the [testing guide](docs/testing.md#manually-check-a-local-installation).

## Demo data

With local Supabase running and migrations applied:

```sh
npm run seed:analytics
```

Sign in locally with **analytics-demo@example.com** / **Local-analytics-demo-123!**
and open `analytics-demo.example`. The script creates 10,000 classified events
across the last 30 days and verifies their counts. Reruns replace that dedicated
demo site's events; other sites are untouched. This account/data is local only.

## Checks

```sh
make format           # Format source files
make check            # Formatting and TypeScript
npm run test:unit     # Classification, IP hashing, and CSV serialization
npx supabase test db  # Local database policies and analytics
npm run build         # Production build
```

For browser integration tests, keep local Supabase and the functions running:

```sh
npx playwright install chromium firefox webkit
npm run test:bots
```

Playwright manages fixture servers on ports 3001 and 3003; leave both free.
See the [testing guide](docs/testing.md) for targeted tests and the separate
opt-in hosted suite, which sends real events to the deployed collector.

## Deploy

Apply backend changes before deploying the frontend:

```sh
npx supabase login
npx supabase migration up --remote=YOUR_PROJECT_REF
npx supabase functions deploy track --project-ref YOUR_PROJECT_REF
```

Import the GitHub repository into Vercel as a **Next.js** project, using the
repository root and **Node.js 24**. Set these Vercel environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_HOSTED_PUBLISHABLE_KEY
```

In Supabase Auth, enable Email login, set the **Site URL** to the production app
URL, and allow `https://YOUR_APP_DOMAIN/login` as a redirect. If email confirmation
is enabled, users must confirm before signing in. Configure [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
for confirmation emails to external users.

Vercel redeploys the frontend when its production branch changes. Supabase
migrations/functions still deploy separately. Public environment-variable changes
require a rebuild. Copy tracking snippets from the deployed app for live websites.

## Key limitations

JavaScript-only collection misses crawlers that do not execute the snippet.
Unknown includes unrecognized bots and ordinary browsers, so totals are labeled
recorded visits. User agents are claimed identities; plain IP hashing is not
strong anonymisation. The [architecture guide](docs/architecture.md) explains
these behaviors and the current query/export limits.

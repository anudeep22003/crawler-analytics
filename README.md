# Pixel Crawler Analytics

The public entry point at `/` displays the email/password login page, also
available at `/login`. Signed-in users go to `/dashboard` to add sites.
The dashboard requires a session; Postgres RLS enforces data ownership.

Authentication state and actions live in `hooks/use-auth.ts`; the login page
renders the form. Site loading and submission live in `hooks/use-sites.ts`. The original greeting Edge Function remains
available as a standalone local smoke check.

## Email/password authentication

Set these values in `.env.local` using your Supabase project's Connect dialog:

```text
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Use the publishable key (or legacy anon key), never a secret/service-role key.
Restart `npm run dev`, then open <http://localhost:3000/login>.
Enable the Email provider in Supabase Auth. In Auth URL Configuration, set your
Site URL to `http://localhost:3000` and allow `http://localhost:3000/login` as a
redirect URL. Add the equivalent HTTPS URLs when deploying, and configure both
environment variables on the hosting platform before building.

Choose **New here? Sign up** to create an account. If email confirmation is
enabled, follow the email link before signing in; otherwise signup signs you in
immediately. The dashboard displays your email and a **Sign out** button.
Reloading restores your session. Verify signup, reload, sign-out, and sign-in
with the same credentials; incorrect credentials should display an error.

One `supabase-js` client in `lib/supabase.ts` manages localStorage persistence,
token refresh, and authentication headers. No SSR auth client or middleware is
used. Client-side session display is not an authorization boundary; sites are
protected by database RLS policies.

## Sites database setup

Apply the migration to the database used by your frontend before adding sites.
For local Supabase:

```sh
npx supabase migration up
npx supabase test db
```

For your hosted project (substitute its project reference):

```sh
npx supabase login
npx supabase migration up --remote=YOUR_PROJECT_REF
```

The migration creates `sites`, a unique `(user_id, domain)` index, hostname
validation, and owner-only SELECT/INSERT policies. The next migration adds
`crawler_events` with site/time and platform indexes and owner-only reads. Hostnames are trimmed and lowercased; enter `example.com`, not a URL.
`www.example.com` is a separate site. Different accounts may add the same domain.

Verify: sign in, add a domain, reload and confirm it remains listed. Adding it
again should show a duplicate error. Sign out and visit `/dashboard` to verify
the login redirect. Another account should not see the first account's sites.
The rollback-only SQL tests cover uniqueness and account isolation.

## Site analytics and demo data

Each `/s/{site_id}` page displays these sections together:

- Overview: recorded visits, active bots, top platform, and top page.
- Visits over time: shadcn/Recharts timeline with zero-filled intervals.
- Platforms: horizontal bar chart ranked by visits.
- Top pages: up to 10 paths ranked by visits (queries are grouped together).
- Recent activity: latest 50 events with UTC time, page, bot, platform, type, and user agent.
- Installation snippet and instructions below the analytics.

Period (24h/7d/30d), platform, and bot-type filters apply to every analytics
section. `hooks/use-site-activity.ts` makes **one `site_activity` RPC per selection**.
Postgres computes the summaries and returns only the bounded recent-events list;
the browser does not download all events. Presentation components receive prepared
values. Filter options reflect the full selected period, so choosing a platform
or bot type does not remove other choices.

The RPC runs with caller RLS permissions. Windows include their start and exclude
their end. All filters share the page's load-time snapshot; reload for fresh data.
Buckets are hourly for 24h and daily for 7d/30d, anchored at the window start.
Active bots means distinct recognized bot names in the filtered window, excluding
Unknown; it does not mean currently online. Recorded visits include unclassified
traffic. Historical null classifications are grouped as Unknown. Tied platform
and page counts sort alphabetically for deterministic results.

Apply the latest migration to the same database your frontend uses before opening
the expanded dashboard. It replaces the original RPC with an extended signature
whose platform/type parameters default to no filter. CSV export is a separate
future workflow and is not part of the dashboard RPC.

Create a persistent **local-only** demo dataset:

```sh
npm run supabase:start
npx supabase migration up
npm run seed:analytics
```

The script creates `analytics-demo@example.com` with password
`Local-analytics-demo-123!` and a site named `analytics-demo.example`. It prints
the site URL and inserts **10,000 events** with random timestamps in the last
30 days. User agents are chosen from the ten signatures in the spec's table plus
`Unknown`, with at least one event for each. The script uses the same classifier as the collector to populate `bot_name`,
`platform`, and `bot_type`, then verifies every period and classified user-agent
count against the generated data.
Reruns replace all events on this dedicated demo site, including the old seed,
while leaving other sites and accounts intact. Each run generates new random data.
The data stays available until explicitly removed or the local database is reset.

For a fixed reference time, use `npm run seed:analytics -- 2030-02-01T00:00:00Z`.
The UI always uses current time; use the default seed command for a live demo.
Expected counts age as events move out of the selected window.

To view the local demo, point `.env.local` at `http://127.0.0.1:54321` and use the
local publishable/anon key from `npx supabase status`, then restart Next.js and
sign in with the demo account. The script never changes hosted project data.
Apply the new migration to your hosted project before using analytics there.

Run `npx supabase test db` for boundary, zero-bucket, and ownership checks.

## Run locally

Prerequisites: Node.js 24 LTS, npm, and a running Docker Desktop (or compatible
Docker runtime). The Supabase CLI is installed with the project dependencies.

```sh
npm ci
cp .env.example .env.local
npm run supabase:start
```

The first start downloads container images and can take several minutes.
Then run these in separate terminals from the repository root:

```sh
# Terminal 1: Edge Function, with local reloads
npm run functions:serve
```

```sh
# Terminal 2: Next.js
npm run dev
```

Open <http://localhost:3000> to sign in or create an account. When using hosted
Supabase Auth, only Next.js needs to run; local Docker and the Edge Function are
optional. The greeting endpoint is public and requires no API key.

To check the function independently:

```sh
curl --fail-with-body -X POST http://127.0.0.1:54321/functions/v1/hello-world
```

For local function errors, check Docker and the function terminal.
After changing `.env.local`, restart Next.js. Stop the terminal processes with
Ctrl+C and stop the project's containers with `npx supabase stop`.

## Checks

```sh
make format       # Prettier
make check        # Formatting and frontend TypeScript
npm run build     # Production build
```

With Deno installed, `deno check supabase/functions/hello-world/index.ts`
checks the function separately: it runs in Deno, while Next.js uses Node.js.

## Install the tracker

Click a saved site on the dashboard to open `/s/{site_id}`. Copy its snippet and
paste it once into the `<head>` of each tracked page (or a shared template).
The shared `/tracker.js` file reads `data-site-id` and `data-collector-url`.
The latter is derived from `NEXT_PUBLIC_SUPABASE_URL`; no secret is embedded.
Use the snippet from a deployed dashboard for live websites. A localhost script
URL is only accessible on your development machine. Sites with a Content Security
Policy must allow the script origin in `script-src` and collector in `connect-src`.

The collector persists valid visits in `crawler_events`, including ordinary
browsers for now. It finds the site by UUID, checks the reported page hostname,
and inserts a new event with the HTTP user agent, page URL/path, and database
receipt timestamp. Success includes the saved event UUID and is returned only
after insertion succeeds. Storage failures return HTTP 500; invalid payloads,
unknown sites, and hostname mismatches return HTTP 400.

The shared classifier in `supabase/functions/_shared/classify-bot.mjs` populates
`bot_name`, `platform`, and `bot_type` from the HTTP header. It recognizes the
spec's signatures case-insensitively within full user-agent strings. Unmatched
traffic (including ordinary browsers) is `Unknown` / `Unknown` / `unknown`;
this is unclassified traffic, not proof of an unknown bot. The spec's Extended
control tokens are supported for synthetic traffic only. IP hashing remains deferred.
Existing non-demo events are not backfilled; the seed recreates its demo events.
No schema migration is needed for these already-existing columns.
The public site ID and claimed hostname do not authenticate the sender or prove
crawler identity. Site IDs choose the destination even when two owners share a
domain. Dashboard users can read only their own events and cannot insert them
directly. The collector uses Supabase's injected `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY`, never frontend credentials.

Run `npm run test:unit` for the classifier mapping and fallback tests.

## Headless tracking checks

Start Docker and local Supabase, then serve the functions:

```sh
npm run supabase:start
npx supabase migration up
npm run functions:serve
```

In another terminal:

```sh
npx playwright install chromium firefox webkit # Repeat after Playwright upgrades
npm run test:bots
```

Playwright starts and stops two tiny servers: the customer HTML page on port 3001
and the real `public/tracker.js` asset on port 3003. Both ports must be free.
The fixture embeds the snippet in its head with a real test site UUID supplied
through its `site_id` query parameter. The collector runs locally on port 54321.
Tests obtain local credentials from `supabase status`, create two disposable
users with sites sharing `127.0.0.1`, and remove them and their events afterward.
They never use the hosted project configured in `.env.local`. Next.js is not needed.

All 11 signatures run in Chromium, Firefox, and WebKit: **33 browser tests**
assert navigation headers, `navigator.userAgent`, collector responses, and the
saved Postgres row, including classification. Nine additional API cases verify
same-domain attribution, invalid sites/hostnames, and that client-supplied labels
cannot override HTTP-header classification. **42 tests passed in 13.6s**,
excluding container startup. Firefox needs explicit test
HTTP header overrides as well as the context user agent for fetch requests.

Watch the `npm run functions:serve` terminal for structured logs such as:

```json
{
  "event": "tracking_saved",
  "event_id": "a342d0e7-a3db-45bc-b30b-3b346e231d03",
  "site_id": "00000000-0000-0000-0000-000000000001",
  "page_url": "http://127.0.0.1:3001/",
  "user_agent": "GPTBot"
}
```

The list reporter prints per-test and total durations and exits nonzero on failure.
Use `time npm run test:bots` for wall time, or
`npm run test:bots -- --project=firefox` for one engine. Tests run sequentially.

These are synthetic user-agent checks, not emulations of actual crawler behavior.
`Google-Extended` and `Applebot-Extended` are control tokens included for spec
coverage. `Claude-Web` comes from the brief's classification example.

## Deploy later

1. Apply the migrations before deploying the updated collector:

   ```sh
   npx supabase login
   npx supabase migration up --remote=YOUR_PROJECT_REF
   npx supabase functions deploy track --project-ref YOUR_PROJECT_REF
   ```

2. Import this repository into Vercel as a Next.js project. Before building, set:

   ```text
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
   ```

3. Deploy and verify login, then copy and install a site snippet. `NEXT_PUBLIC_` values are embedded at
   build time, so changing the URL requires rebuilding/redeploying. This URL
   is public; never put a Supabase secret/service-role key in a public variable.

For another Node.js host, set the same environment variable before running
`npm ci && npm run build`, then serve with `npm start`.

References: [Next.js setup](https://nextjs.org/docs/app/getting-started/installation)
and [Supabase Edge Functions](https://supabase.com/docs/guides/functions/quickstart).

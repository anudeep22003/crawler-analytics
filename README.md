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
validation, and owner-only SELECT/INSERT policies. It does not create crawler
events. Hostnames are trimmed and lowercased; enter `example.com`, not a URL.
`www.example.com` is a separate site. Different accounts may add the same domain.

Verify: sign in, add a domain, reload and confirm it remains listed. Adding it
again should show a duplicate error. Sign out and visit `/dashboard` to verify
the login redirect. Another account should not see the first account's sites.
The rollback-only SQL tests cover uniqueness and account isolation.

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

This increment logs every valid visit, including ordinary browsers, without
classification or persistence. The collector validates payload shape but does
not yet look up the site or verify its hostname. The public site ID identifies
a tracking property; it does not authenticate an event. A successful response
confirms transport only. No crawler events table is introduced.

## Headless tracking checks

Start Docker and local Supabase, then serve the functions:

```sh
npm run supabase:start
npm run functions:serve
```

In another terminal:

```sh
npx playwright install chromium firefox webkit # Repeat after Playwright upgrades
npm run test:bots
```

Playwright starts and stops two tiny servers: the customer HTML page on port 3001
and the real `public/tracker.js` asset on port 3003. Both ports must be free.
The fixture embeds the snippet in its head, with a synthetic site UUID and the
local collector on port 54321. Next.js and a seeded site are not required.

All 11 signatures run in Chromium, Firefox, and WebKit: **33 headless tests**.
They check navigation headers, `navigator.userAgent`, and the actual collector's
JSON acknowledgement of the site ID, page URL, and HTTP user agent. This exercises
cross-origin script loading and JSON POST/preflight handling without mocking the
collector. The latest local run passed all 33 cases in **7.7s** (**8.00s wall time**),
excluding container startup. Firefox needed an explicit test HTTP header override as well as the
context user agent to propagate spoofed identities to fetch requests.

Watch the `npm run functions:serve` terminal for structured logs such as:

```json
{
  "event": "tracking_received",
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

1. Create a hosted Supabase project, then deploy the function:

   ```sh
   npx supabase login
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

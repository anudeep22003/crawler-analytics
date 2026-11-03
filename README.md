# Pixel Crawler Analytics

The public entry point at `/` displays the email/password login page, also
available at `/login`. Future application pages will require an authenticated
session. Application database tables are not introduced yet.

Authentication state and actions live in `hooks/use-auth.ts`; the login page
renders the form and account view. The original greeting Edge Function remains
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
immediately. The signed-in view displays your email and a **Sign out** button.
Reloading restores your session. Verify signup, reload, sign-out, and sign-in
with the same credentials; incorrect credentials should display an error.

One `supabase-js` client in `lib/supabase.ts` manages localStorage persistence,
token refresh, and authentication headers. No SSR auth client or middleware is
used. Client-side session display is not an authorization boundary; future data
access will require database RLS policies.

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

## Headless bot user-agent checks

```sh
npx playwright install chromium firefox webkit # Repeat after Playwright upgrades
npm run test:bots
```

Playwright starts a tiny Node.js server at `http://127.0.0.1:3001` and stops it
after the run. It serves `tests/fixtures/customer-site/index.html`, representing
a customer website on a separate origin from the dashboard and collector.
Port 3001 must be free; an existing server is deliberately not reused.
Next.js, Supabase, and Docker are not required for these tests.

Each of the 11 signatures gets a fresh browser context in Chromium, Firefox,
and WebKit: **33 headless tests**. Tests assert the fixture page loads, the
navigation request's `User-Agent` header, and `navigator.userAgent`.
The fixture has no tracking snippet yet, so this does not test collector CORS.

The list reporter prints each test's duration and the total; failures exit nonzero.
Tests run sequentially with one worker. To include command startup overhead:

```sh
time npm run test:bots
```

Example measured locally: **33 passed in 12.5s**, **12.87s wall time**, including
fixture server startup and shutdown. Browser installation is excluded. Individual
tests took 41–185ms in Chromium, 124–653ms in Firefox, and 142–579ms in WebKit.
Timing varies with the machine and browser startup overhead.

To run just one engine: `npm run test:bots -- --project=firefox`.

These are synthetic user-agent checks, not emulations of actual crawler behavior.
`Google-Extended` and `Applebot-Extended` are included for spec coverage even though
they are robots.txt control tokens, not separate crawler HTTP identities.
`Claude-Web` comes from the brief's classification example.

## Deploy later

1. Create a hosted Supabase project, then deploy the function:

   ```sh
   npx supabase login
   npx supabase functions deploy hello-world --project-ref YOUR_PROJECT_REF
   ```

2. Import this repository into Vercel as a Next.js project. Before building, set:

   ```text
   NEXT_PUBLIC_HELLO_FUNCTION_URL=https://YOUR_PROJECT_REF.supabase.co/functions/v1/hello-world
   ```

3. Deploy and verify the login flow. `NEXT_PUBLIC_` values are embedded at
   build time, so changing the URL requires rebuilding/redeploying. This URL
   is public; never put a Supabase secret/service-role key in a public variable.

For another Node.js host, set the same environment variable before running
`npm ci && npm run build`, then serve with `npm start`.

References: [Next.js setup](https://nextjs.org/docs/app/getting-started/installation)
and [Supabase Edge Functions](https://supabase.com/docs/guides/functions/quickstart).

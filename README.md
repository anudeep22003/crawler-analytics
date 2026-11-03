# Pixel Crawler Analytics

First working slice: a Next.js page calls a Supabase Edge Function. Clicking
**Say hello** logs `Hello world` in the browser console, invokes the function,
and displays its JSON response: `{"message":"Hello world"}`. The function also
logs the greeting in its own terminal. No database writes or sign-in yet.

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

Open <http://localhost:3000>, open the browser console, and click **Say hello**.
The page calls the function directly on port 54321; its CORS handling permits
the browser request. This greeting endpoint is intentionally public
(`verify_jwt = false`) and requires no API key.

To check the function independently:

```sh
curl --fail-with-body -X POST http://127.0.0.1:54321/functions/v1/hello-world
```

If the page reports a network error, check Docker and the function terminal.
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

3. Deploy and repeat the button check. `NEXT_PUBLIC_` values are embedded at
   build time, so changing the URL requires rebuilding/redeploying. This URL
   is public; never put a Supabase secret/service-role key in a public variable.

For another Node.js host, set the same environment variable before running
`npm ci && npm run build`, then serve with `npm start`.

References: [Next.js setup](https://nextjs.org/docs/app/getting-started/installation)
and [Supabase Edge Functions](https://supabase.com/docs/guides/functions/quickstart).

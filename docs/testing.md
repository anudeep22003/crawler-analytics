# Testing and demo data

[Back to README](../README.md) · [Architecture](architecture.md) · [Improvements](improvements.md)

## Local checks

Install dependencies and start local Supabase using the
[quick start](../README.md#run-locally). Keep `npm run functions:serve` running
for collector tests. The automated browser suite does not need Next.js.

| Check                            | Command                | Prerequisites                                      |
| -------------------------------- | ---------------------- | -------------------------------------------------- |
| Formatting and TypeScript        | `make check`           | Node.js 24 and installed dependencies              |
| Unit tests                       | `npm run test:unit`    | Node.js 24                                         |
| Database policies and aggregates | `npx supabase test db` | Local Supabase with migrations applied             |
| Browser and API integration      | `npm run test:bots`    | Local Supabase, functions, and Playwright browsers |
| Production build                 | `npm run build`        | Frontend environment variables configured          |

Install browsers once, and again after Playwright upgrades:

```sh
npx playwright install chromium firefox webkit
```

For a separate Edge Function type check with Deno installed:

```sh
deno check --no-lock --node-modules-dir=none supabase/functions/track/index.ts
```

## What the tests verify

- Unit tests: signature classification, unknown fallback, IP normalization/hashing, and CSV serialization.
- SQL tests: ownership policies, uniqueness, time boundaries, zero buckets, shared filters, and installation-check permissions.
- Tracking integration: real cross-origin snippet delivery and persisted event fields across Chromium, Firefox, and WebKit.
- Attribution: two owners sharing a domain receive events under the supplied site UUID; invalid sites/hostnames are rejected.
- Installation checks: the matching attempt is confirmed without adding an event; invalid, expired, and other-site attempts are rejected.
- Exports: all dates, timestamp ties, API row caps, account isolation, empty output, upper bounds, and cancellation.

Playwright starts and stops the customer fixture on port **3001** and the actual
tracker asset on port **3003**. Leave both ports free before running the suite.
Tests get local credentials from `supabase status`, create disposable users/sites,
and delete them and their events afterward. They do not use `.env.local` to select
a hosted backend. SQL tests roll back their fixtures.

Tests run sequentially and report per-test and total duration. Use `time npm run test:bots` for command wall time. Firefox uses both a context user agent and an
explicit network-header override so fetch requests carry the spoofed signature.
These checks simulate identities; they do not reproduce actual crawler behavior.

Run a smaller selection when working on one feature:

```sh
npm run test:bots -- --project=chromium
npm run test:bots -- tests/installation-check.spec.ts
npm run test:bots -- tests/export-events.spec.ts --project=chromium
```

## Persistent demo data

`npm run seed:analytics` creates the dedicated local account and site documented
in the README, then inserts 10,000 events randomly distributed over the last
30 days. The ten user agents in the brief's table plus Unknown are represented.
The seed uses the collector's classifier and verifies period and classification
counts through the demo user's authenticated queries.

Rerunning replaces all events on that dedicated demo site, including previous
seed data, but leaves other sites and accounts alone. Each run generates a new
distribution. The data stays available for manual exploration; it is not an
automatically cleaned integration fixture.

An optional timestamp fixes the reference time, not the random distribution:

```sh
npm run seed:analytics -- 2030-02-01T00:00:00Z
```

The dashboard uses current time, so use the default seed command for a live demo.
Counts naturally change as events age out of a selected window. The local demo
account and events do not exist in hosted Supabase unless separately created there.

## Manually check a local installation

With Next.js and local functions running, start these in separate terminals:

```sh
node tests/fixtures/customer-site/server.ts
```

```sh
node tests/fixtures/tracker-server.ts
```

Register **127.0.0.1** as a site in the local app. On its site page, expand
**Install tracking** and enter `http://127.0.0.1:3001/?site_id=YOUR_SITE_ID` as
the page URL to check. The fixture's `site_id` parameter configures its snippet;
the dashboard adds a separate `tracker_test` parameter for the check attempt.

Allow the new tab to open, then return to the dashboard. Confirmation should
populate `installation_checks.received_at` without changing crawler-event counts.
Stop these manually started fixture servers before running Playwright tests.

For an actual website, paste its copied snippet once into each page's `<head>`
or shared template. Use the deployed dashboard's snippet for public websites.
CSP rules must permit the script origin in `script-src` and collector in `connect-src`.

## Opt-in hosted test

```sh
npm run test:hosted
```

**This sends live traffic.** The hosted fixture loads the real Vercel script and
uses the site ID and collector URL in `tests/fixtures/customer-site/hosted.html`.
The hosted site must be registered as `127.0.0.1`. Update both the HTML and
`tests/hosted/tracker.spec.ts` constants when changing deployments or sites.

A successful full run creates 33 events: eleven signatures across three browser
engines. Page URLs include a run, browser, and user-agent marker. The suite checks
saved-event acknowledgements and keeps receipts in `test-results/hosted`; it does
not independently query the hosted database or remove those events.

Only port 3001 is needed; Playwright manages that fixture server. Local Supabase
and Next.js are unnecessary. Hosted tests are excluded from `npm run test:bots`,
disable retries, and stop at the first failure to avoid repeated live writes.

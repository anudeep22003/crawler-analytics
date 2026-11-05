# Architecture and behavior

[Back to README](../README.md) · [Testing](testing.md) · [Improvements](improvements.md)

## System flow

The customer page loads `tracker.js` asynchronously. The script posts its site
UUID and current page URL to a Supabase Edge Function, which validates,
classifies, and stores the visit in Postgres. The Next.js dashboard reads through
the Supabase SDK and database functions using the signed-in user's session.

Components render data; hooks own application state and actions. Shared helpers
handle classification, domain validation, and CSV serialization. Node.js 24 runs
the TypeScript seed scripts and tests directly; the public tracker stays plain
JavaScript so customer browsers can execute it without a build step.

## Authentication and ownership

One browser `supabase-js` instance persists and refreshes sessions and attaches
authentication headers. There is no SSR auth client or middleware. Client-side
redirects provide the navigation experience; Postgres RLS enforces access.

Sites belong to `auth.users` and are unique per `(user_id, domain)`. Hostnames
are trimmed and lowercased, with no scheme, path, or port. `www.example.com` and
`example.com` are separate sites. Different owners may register the same domain.
Events reference the site UUID, so domain sharing never determines attribution.

Owners can create/read their sites and read their events. The collector uses
Supabase's server-only credentials to insert events. Public site IDs and reported
hostnames identify destinations but do not authenticate senders or prove domain control.

## Collection and classification

The shared script reads `data-site-id` and `data-collector-url` from its script
element. The collector checks payload shape, looks up the exact site UUID, and
compares the reported URL's hostname with the registered domain. It records the
HTTP user agent, URL/path, classification, and a database receipt timestamp.
Success is acknowledged only after insertion; invalid input returns HTTP 400 and
storage failures return HTTP 500.

Signature matching populates `bot_name`, `platform`, and `bot_type`. Unmatched
traffic, including ordinary browsers, is labeled Unknown. It is not proof of an
unknown bot. The assignment's Google-Extended and Applebot-Extended matches are
supported for synthetic traffic even though those are robots.txt control tokens.
Claude-Web is retained from the brief's classification example.

Valid `CF-Connecting-IP`, or fallback `X-Real-IP`, metadata is normalized and
SHA-256 hashed into `ip_hash`. Missing/invalid metadata leaves it null. Raw IP
metadata is not added to event rows, application logs, or responses. Plain hashing
is a deliberate v1 limitation; the [improvement plan](improvements.md) covers HMAC
and hosted-header verification. Old events are not backfilled automatically.

## Installation checks

An owner requests an expiring `installation_checks` row, then opens a customer
page with `tracker_test=CHECK_ID`. Existing snippets already send the full URL.
The collector confirms only a pending, unexpired check for the supplied site and
does not insert a crawler event. Owners cannot set confirmation timestamps.

The dashboard polls that particular row every two seconds for up to one minute,
only while a check is active. Navigation ends polling; each retry gets a new ID.
Expiry prevents confirmation but does not delete the row. Success confirms the
checked page's signal, not site-wide coverage or ownership.

## Analytics

One `site_activity` RPC per filter selection returns all dashboard sections.
The function runs as the caller, preserving RLS, and aggregates a site/time-bounded
dataset in Postgres rather than sending all events to the browser.

| Section         | Behavior                                                                |
| --------------- | ----------------------------------------------------------------------- |
| Overview        | Total recorded visits, distinct recognized bots, top platform, top page |
| Timeline        | Zero-filled hourly buckets for 24h; daily buckets for 7d/30d            |
| Platforms       | Counts grouped and ranked by platform                                   |
| Top pages       | Up to 10 page paths, grouping query-string variants together            |
| Recent activity | Latest 50 matching events, ordered by timestamp and UUID                |

Period, platform, and bot-type filters apply to every section. Platform options
come from the full selected period so filtering does not hide other choices.
Windows include their start and exclude their end; buckets start at the window's
start and use UTC labels. Filter changes reuse the end time captured when the
page opened; reload to advance it. Ties in rankings sort alphabetically.

Totals include unclassified visits. Active bots excludes Unknown and means
distinct recognized names in the selected window, not bots currently online.
Historical null classifications are displayed as Unknown.

## CSV export

Export is separate from analytics and includes every stored event field for the
selected site across all dates, regardless of dashboard filters. It uses the
signed-in Supabase instance, so RLS applies. Empty sites produce a header-only file.

JSON batches are ordered by timestamp, then UUID to handle ties. The newest
visible event establishes an upper bound, and each batch advances a strict lower
cursor without losing timestamp precision. Short API-capped batches do not end
pagination. Papa Parse serializes the batches with CSV escaping and spreadsheet
formula protection; formula-like values receive an apostrophe prefix.

Only CSV chunks accumulate, but the full file still occupies browser memory.
Failed batches produce no partial download, and leaving the page cancels requests.
Separate reads are not a transactional snapshot: concurrent backdated inserts,
edits, or deletions can affect the export. See the documented improvements before
expanding this into a large-scale export service.

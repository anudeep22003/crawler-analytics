# Improvements

This backlog records deliberate v1 tradeoffs and future work, not a list of
unimplemented acceptance criteria. Items explicitly beyond the assignment are
marked below. Existing functionality should remain usable as each is introduced.

## Add password recovery

Add a forgot-password request and password-reset page using Supabase Auth.
Handle expired links and configure local/hosted redirect URLs and email delivery.
This was deliberately deferred while implementing email/password signup and login.

## Collect visits without JavaScript — post-assignment scope

The snippet cannot observe crawlers that fetch HTML without executing JavaScript.
Explore server-side instrumentation or CDN/server-log ingestion as a later
collection path. Preserve site attribution and avoid double-counting visits
observed by multiple collectors. The brief explicitly places server-side
tracking in v2 and excludes server-log analysis from the current scope.

## Verify domain control

Adding a domain and receiving a beacon do not establish publishing control.
Introduce an account/site-specific DNS, hosted-file, or meta-tag challenge that
our backend verifies independently. Keep domain verification distinct from the
existing installation check, which confirms a particular tracking signal.

## Verify crawler identities and maintain signatures

User-agent matching identifies a claimed crawler identity, not its authenticity.
Evaluate provider-supported verification methods separately from classification.
Maintain signature sources and review dates, distinguish HTTP identities from
robots.txt control tokens, and define how registry updates affect old events.
Historical events could be reclassified from their stored user agents through
an explicit, testable backfill rather than silently changing historical reports.

## Browse beyond dashboard limits

The dashboard deliberately returns only the top 10 page paths and latest 50
matching events. Add pagination or drill-down views when users need to inspect
more rows. Retain stable ordering, shared filter semantics, and owner isolation.
The existing all-data CSV export remains available independently of those limits.

## Add richer time controls — post-assignment scope

Keep the current 24h/7d/30d presets as the baseline. Later, consider custom date
ranges and a draggable chart window, with explicit bucket and timezone behavior.
Custom ranges beyond the presets are expressly outside the assignment's scope.

## Support larger and snapshot-consistent exports

Exports currently buffer the entire CSV in browser memory, even though JSON
rows are fetched and serialized in batches. Introduce server-side streaming or
background export jobs if measured file sizes justify it. Define a consistent
database snapshot if exports must remain unchanged during concurrent writes;
the current upper cursor does not freeze backdated inserts, edits, or deletions.

## Measure performance with a million events

The current demo seed creates 10,000 events. Add configurable, repeatable bulk
generation for a million-event dataset, including a case where those events all
fall within the selected period. Measure query latency, response size, export
memory, and browser responsiveness while checking totals and ownership isolation.
Document an evidence-based capacity/upgrade path. Add rollups, caching, queues,
or partitioning only when measurements demonstrate the need.

## Clean up installation checks

Checks expire after one minute, but expiry only prevents confirmation; it does
not delete rows. Define a short retention period and scheduled cleanup for
expired/completed attempts, preserving active checks and any needed diagnostics.

## Automate Supabase deployments

Vercel deploys the frontend from GitHub, while migrations and Edge Functions
currently require manual commands. Add CI checks and a controlled backend
deployment workflow with separate environments and server-only credentials.
Preserve migration/function/frontend rollout ordering and plan recovery when
one deployment step fails.

## Support more flexible site identities

Sites are currently unique per owner and exact hostname. `www.example.com` and
`example.com` are separate, while ports are excluded. Later, define explicit
aliases or tracking properties for subdomains, ports, environments, or website
sections. Keep site UUID attribution and avoid silently merging historical data.

## Automate installation verification

The current check opens a user-selected page in their browser. A future hosted
browser worker could perform checks without opening a tab, or inspect multiple
pages. Account for browser infrastructure, timeouts, and safe URL fetching.
One successful page check must not be presented as proof of site-wide coverage.

## Support multiple bot types in dashboard filters

Replace the single-select bot-type filter with a multi-select for AI Training,
AI Search, AI Assistant, and Unknown. Select all by default so users can exclude
only Unknown while retaining every recognized bot type. Extend the analytics
RPC to accept the selection and apply it consistently across dashboard sections.

Unknown means no supported signature matched, even when a raw user-agent string
is present; it includes unrecognized bots and ordinary browser traffic. Keep
that distinction clear in the filter wording. CSV export should continue to
include all recorded events regardless of dashboard filters.

## Add more login methods

Offer additional Supabase Auth options, such as social login or email magic links,
alongside email/password. Configure provider callbacks for local and hosted
environments, and test sign-in, cancellation, and error handling for each method.

## Confirm passwords during sign-up

Add a second password field on sign-up and require both entries to match before
submitting. Show a clear mismatch message, support password-manager autofill,
and keep the existing single-password sign-in form.

## Allow owners to delete a site

Add a delete action on the dashboard or site page, with confirmation naming the
domain and explaining that its recorded events will also be deleted. Enforce
ownership through a DELETE grant and RLS policy, not just the UI. The existing
event foreign key already cascades deletion from the site.

After deletion, remove the site from the dashboard and reject events sent with
its old site ID. Remind the owner to remove the snippet from their website.
Verify that another user's site with the same domain and its events are unaffected.

## Replace plain IP hashing with scoped HMAC

**Current decision:** v1 stores an unkeyed SHA-256 digest in `ip_hash`.
The collector reads `CF-Connecting-IP`, falling back to `X-Real-IP`, validates
the address, and canonicalizes IPv6 before hashing. Missing or invalid metadata
produces null. It does not accept an IP/hash from the event payload, store raw
IPs in event rows, or add raw IP metadata to application logs or responses.
Infrastructure access logs have their own retention and privacy settings.

Plain hashes can be matched by enumerating candidate IPs, especially IPv4.
The same address also has the same hash across sites and dates. Treat this as
pseudonymisation with limitations, not guaranteed anonymisation.

**Proposed improvement:** replace SHA-256 with HMAC-SHA-256 using a random
256-bit server secret and a structured input containing the site ID, UTC date,
and normalized IP:

```text
HMAC_SHA256(secret, encode(site_id, utc_date, normalized_ip))
```

- Keep the key in Supabase secrets, separate from the event database.
- Site scoping prevents direct cross-customer correlation of the output.
- Daily scoping changes the identifier each day; no current metric needs
  long-term IP identity. Including a date is not the same as rotating the key.
- Establish key rotation and retention rules. Version the hash scheme before
  changing it so old SHA-256 values cannot be mistaken for HMAC values.
- Raw IPs were not retained, so existing hashes cannot be converted into HMACs.
  Apply the new scheme to new events and retire old values through retention.
- Test stability within a site/day and differences across sites, days, and keys.

The secret holder can still test candidate IPs. HMAC is also pseudonymisation;
it does not turn an IP into a reliable unique-person or bot identifier.

## Verify the hosted gateway IP contract

Cloudflare documents `CF-Connecting-IP` as visitor IP metadata. Supabase's
Studio IP helper also prefers that header, but this is not a guarantee covering
every hosted Edge Function/custom-domain routing configuration. Verify header
overwriting and forwarding on the deployed project before using this value for
security decisions. Local caller-supplied headers only test parsing and hashing.
We deliberately do not infer visitor identity from an arbitrary
`X-Forwarded-For` chain, and never use `ip_hash` for authorization.

References:

- [ICO pseudonymisation guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/pseudonymisation/)
- [Cloudflare request headers](https://developers.cloudflare.com/fundamentals/reference/http-headers/)
- [Supabase Studio IP helper](https://github.com/supabase/supabase/blob/master/apps/studio/pages/api/get-ip-address.ts)

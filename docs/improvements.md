# Improvements

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

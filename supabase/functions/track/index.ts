import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { classifyBot } from "../_shared/classify-bot.ts";
import { hashRequestIp } from "../_shared/hash-request-ip.ts";

const SITE_ID_PATTERN = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const MAX_PAYLOAD_CHARACTERS = 8192;
const MAX_PAGE_URL_CHARACTERS = 4096;
const ALLOWED_PAGE_PROTOCOLS = ["http:", "https:"];

const PREFLIGHT_METHOD = "OPTIONS";
const TRACKING_METHOD = "POST";
const ALLOWED_METHODS = "POST, OPTIONS";
const NO_CONTENT_STATUS = 204;
const METHOD_NOT_ALLOWED_STATUS = 405;
const BAD_REQUEST_STATUS = 400;
const USER_AGENT_HEADER = "user-agent";
const MISSING_USER_AGENT = "";

const TRACKING_LOG_EVENT = "tracking_saved";
const STORAGE_ERROR_LOG_EVENT = "tracking_storage_failed";
const STORAGE_ERROR = "Could not save tracking event";
const INVALID_SITE_ERROR = "Site does not exist or hostname does not match";
const INTERNAL_ERROR_STATUS = 500;

const SITES_TABLE = "sites";
const EVENTS_TABLE = "crawler_events";
const SITE_COLUMNS = "id, domain";
const ID_COLUMN = "id";
const DATABASE_URL = Deno.env.get("SUPABASE_URL")!;
const DATABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const METHOD_NOT_ALLOWED_ERROR = "Method not allowed";
const PAYLOAD_TOO_LARGE_ERROR = "Payload too large";
const INVALID_EVENT_ERROR = "Expected a site UUID and page URL";
const INVALID_PAGE_URL_ERROR = "Invalid page URL";
const INVALID_PAYLOAD_ERROR = "Invalid tracking payload";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": ALLOWED_METHODS,
  "Access-Control-Allow-Headers": "content-type",
};

// Collector writes use server credentials; visiting browsers have no user session.
const supabase = createClient(DATABASE_URL, DATABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve(async (request: Request) => {
  // Answer browser preflights before processing tracking requests.
  if (request.method === PREFLIGHT_METHOD) {
    return new Response(null, {
      status: NO_CONTENT_STATUS,
      headers: CORS_HEADERS,
    });
  }

  if (request.method !== TRACKING_METHOD) {
    return Response.json(
      { error: METHOD_NOT_ALLOWED_ERROR },
      {
        status: METHOD_NOT_ALLOWED_STATUS,
        headers: { ...CORS_HEADERS, Allow: ALLOWED_METHODS },
      },
    );
  }

  let received: { site_id: string; page_url: string; user_agent: string };
  let pageUrl: URL;

  // Reject malformed payloads before making any database requests.
  try {
    const body = await request.text();

    if (body.length > MAX_PAYLOAD_CHARACTERS)
      throw new Error(PAYLOAD_TOO_LARGE_ERROR);

    const event = JSON.parse(body);

    if (
      !event ||
      typeof event.site_id !== "string" ||
      !SITE_ID_PATTERN.test(event.site_id) ||
      typeof event.page_url !== "string" ||
      event.page_url.length > MAX_PAGE_URL_CHARACTERS
    ) {
      throw new Error(INVALID_EVENT_ERROR);
    }

    pageUrl = new URL(event.page_url);

    if (!ALLOWED_PAGE_PROTOCOLS.includes(pageUrl.protocol))
      throw new Error(INVALID_PAGE_URL_ERROR);

    received = {
      site_id: event.site_id,
      page_url: pageUrl.href,
      user_agent: request.headers.get(USER_AGENT_HEADER) ?? MISSING_USER_AGENT,
    };
  } catch {
    return Response.json(
      { error: INVALID_PAYLOAD_ERROR },
      { status: BAD_REQUEST_STATUS, headers: CORS_HEADERS },
    );
  }

  try {
    // IDs choose the tracking property; domains only validate the reported page.
    const { data: site, error: siteError } = await supabase
      .from(SITES_TABLE)
      .select(SITE_COLUMNS)
      .eq(ID_COLUMN, received.site_id)
      .maybeSingle();

    if (siteError) throw siteError;

    if (!site || site.domain !== pageUrl.hostname) {
      return Response.json(
        { error: INVALID_SITE_ERROR },
        {
          status: BAD_REQUEST_STATUS,
          headers: CORS_HEADERS,
        },
      );
    }

    // Derive classification from the HTTP header, never from submitted labels.
    const classification = classifyBot(received.user_agent);

    // Persist only the digest; exclude raw IP metadata from responses and logs.
    const ipHash = await hashRequestIp(request.headers);

    // Persist first so a successful response always refers to a saved event.
    const { data: savedEvent, error: insertError } = await supabase
      .from(EVENTS_TABLE)
      .insert({
        ...received,
        ...classification,
        page_path: pageUrl.pathname,
        ip_hash: ipHash,
      })
      .select(ID_COLUMN)
      .single();

    if (insertError) throw insertError;

    console.log(
      JSON.stringify({
        event: TRACKING_LOG_EVENT,
        event_id: savedEvent.id,
        ...received,
      }),
    );

    return Response.json(
      { event_id: savedEvent.id, received },
      { headers: CORS_HEADERS },
    );
  } catch {
    // Storage failures are server errors, distinct from invalid client payloads.
    console.error(STORAGE_ERROR_LOG_EVENT);

    return Response.json(
      { error: STORAGE_ERROR },
      {
        status: INTERNAL_ERROR_STATUS,
        headers: CORS_HEADERS,
      },
    );
  }
});

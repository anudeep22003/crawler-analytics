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
const TRACKING_LOG_EVENT = "tracking_received";
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

Deno.serve(async (request: Request) => {
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
    const pageUrl = new URL(event.page_url);
    if (!ALLOWED_PAGE_PROTOCOLS.includes(pageUrl.protocol))
      throw new Error(INVALID_PAGE_URL_ERROR);

    // This increment acknowledges transport only; site ownership and bot identity are not verified.
    const received = {
      site_id: event.site_id,
      page_url: pageUrl.href,
      user_agent: request.headers.get(USER_AGENT_HEADER) ?? MISSING_USER_AGENT,
    };
    console.log(JSON.stringify({ event: TRACKING_LOG_EVENT, ...received }));
    return Response.json({ received }, { headers: CORS_HEADERS });
  } catch {
    return Response.json(
      { error: INVALID_PAYLOAD_ERROR },
      { status: BAD_REQUEST_STATUS, headers: CORS_HEADERS },
    );
  }
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      {
        status: 405,
        headers: { ...corsHeaders, Allow: "POST, OPTIONS" },
      },
    );
  }

  try {
    const body = await request.text();
    if (body.length > 8192) throw new Error("Payload too large");
    const event = JSON.parse(body);
    if (
      !event ||
      typeof event.site_id !== "string" ||
      !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(event.site_id) ||
      typeof event.page_url !== "string" ||
      event.page_url.length > 4096
    ) {
      throw new Error("Expected a site UUID and page URL");
    }
    const pageUrl = new URL(event.page_url);
    if (!["http:", "https:"].includes(pageUrl.protocol))
      throw new Error("Invalid page URL");

    // This increment acknowledges transport only; site ownership and bot identity are not verified.
    const received = {
      site_id: event.site_id,
      page_url: pageUrl.href,
      user_agent: request.headers.get("user-agent") ?? "",
    };
    console.log(JSON.stringify({ event: "tracking_received", ...received }));
    return Response.json({ received }, { headers: corsHeaders });
  } catch {
    return Response.json(
      { error: "Invalid tracking payload" },
      { status: 400, headers: corsHeaders },
    );
  }
});

import { test, expect } from "./support/sites";
import { createHash } from "node:crypto";

const COLLECTOR_URL = "http://127.0.0.1:54321/functions/v1/track";
const TEST_IP = "203.0.113.42";

test("stores the hash of gateway IP metadata without returning the raw address", async ({
  request,
  siteFixture,
}) => {
  const response = await request.post(COLLECTOR_URL, {
    headers: { "CF-Connecting-IP": TEST_IP, "User-Agent": "GPTBot" },
    data: {
      site_id: siteFixture.sites[0].id,
      page_url: "http://127.0.0.1/",
      ip: "198.51.100.7",
      ip_hash: "client-supplied-value",
    },
  });
  expect(response.status()).toBe(200);
  const result = await response.json();
  expect(JSON.stringify(result)).not.toContain(TEST_IP);
  const { data, error } = await siteFixture.supabase
    .from("crawler_events")
    .select("ip_hash")
    .eq("id", result.event_id)
    .single();
  expect(error).toBeNull();
  expect(data?.ip_hash).toBe(
    createHash("sha256").update(TEST_IP).digest("hex"),
  );
});

test("classifies the HTTP header and ignores client-supplied classification", async ({
  request,
  siteFixture,
}) => {
  for (const [userAgent, expected] of [
    [
      "Mozilla/5.0 (compatible; GPTBot/1.0)",
      { bot_name: "GPTBot", platform: "OpenAI", bot_type: "training" },
    ],
    [
      "UnlistedCrawler/1.0",
      { bot_name: "Unknown", platform: "Unknown", bot_type: "unknown" },
    ],
    [
      "Mozilla/5.0 Chrome/130.0 Safari/537.36",
      { bot_name: "Unknown", platform: "Unknown", bot_type: "unknown" },
    ],
  ] as const) {
    const response = await request.post(COLLECTOR_URL, {
      headers: { "User-Agent": userAgent },
      data: {
        site_id: siteFixture.sites[0].id,
        page_url: "http://127.0.0.1/",
        user_agent: "PerplexityBot",
        bot_name: "PerplexityBot",
        platform: "Perplexity",
        bot_type: "search",
      },
    });
    expect(response.status()).toBe(200);
    const result = await response.json();
    const { data, error } = await siteFixture.supabase
      .from("crawler_events")
      .select("bot_name, platform, bot_type, user_agent")
      .eq("id", result.event_id)
      .single();
    expect(error).toBeNull();
    expect(data).toEqual({ ...expected, user_agent: userAgent });
  }
});

test("attributes identical page visits to the supplied site, not the shared domain", async ({
  request,
  siteFixture,
}) => {
  const { supabase, sites } = siteFixture;
  expect(sites[0].domain).toBe(sites[1].domain);
  expect(sites[0].user_id).not.toBe(sites[1].user_id);
  const pageUrl = `http://127.0.0.1:3001/same-page?test=${crypto.randomUUID()}`;
  for (const site of sites) {
    const response = await request.post(COLLECTOR_URL, {
      headers: { "User-Agent": "GPTBot" },
      data: { site_id: site.id, page_url: pageUrl },
    });
    expect(response.status()).toBe(200);
  }
  const { data, error } = await supabase
    .from("crawler_events")
    .select("site_id, user_agent, page_path")
    .eq("page_url", pageUrl);
  expect(error).toBeNull();
  expect(data).toHaveLength(2);
  expect(data).toEqual(
    expect.arrayContaining(
      sites.map((site) => ({
        site_id: site.id,
        user_agent: "GPTBot",
        page_path: "/same-page",
      })),
    ),
  );
});

test("rejects unknown sites and mismatched hostnames without persisting", async ({
  request,
  siteFixture,
}) => {
  const pageUrl = `https://unrelated.example/?test=${crypto.randomUUID()}`;
  for (const siteId of [crypto.randomUUID(), siteFixture.sites[0].id]) {
    const response = await request.post(COLLECTOR_URL, {
      data: { site_id: siteId, page_url: pageUrl },
    });
    expect(response.status()).toBe(400);
  }
  const { data, error } = await siteFixture.supabase
    .from("crawler_events")
    .select("id")
    .eq("page_url", pageUrl);
  expect(error).toBeNull();
  expect(data).toEqual([]);
});

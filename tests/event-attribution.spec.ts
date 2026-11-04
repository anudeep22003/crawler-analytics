import { test, expect } from "./support/sites";

const COLLECTOR_URL = "http://127.0.0.1:54321/functions/v1/track";

test("attributes identical page visits to the supplied site, not the shared domain", async ({
  request,
  siteFixture,
}) => {
  const { admin, sites } = siteFixture;
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
  const { data, error } = await admin
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
  const { data, error } = await siteFixture.admin
    .from("crawler_events")
    .select("id")
    .eq("page_url", pageUrl);
  expect(error).toBeNull();
  expect(data).toEqual([]);
});

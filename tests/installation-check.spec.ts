import { test, expect } from "./support/sites";

const COLLECTOR_URL = "http://127.0.0.1:54321/functions/v1/track";

test("the installed snippet confirms the exact check without recording a visit", async ({
  page,
  siteFixture,
}) => {
  const { supabase, sites } = siteFixture;
  const { data: check, error } = await supabase
    .from("installation_checks")
    .insert({ site_id: sites[0].id })
    .select("id")
    .single();
  expect(error).toBeNull();
  const before = await supabase
    .from("crawler_events")
    .select("id", { count: "exact", head: true })
    .eq("site_id", sites[0].id);
  expect(before.error).toBeNull();

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url() === COLLECTOR_URL &&
      response.request().method() === "POST",
  );
  await page.goto(`/?site_id=${sites[0].id}&tracker_test=${check!.id}`);
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({
    check_id: check!.id,
    received_at: expect.any(String),
  });

  const stored = await supabase
    .from("installation_checks")
    .select("received_at")
    .eq("id", check!.id)
    .single();
  expect(stored.error).toBeNull();
  expect(stored.data?.received_at).not.toBeNull();
  const after = await supabase
    .from("crawler_events")
    .select("id", { count: "exact", head: true })
    .eq("site_id", sites[0].id);
  expect(after.error).toBeNull();
  expect(after.count).toBe(before.count);
});

test("invalid, expired, and other-site checks cannot confirm or create events", async ({
  request,
  siteFixture,
}) => {
  const { supabase, sites } = siteFixture;
  const { data: checks, error } = await supabase
    .from("installation_checks")
    .insert([
      { site_id: sites[0].id, expires_at: "2000-01-01Z" },
      { site_id: sites[1].id, expires_at: "2099-01-01Z" },
    ])
    .select("id, received_at");
  expect(error).toBeNull();
  const marker = crypto.randomUUID();
  for (const checkId of [
    "invalid",
    crypto.randomUUID(),
    ...checks!.map((check) => check.id),
  ]) {
    const response = await request.post(COLLECTOR_URL, {
      data: {
        site_id: sites[0].id,
        page_url: `http://127.0.0.1/${marker}?tracker_test=${checkId}`,
      },
    });
    expect(response.status()).toBe(400);
  }
  const rows = await supabase
    .from("crawler_events")
    .select("id")
    .eq("page_path", `/${marker}`);
  expect(rows.error).toBeNull();
  expect(rows.data).toEqual([]);
  const stored = await supabase
    .from("installation_checks")
    .select("received_at")
    .in(
      "id",
      checks!.map((check) => check.id),
    );
  expect(stored.error).toBeNull();
  expect(stored.data?.every((check) => check.received_at === null)).toBe(true);
});

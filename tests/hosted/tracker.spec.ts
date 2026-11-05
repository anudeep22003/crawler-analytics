import { expect, test } from "@playwright/test";

const SITE_ID = "912db1ea-90e9-4136-ae89-f023c7a95f40";
const TRACKER_URL = "https://crawler-analytics.vercel.app/tracker.js";
const COLLECTOR_URL =
  "https://ckvgykwkxodfxoupbzxr.supabase.co/functions/v1/track";
const UUID_PATTERN = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const USER_AGENTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-Web",
  "Google-Extended",
  "PerplexityBot",
  "Meta-ExternalAgent",
  "Applebot-Extended",
  "CCBot",
  "Bytespider",
];

for (const userAgent of USER_AGENTS) {
  test.describe(userAgent, () => {
    test.use({ userAgent, extraHTTPHeaders: { "User-Agent": userAgent } });

    test("deployed collector acknowledges the supplied user agent and saved event", async ({
      page,
    }, testInfo) => {
      const pageUrl = new URL("http://127.0.0.1:3001/");
      pageUrl.searchParams.set("test_run", process.env.HOSTED_TEST_RUN_ID!);
      pageUrl.searchParams.set("browser", testInfo.project.name);
      pageUrl.searchParams.set("user_agent", userAgent);

      const scriptResponse = page.waitForResponse(TRACKER_URL);
      const trackingResponse = page.waitForResponse(
        (response) =>
          response.url() === COLLECTOR_URL &&
          response.request().method() === "POST",
      );
      const [navigation, script, collected] = await Promise.all([
        page.goto(pageUrl.href),
        scriptResponse,
        trackingResponse,
      ]);

      expect(navigation?.ok()).toBe(true);
      expect(script.status()).toBe(200);
      expect(collected.status(), await collected.text()).toBe(200);
      expect(await collected.finished()).toBeNull();
      const receipt = await collected.json();
      expect(receipt.event_id).toMatch(UUID_PATTERN);
      expect(receipt.received).toEqual({
        site_id: SITE_ID,
        page_url: pageUrl.href,
        user_agent: userAgent,
      });

      await testInfo.attach("collector-receipt", {
        body: JSON.stringify(receipt, null, 2),
        contentType: "application/json",
      });
      console.log(
        `${testInfo.project.name} ${userAgent}: saved ${receipt.event_id}`,
      );
    });
  });
}

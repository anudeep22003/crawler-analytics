import { expect, test } from "./support/sites";

// All signatures from the brief's table and classification example.
// Extended tokens are synthetic cases, not actual crawler HTTP identities.
const botUserAgents = [
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

for (const userAgent of botUserAgents) {
  test.describe(userAgent, () => {
    // Firefox's fetch used its default UA with context userAgent alone in this setup.
    // Set network headers too, while userAgent still controls navigator.userAgent.
    test.use({ userAgent, extraHTTPHeaders: { "User-Agent": userAgent } });

    test("sends the configured user agent through the tracking snippet", async ({
      page,
      siteFixture,
    }) => {
      const trackingResponse = page.waitForResponse(
        (response) =>
          response.url() === "http://127.0.0.1:54321/functions/v1/track" &&
          response.request().method() === "POST",
      );
      const site = siteFixture.sites[0];
      const pageUrl = `http://127.0.0.1:3001/?site_id=${site.id}`;
      const response = await page.goto(pageUrl);
      expect(
        response,
        "Navigation should return an HTTP response",
      ).not.toBeNull();
      expect(response!.ok()).toBe(true);
      await expect(
        page.getByRole("heading", { name: "Customer website", exact: true }),
      ).toBeVisible();
      expect(await response!.request().headerValue("user-agent")).toBe(
        userAgent,
      );
      expect(await page.evaluate(() => navigator.userAgent)).toBe(userAgent);
      const collected = await trackingResponse;
      expect(collected.status()).toBe(200);
      expect(await collected.finished()).toBeNull();
      const result = await collected.json();
      expect(result).toEqual({
        event_id: expect.any(String),
        received: {
          site_id: site.id,
          page_url: pageUrl,
          user_agent: userAgent,
        },
      });
      const { data: saved, error } = await siteFixture.admin
        .from("crawler_events")
        .select("site_id, page_url, page_path, user_agent, timestamp")
        .eq("id", result.event_id)
        .single();
      expect(error).toBeNull();
      expect(saved).toMatchObject({
        site_id: site.id,
        page_url: pageUrl,
        page_path: "/",
        user_agent: userAgent,
      });
      expect(Number.isNaN(Date.parse(saved!.timestamp))).toBe(false);
    });
  });
}

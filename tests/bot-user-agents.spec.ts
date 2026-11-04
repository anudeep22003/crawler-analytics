import { expect, test } from "@playwright/test";

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
    }) => {
      const trackingResponse = page.waitForResponse(
        (response) =>
          response.url() === "http://127.0.0.1:54321/functions/v1/track" &&
          response.request().method() === "POST",
      );
      const response = await page.goto("/");
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
      expect(await collected.json()).toEqual({
        received: {
          site_id: "00000000-0000-0000-0000-000000000001",
          page_url: "http://127.0.0.1:3001/",
          user_agent: userAgent,
        },
      });
    });
  });
}

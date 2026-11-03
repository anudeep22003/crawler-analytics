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
    test.use({ userAgent });

    test("sends the configured user agent on navigation", async ({ page }) => {
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
    });
  });
}

import { defineConfig } from "@playwright/test";

// One marker shared across workers makes this live run identifiable in exports.
process.env.HOSTED_TEST_RUN_ID ??= new Date().toISOString();

export default defineConfig({
  testDir: "./tests/hosted",
  outputDir: "test-results/hosted",
  workers: 1,
  retries: 0,
  maxFailures: 1,
  reporter: "list",
  use: { headless: true, baseURL: "http://127.0.0.1:3001" },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "firefox", use: { browserName: "firefox" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
  webServer: {
    command: "node tests/fixtures/customer-site/server.ts",
    env: { HOSTED_TRACKER_TEST: "1" },
    url: "http://127.0.0.1:3001",
    reuseExistingServer: false,
  },
});

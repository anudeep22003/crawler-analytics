import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  workers: 1,
  reporter: "list",
  use: {
    headless: true,
    baseURL: "http://127.0.0.1:3001",
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "firefox", use: { browserName: "firefox" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
  webServer: {
    command: "node tests/fixtures/customer-site/server.mjs",
    url: "http://127.0.0.1:3001",
    reuseExistingServer: false,
  },
});

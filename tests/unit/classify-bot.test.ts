import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyBot } from "../../supabase/functions/_shared/classify-bot.ts";

const EXPECTED_BOTS = [
  ["GPTBot", "OpenAI", "training"],
  ["ChatGPT-User", "OpenAI", "assistant"],
  ["OAI-SearchBot", "OpenAI", "search"],
  ["ClaudeBot", "Anthropic", "training"],
  ["Claude-Web", "Anthropic", "assistant"],
  ["Google-Extended", "Google", "training"],
  ["PerplexityBot", "Perplexity", "search"],
  ["Meta-ExternalAgent", "Meta", "training"],
  ["Applebot-Extended", "Apple", "training"],
  ["CCBot", "Common Crawl", "training"],
  ["Bytespider", "Bytedance", "training"],
];

for (const [name, platform, type] of EXPECTED_BOTS) {
  test(`classifies ${name} as a token and inside a full user agent`, () => {
    for (const userAgent of [
      name,
      `Mozilla/5.0 (compatible; ${name.toLowerCase()}/1.0; +https://example.com)`,
    ]) {
      assert.deepEqual(classifyBot(userAgent), {
        bot_name: name,
        platform,
        bot_type: type,
      });
    }
  });
}

for (const userAgent of [
  "",
  "Unknown",
  "NewCrawler/1.0",
  "NotGPTBot",
  "GPTBotFake",
  "Mozilla/5.0 Chrome/130.0 Safari/537.36",
]) {
  test(`leaves unmatched user agent unclassified: ${userAgent || "(empty)"}`, () => {
    assert.deepEqual(classifyBot(userAgent), {
      bot_name: "Unknown",
      platform: "Unknown",
      bot_type: "unknown",
    });
  });
}

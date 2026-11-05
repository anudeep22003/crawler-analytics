// Keep the supplied spec's signatures, including its legacy Claude-Web entry.
// Google-Extended and Applebot-Extended are robots.txt controls; these matches
// support the assignment's synthetic traffic, not verified crawler identities.
const BOT_SIGNATURES = [
  {
    pattern: /\bGPTBot\b/i,
    bot_name: "GPTBot",
    platform: "OpenAI",
    bot_type: "training",
  },
  {
    pattern: /\bChatGPT-User\b/i,
    bot_name: "ChatGPT-User",
    platform: "OpenAI",
    bot_type: "assistant",
  },
  {
    pattern: /\bOAI-SearchBot\b/i,
    bot_name: "OAI-SearchBot",
    platform: "OpenAI",
    bot_type: "search",
  },
  {
    pattern: /\bClaudeBot\b/i,
    bot_name: "ClaudeBot",
    platform: "Anthropic",
    bot_type: "training",
  },
  {
    pattern: /\bClaude-Web\b/i,
    bot_name: "Claude-Web",
    platform: "Anthropic",
    bot_type: "assistant",
  },
  {
    pattern: /\bGoogle-Extended\b/i,
    bot_name: "Google-Extended",
    platform: "Google",
    bot_type: "training",
  },
  {
    pattern: /\bPerplexityBot\b/i,
    bot_name: "PerplexityBot",
    platform: "Perplexity",
    bot_type: "search",
  },
  {
    pattern: /\bMeta-ExternalAgent\b/i,
    bot_name: "Meta-ExternalAgent",
    platform: "Meta",
    bot_type: "training",
  },
  {
    pattern: /\bApplebot-Extended\b/i,
    bot_name: "Applebot-Extended",
    platform: "Apple",
    bot_type: "training",
  },
  {
    pattern: /\bCCBot\b/i,
    bot_name: "CCBot",
    platform: "Common Crawl",
    bot_type: "training",
  },
  {
    pattern: /\bBytespider\b/i,
    bot_name: "Bytespider",
    platform: "Bytedance",
    bot_type: "training",
  },
];

const UNKNOWN_CLASSIFICATION = {
  bot_name: "Unknown",
  platform: "Unknown",
  bot_type: "unknown",
};

/** @param {string} userAgent */
export function classifyBot(userAgent) {
  for (const { pattern, bot_name, platform, bot_type } of BOT_SIGNATURES) {
    if (pattern.test(userAgent)) return { bot_name, platform, bot_type };
  }

  // Unmatched means unclassified: it does not establish that a visitor is a bot.
  return { ...UNKNOWN_CLASSIFICATION };
}

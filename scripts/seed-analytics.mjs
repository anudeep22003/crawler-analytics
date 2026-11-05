import { execFileSync } from "node:child_process";
import { randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const DEMO_EMAIL = "analytics-demo@example.com";
const DEMO_PASSWORD = "Local-analytics-demo-123!";
const DEMO_DOMAIN = "analytics-demo.example";
const EVENT_COUNT = 10_000;
const INSERT_BATCH_SIZE = 500;
const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_MS = 30 * DAY_MS;
// The ten signatures in the spec's table, plus an unrecognized identity.
const USER_AGENTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Google-Extended",
  "PerplexityBot",
  "Meta-ExternalAgent",
  "Applebot-Extended",
  "CCBot",
  "Bytespider",
  "Unknown",
];
const end = new Date(process.argv[2] ?? Date.now());
if (Number.isNaN(end.getTime()))
  throw new Error("Expected an ISO timestamp argument");

// The seed is local-only and never reads the frontend's hosted project settings.
const local = JSON.parse(
  execFileSync("npx", ["supabase", "status", "-o", "json"], {
    encoding: "utf8",
  }),
);
if (local.API_URL !== "http://127.0.0.1:54321")
  throw new Error("Expected local Supabase");
const admin = createClient(local.API_URL, local.SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

let owner;
for (let page = 1; !owner; page++) {
  const { data, error } = await admin.auth.admin.listUsers({
    page,
    perPage: 100,
  });
  if (error) throw error;
  owner = data.users.find((user) => user.email === DEMO_EMAIL);
  if (data.users.length < 100) break;
}
if (!owner) {
  const { data, error } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  owner = data.user;
}

const { data: site, error: siteError } = await admin
  .from("sites")
  .upsert(
    { user_id: owner.id, domain: DEMO_DOMAIN },
    { onConflict: "user_id,domain" },
  )
  .select("id")
  .single();
if (siteError) throw siteError;

// Generate before replacing the dedicated demo site's data. Cover every identity
// once, then choose agents randomly; all timestamps are random within [start, end).
const events = Array.from({ length: EVENT_COUNT }, (_, index) => ({
  site_id: site.id,
  timestamp: new Date(
    end.getTime() - randomInt(1, WINDOW_MS + 1),
  ).toISOString(),
  user_agent:
    USER_AGENTS[
      index < USER_AGENTS.length ? index : randomInt(USER_AGENTS.length)
    ],
  page_url: `https://${DEMO_DOMAIN}/${index % 2 ? "pricing" : "docs"}`,
  page_path: index % 2 ? "/pricing" : "/docs",
}));

// This site is reserved for seed data. Other sites and accounts are untouched.
const { error: deleteError } = await admin
  .from("crawler_events")
  .delete()
  .eq("site_id", site.id);
if (deleteError) throw deleteError;
for (let offset = 0; offset < events.length; offset += INSERT_BATCH_SIZE) {
  const { error } = await admin
    .from("crawler_events")
    .insert(events.slice(offset, offset + INSERT_BATCH_SIZE));
  if (error) throw error;
}

// Read as the demo user, exercising the same RPC permissions as the dashboard.
const client = createClient(local.API_URL, local.ANON_KEY, {
  auth: { persistSession: false },
});
const { error: loginError } = await client.auth.signInWithPassword({
  email: DEMO_EMAIL,
  password: DEMO_PASSWORD,
});
if (loginError) throw loginError;
const totals = {};
for (const [period, days] of [
  ["24h", 1],
  ["7d", 7],
  ["30d", 30],
]) {
  const start = end.getTime() - days * DAY_MS;
  const expected = events.filter(
    (event) => Date.parse(event.timestamp) >= start,
  ).length;
  const { data, error } = await client.rpc("site_activity", {
    p_site_id: site.id,
    p_period: period,
    p_end: end.toISOString(),
  });
  if (error) throw error;
  totals[period] = data.total;
  if (data.total !== expected)
    throw new Error(`${period}: expected ${expected}, received ${data.total}`);
}
// Verify each agent's persisted count without downloading a capped row result.
const distribution = {};
for (const userAgent of USER_AGENTS) {
  const expected = events.filter(
    (event) => event.user_agent === userAgent,
  ).length;
  const { count, error } = await client
    .from("crawler_events")
    .select("id", { count: "exact", head: true })
    .eq("site_id", site.id)
    .eq("user_agent", userAgent);
  if (error) throw error;
  if (count !== expected)
    throw new Error(`${userAgent}: expected ${expected}, received ${count}`);
  distribution[userAgent] = count;
}
console.log(
  `Seeded ${EVENT_COUNT} events across the 30 days ending ${end.toISOString()}.`,
);
console.log("Verified period totals:", totals);
console.table(distribution);
console.log(`Local demo login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
console.log(`Site: /s/${site.id}`);

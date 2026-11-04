import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const DEMO_EMAIL = "analytics-demo@example.com";
const DEMO_PASSWORD = "Local-analytics-demo-123!";
const DEMO_DOMAIN = "analytics-demo.example";
const DEMO_USER_AGENT = "AnalyticsDemoSeed/1.0";
const HOURS_AGO = [1, 1, 3, 6, 12, 23, 25, 48, 72, 144, 192, 480, 696, 744];
const HOUR_MS = 60 * 60 * 1000;
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

// Replace only this script's marked events, preserving other visits and accounts.
const { error: deleteError } = await admin
  .from("crawler_events")
  .delete()
  .eq("site_id", site.id)
  .eq("user_agent", DEMO_USER_AGENT);
if (deleteError) throw deleteError;
const { error: insertError } = await admin.from("crawler_events").insert(
  HOURS_AGO.map((hours, index) => ({
    site_id: site.id,
    timestamp: new Date(end.getTime() - hours * HOUR_MS).toISOString(),
    user_agent: DEMO_USER_AGENT,
    page_url: `https://${DEMO_DOMAIN}/${index % 2 ? "pricing" : "docs"}`,
    page_path: index % 2 ? "/pricing" : "/docs",
  })),
);
if (insertError) throw insertError;

// Read as the demo user, exercising the same RPC permissions as the dashboard.
const client = createClient(local.API_URL, local.ANON_KEY, {
  auth: { persistSession: false },
});
const { error: loginError } = await client.auth.signInWithPassword({
  email: DEMO_EMAIL,
  password: DEMO_PASSWORD,
});
if (loginError) throw loginError;
for (const [period, expected] of [
  ["24h", 6],
  ["7d", 10],
  ["30d", 13],
]) {
  const { data, error } = await client.rpc("site_activity", {
    p_site_id: site.id,
    p_period: period,
    p_end: end.toISOString(),
  });
  if (error) throw error;
  if (data.total !== expected)
    throw new Error(`${period}: expected ${expected}, received ${data.total}`);
}
console.log(
  `Seeded 14 events. Verified totals at ${end.toISOString()}: 24h=6, 7d=10, 30d=13.`,
);
console.log(`Local demo login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
console.log(`Site: /s/${site.id}`);

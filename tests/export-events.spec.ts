import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import Papa from "papaparse";
import { test, expect } from "./support/sites";
import { buildSiteCsv } from "../lib/export-site-events.ts";
import { EXPORT_COLUMNS } from "../lib/crawler-events-csv.ts";

test("exports every batch in order, all dates, and only the signed-in owners site", async ({
  siteFixture,
}) => {
  const { sites } = siteFixture;
  const password = `${crypto.randomUUID()}Aa1!`;
  const { data: owner, error: ownerError } =
    await siteFixture.supabase.auth.admin.updateUserById(sites[0].user_id, {
      password,
    });
  expect(ownerError).toBeNull();
  const local = JSON.parse(
    execFileSync("npx", ["supabase", "status", "-o", "json"], {
      encoding: "utf8",
    }),
  );
  const supabase = createClient("http://127.0.0.1:54321", local.ANON_KEY, {
    auth: { persistSession: false },
  });
  const { error: loginError } = await supabase.auth.signInWithPassword({
    email: owner.user!.email!,
    password,
  });
  expect(loginError).toBeNull();

  const event = {
    site_id: sites[0].id,
    timestamp: "2000-01-01T00:00:00.123456Z",
    page_url: "http://127.0.0.1/old",
    page_path: "/old",
    user_agent: "GPTBot",
  };
  const events = Array.from({ length: 1205 }, () => ({
    ...event,
    id: crypto.randomUUID(),
  }));
  for (let offset = 0; offset < events.length; offset += 500) {
    const { error } = await siteFixture.supabase
      .from("crawler_events")
      .insert(events.slice(offset, offset + 500));
    expect(error).toBeNull();
  }
  const newestId = crypto.randomUUID();
  const { error: extraError } = await siteFixture.supabase
    .from("crawler_events")
    .insert([
      { ...event, id: newestId, timestamp: "2000-01-01T00:00:00.123457Z" },
      { ...event, id: crypto.randomUUID(), site_id: sites[1].id },
    ]);
  expect(extraError).toBeNull();

  const progress: number[] = [];
  const chunks = await buildSiteCsv(supabase, sites[0].id, {
    signal: new AbortController().signal,
    batchSize: 2000, // Exceeds the local API's default 1000-row cap.
    onProgress: async (count) => {
      progress.push(count);
      if (progress.length === 1) {
        const { error } = await siteFixture.supabase
          .from("crawler_events")
          .insert({ ...event, timestamp: "2001-01-01Z" });
        expect(error).toBeNull();
      }
    },
  });
  const parsed = Papa.parse<Record<string, string>>(chunks.join(""), {
    header: true,
    skipEmptyLines: true,
  });
  expect(parsed.errors).toEqual([]);
  expect(parsed.meta.fields).toEqual(EXPORT_COLUMNS);
  expect(parsed.data.map((row) => row.id)).toEqual([
    ...events.map((row) => row.id).sort(),
    newestId,
  ]);
  expect(parsed.data.every((row) => row.site_id === sites[0].id)).toBe(true);
  expect(progress.at(-1)).toBe(1206);

  const inaccessible = await buildSiteCsv(supabase, sites[1].id, {
    signal: new AbortController().signal,
  });
  expect(
    Papa.parse(inaccessible.join(""), { header: true, skipEmptyLines: true })
      .data,
  ).toEqual([]);
  const empty = await buildSiteCsv(supabase, crypto.randomUUID(), {
    signal: new AbortController().signal,
  });
  expect(
    Papa.parse(empty.join(""), { header: true, skipEmptyLines: true }).meta
      .fields,
  ).toEqual(EXPORT_COLUMNS);

  const controller = new AbortController();
  await expect(
    buildSiteCsv(supabase, sites[0].id, {
      signal: controller.signal,
      batchSize: 2,
      onProgress: () => controller.abort(),
    }),
  ).rejects.toThrow();
});

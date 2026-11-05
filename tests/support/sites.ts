import { execFileSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { test as base } from "@playwright/test";

type Site = { id: string; user_id: string; domain: string };
type SiteFixture = { supabase: SupabaseClient; sites: Site[] };

export const test = base.extend<{}, { siteFixture: SiteFixture }>({
  siteFixture: [
    async ({}, use) => {
      // Always use CLI-local credentials; never seed the frontend's hosted project.
      const local = JSON.parse(
        execFileSync("npx", ["supabase", "status", "-o", "json"], {
          encoding: "utf8",
        }),
      );
      if (local.API_URL !== "http://127.0.0.1:54321")
        throw new Error("Expected local Supabase on port 54321");
      const supabase = createClient(local.API_URL, local.SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      });
      const userIds: string[] = [];
      const sites: Site[] = [];
      try {
        for (let index = 0; index < 2; index++) {
          const { data, error } = await supabase.auth.admin.createUser({
            email: `crawler-test-${crypto.randomUUID()}@example.com`,
            email_confirm: true,
          });
          if (error) throw error;
          userIds.push(data.user.id);
          const { data: site, error: siteError } = await supabase
            .from("sites")
            .insert({ user_id: data.user.id, domain: "127.0.0.1" })
            .select("id, user_id, domain")
            .single();
          if (siteError) throw siteError;
          sites.push(site);
        }
        await use({ supabase, sites });
      } finally {
        // Cascades remove only these disposable users' sites and events.
        for (const userId of userIds) {
          const { error } = await supabase.auth.admin.deleteUser(userId);
          if (error) throw error;
        }
      }
    },
    { scope: "worker" },
  ],
});

export { expect } from "@playwright/test";

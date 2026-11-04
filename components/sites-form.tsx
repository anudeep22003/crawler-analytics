"use client";

import { useSites } from "@/hooks/use-sites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export function SitesForm({ userId }: { userId: string }) {
  const { sites, loading, saving, error, message, addSite } = useSites(userId);

  return (
    <section className="space-y-4">
      <form onSubmit={addSite} className="space-y-3">
        <Label htmlFor="domain">Website domain</Label>
        <Input
          id="domain"
          name="domain"
          placeholder="example.com"
          required
          maxLength={253}
          disabled={saving || loading}
          aria-describedby="domain-help"
        />
        <p id="domain-help" className="text-sm text-muted-foreground">
          Enter a hostname without https://, a path, or a port. Subdomains are
          separate sites.
        </p>
        <Button type="submit" disabled={saving || loading}>
          {saving ? "Adding…" : "Add site"}
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      {loading ? (
        <p role="status">Loading sites…</p>
      ) : (
        <ul aria-label="Saved sites" className="space-y-2">
          {sites.map((site) => (
            <li key={site.id} className="rounded-lg border p-3">
              <Link href={`/s/${site.id}`} className="underline">
                {site.domain}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

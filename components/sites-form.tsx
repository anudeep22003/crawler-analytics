"use client";

import { useSites } from "@/hooks/use-sites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SitesForm({ userId }: { userId: string }) {
  const { sites, loading, saving, error, message, addSite } = useSites(userId);

  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Click a site to install its tracker and view analytics.
        </p>
        {loading ? (
          <p role="status">Loading sites…</p>
        ) : sites.length === 0 && !error ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No sites yet. Add your first site below.
          </p>
        ) : (
          <ul aria-label="Saved sites" className="space-y-2">
            {sites.map((site) => (
              <li key={site.id}>
                <Link
                  href={`/s/${site.id}`}
                  className="flex items-center justify-between gap-4 rounded-lg border p-4 font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="break-all">{site.domain}</span>
                  <ChevronRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Add a site</h2>
          </CardTitle>
          <CardDescription>
            Add a website to get its tracking snippet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
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
              Enter a hostname without https://, a path, or a port. Subdomains
              are separate sites.
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
        </CardContent>
      </Card>
    </section>
  );
}

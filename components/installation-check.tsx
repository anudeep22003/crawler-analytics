"use client";

import { useInstallationCheck } from "@/hooks/use-installation-check";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function InstallationCheck({
  siteId,
  domain,
}: {
  siteId: string;
  domain: string;
}) {
  const { startCheck, isChecking, message, error } = useInstallationCheck(
    siteId,
    domain,
  );

  return (
    <section
      className="space-y-3 border-t pt-4"
      aria-label="Check tracker installation"
    >
      <h3 className="font-medium">Check installation</h3>
      <p className="text-sm text-muted-foreground">
        Open a page with your snippet installed. We’ll wait up to a minute for
        its signal. Test visits do not count toward analytics.
      </p>
      <form onSubmit={startCheck} className="space-y-3">
        <Label htmlFor="installation-page-url">Page URL to check</Label>
        <Input
          id="installation-page-url"
          name="page_url"
          type="url"
          required
          defaultValue={`https://${domain}`}
          disabled={isChecking}
        />
        <Button type="submit" disabled={isChecking}>
          {isChecking ? "Checking…" : "Check installation"}
        </Button>
      </form>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}

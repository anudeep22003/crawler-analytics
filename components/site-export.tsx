"use client";

import { useSiteExport } from "@/hooks/use-site-export";
import { Button } from "@/components/ui/button";

export function SiteExport({ siteId }: { siteId: string }) {
  const { exportAllData, isExporting, exportedCount, error, message } =
    useSiteExport(siteId);

  return (
    <section className="space-y-2" aria-label="Export site data">
      <Button variant="outline" disabled={isExporting} onClick={exportAllData}>
        {isExporting ? "Exporting…" : "Export all data"}
      </Button>
      <p className="text-sm text-muted-foreground">
        Downloads all recorded events for this site, including dates outside the
        selected period. Dashboard filters do not apply.
      </p>
      {isExporting && (
        <p role="status">Prepared {exportedCount.toLocaleString()} events…</p>
      )}
      {message && <p role="status">{message}</p>}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}

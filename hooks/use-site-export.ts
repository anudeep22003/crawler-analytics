"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { buildSiteCsv } from "@/lib/export-site-events.ts";

const CSV_CONTENT_TYPE = "text/csv;charset=utf-8";
const DOWNLOAD_URL_LIFETIME_MS = 60_000;

export function useSiteExport(siteId: string) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportedCount, setExportedCount] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => () => activeRequest.current?.abort(), [siteId]);

  async function exportAllData() {
    if (activeRequest.current) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    setIsExporting(true);
    setExportedCount(0);
    setError("");
    setMessage("");

    try {
      if (!supabase) throw new Error("Supabase is not configured");
      const chunks = await buildSiteCsv(supabase, siteId, {
        signal: controller.signal,
        onProgress: (count) => {
          if (!controller.signal.aborted) setExportedCount(count);
        },
      });
      controller.signal.throwIfAborted();

      // Buffer CSV chunks, not all JSON rows. The complete file still lives in memory.
      const url = URL.createObjectURL(
        new Blob(chunks, { type: CSV_CONTENT_TYPE }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `crawler-events-${siteId}.csv`;
      document.body.appendChild(link);
      try {
        link.click();
      } finally {
        link.remove();
        // Allow the browser to start consuming the Blob before releasing its URL.
        setTimeout(() => URL.revokeObjectURL(url), DOWNLOAD_URL_LIFETIME_MS);
      }
      setMessage("CSV download started.");
    } catch {
      if (!controller.signal.aborted)
        setError(
          "Export failed. No partial file was downloaded. Please try again.",
        );
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
      if (!controller.signal.aborted) setIsExporting(false);
    }
  }

  return { exportAllData, isExporting, exportedCount, error, message };
}

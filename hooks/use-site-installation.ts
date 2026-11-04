"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useSiteInstallation(siteId: string, userId: string) {
  const [site, setSite] = useState<{ id: string; domain: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [snippet, setSnippet] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from("sites")
          .select("id, domain")
          .eq("id", siteId)
          .eq("user_id", userId)
          .maybeSingle();
        if (error) throw error;
        if (!active) return;
        if (!data) {
          setError("Site not found or you do not have access.");
          return;
        }
        setSite(data);
        // Use DOM serialization to escape attribute values in the copyable HTML.
        const script = document.createElement("script");
        script.async = true;
        script.src = `${window.location.origin}/tracker.js`;
        script.dataset.siteId = data.id;
        script.dataset.collectorUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/track`;
        setSnippet(script.outerHTML);
      } catch {
        if (active)
          setError("Could not load this site. Check the link or try again.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [siteId, userId]);

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopyMessage("Snippet copied.");
    } catch {
      setCopyMessage(
        "Could not copy automatically. Select and copy the snippet below.",
      );
    }
  }

  return { site, loading, error, snippet, copyMessage, copySnippet };
}

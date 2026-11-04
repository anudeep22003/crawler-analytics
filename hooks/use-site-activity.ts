"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export const ACTIVITY_PERIODS = ["24h", "7d", "30d"] as const;
export type ActivityPeriod = (typeof ACTIVITY_PERIODS)[number];
type Activity = {
  start: string;
  end: string;
  total: number;
  timeline: { bucket_start: string; visits: number }[];
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

export function useSiteActivity(siteId: string) {
  const [period, setPeriod] = useState<ActivityPeriod>("24h");
  // All preset comparisons share one snapshot; refresh the page for a new one.
  const [end] = useState(() => new Date().toISOString());
  const [result, setResult] = useState<{
    period: ActivityPeriod;
    activity: Activity;
  } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    async function loadActivity() {
      try {
        if (!supabase) throw new Error("Supabase is not configured");
        const { data, error } = await supabase.rpc("site_activity", {
          p_site_id: siteId,
          p_period: period,
          p_end: end,
        });
        if (error) throw error;
        if (active) setResult({ period, activity: data });
      } catch {
        if (active)
          setError("Could not load activity. Refresh the page to try again.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadActivity();
    return () => {
      active = false;
    };
  }, [siteId, period, end]);

  const activity = result?.period === period ? result.activity : null;
  const points =
    activity?.timeline.map((bucket) => ({
      ...bucket,
      label: dateFormatter.format(new Date(bucket.bucket_start)),
    })) ?? [];
  const windowLabel = activity
    ? `${dateFormatter.format(new Date(activity.start))} – ${dateFormatter.format(new Date(activity.end))} UTC`
    : "";

  return {
    period,
    setPeriod,
    activity,
    points,
    windowLabel,
    error,
    loading: loading || (!activity && !error),
  };
}

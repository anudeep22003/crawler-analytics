"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { SiteActivity } from "@/lib/site-activity";

export const ACTIVITY_PERIODS = ["24h", "7d", "30d"] as const;
export type ActivityPeriod = (typeof ACTIVITY_PERIODS)[number];
export const BOT_TYPE_LABELS: Record<string, string> = {
  training: "AI Training",
  search: "AI Search",
  assistant: "AI Assistant",
  unknown: "Unknown",
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
  const [platform, setPlatform] = useState("");
  const [botType, setBotType] = useState("");
  const requestKey = JSON.stringify([siteId, period, platform, botType]);

  // All preset comparisons share one snapshot; refresh the page for a new one.
  const [end] = useState(() => new Date().toISOString());
  const [result, setResult] = useState<{
    key: string;
    activity: SiteActivity;
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
          p_platform: platform || null,
          p_bot_type: botType || null,
        });
        if (error) throw error;
        if (active) setResult({ key: requestKey, activity: data });
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
  }, [siteId, period, platform, botType, end, requestKey]);

  const activity = result?.key === requestKey ? result.activity : null;
  const points =
    activity?.timeline.map((bucket) => ({
      ...bucket,
      label: dateFormatter.format(new Date(bucket.bucket_start)),
    })) ?? [];
  const windowLabel = activity
    ? `${dateFormatter.format(new Date(activity.start))} – ${dateFormatter.format(new Date(activity.end))} UTC`
    : "";

  const metrics = activity
    ? [
        {
          label: "Total recorded visits",
          value: activity.total.toLocaleString(),
        },
        {
          label: "Active bots",
          value: activity.overview.active_bots.toLocaleString(),
        },
        { label: "Top platform", value: activity.overview.top_platform ?? "—" },
        { label: "Top page", value: activity.overview.top_page ?? "—" },
      ]
    : [];
  const recentEvents =
    activity?.recent_events.map((event) => ({
      ...event,
      timestampLabel: dateFormatter.format(new Date(event.timestamp)),
      botTypeLabel: BOT_TYPE_LABELS[event.bot_type] ?? event.bot_type,
    })) ?? [];
  const platformOptions = [...(result?.activity.available_platforms ?? [])];
  if (platform && !platformOptions.includes(platform))
    platformOptions.push(platform);

  return {
    period,
    setPeriod,
    platform,
    setPlatform,
    botType,
    setBotType,
    platformOptions,
    metrics,
    recentEvents,
    activity,
    points,
    windowLabel,
    error,
    loading: loading || (!activity && !error),
  };
}

"use client";

import {
  ACTIVITY_PERIODS,
  BOT_TYPE_LABELS,
  useSiteActivity,
} from "@/hooks/use-site-activity";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityTimeline } from "@/components/activity-timeline";
import { PlatformBreakdown } from "@/components/platform-breakdown";
import { TopPages, RecentActivity } from "@/components/activity-tables";

export function SiteActivity({ siteId }: { siteId: string }) {
  const {
    period,
    setPeriod,
    platform,
    setPlatform,
    botType,
    setBotType,
    platformOptions,
    activity,
    points,
    metrics,
    recentEvents,
    windowLabel,
    error,
    loading,
  } = useSiteActivity(siteId);

  return (
    <section className="space-y-6" aria-label="Site analytics">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Recorded activity</h2>
        <div role="group" aria-label="Activity period" className="flex gap-2">
          {ACTIVITY_PERIODS.map((value) => (
            <Button
              key={value}
              size="sm"
              variant={period === value ? "default" : "outline"}
              aria-pressed={period === value}
              onClick={() => setPeriod(value)}
            >
              {value}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="space-y-1 text-sm">
            <label htmlFor="activity-platform" className="block">
              Platform
            </label>
            <select
              id="activity-platform"
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
              className="h-9 rounded-md border bg-background px-3"
            >
              <option value="">All platforms</option>
              {platformOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 text-sm">
            <label htmlFor="activity-bot-type" className="block">
              Bot type
            </label>
            <select
              id="activity-bot-type"
              value={botType}
              onChange={(event) => setBotType(event.target.value)}
              className="h-9 rounded-md border bg-background px-3"
            >
              <option value="">All types</option>
              {Object.entries(BOT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Filters apply to every section. Includes unclassified visits; active
          bots counts distinct recognized identities in this window.
        </p>
      </div>

      {loading ? (
        <p role="status">Loading activity…</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : (
        activity && (
          <>
            <p className="text-xs text-muted-foreground">{windowLabel}</p>
            <div className="grid grid-cols-2 gap-3" aria-live="polite">
              {metrics.map((metric) => (
                <Card key={metric.label}>
                  <CardHeader>
                    <CardTitle className="text-sm text-muted-foreground">
                      {metric.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p
                      aria-label={metric.label}
                      className="break-all text-xl font-semibold"
                    >
                      {metric.value}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
            {activity.total === 0 && (
              <p>No recorded visits in this selection.</p>
            )}
            <Card>
              <CardHeader>
                <CardTitle>Visits over time</CardTitle>
              </CardHeader>
              <CardContent>
                <ActivityTimeline points={points} />
                <p className="text-xs text-muted-foreground">
                  {period === "24h" ? "Hourly" : "Daily"} buckets from the
                  window start. Times are UTC.
                </p>
              </CardContent>
            </Card>
            <PlatformBreakdown platforms={activity.platforms} />
            <TopPages pages={activity.top_pages} />
            <RecentActivity events={recentEvents} />
          </>
        )
      )}
    </section>
  );
}

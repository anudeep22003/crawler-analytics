"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ACTIVITY_PERIODS, useSiteActivity } from "@/hooks/use-site-activity";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartConfig = {
  visits: { label: "Recorded visits", color: "var(--chart-1)" },
};

export function SiteActivity({ siteId }: { siteId: string }) {
  const { period, setPeriod, activity, points, windowLabel, error, loading } =
    useSiteActivity(siteId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recorded activity</CardTitle>
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
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p role="status">Loading activity…</p>
        ) : error ? (
          <p role="alert">{error}</p>
        ) : (
          activity && (
            <>
              <div aria-live="polite">
                <p className="text-sm text-muted-foreground">
                  Total recorded visits
                </p>
                <p
                  className="text-3xl font-semibold"
                  aria-label="Total recorded visits"
                >
                  {activity.total.toLocaleString()}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">{windowLabel}</p>
              {activity.total === 0 && (
                <p>No recorded visits in this period.</p>
              )}
              <ChartContainer
                config={chartConfig}
                className="h-64 w-full"
                aria-label="Recorded visits timeline"
              >
                <LineChart accessibilityLayer data={points}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="label"
                    minTickGap={32}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis allowDecimals={false} width={32} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="linear"
                    dataKey="visits"
                    stroke="var(--color-visits)"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ChartContainer>
              <p className="text-xs text-muted-foreground">
                {period === "24h" ? "Hourly" : "Daily"} buckets from the window
                start. Includes all recorded visits, including unclassified
                traffic.
              </p>
            </>
          )
        )}
      </CardContent>
    </Card>
  );
}

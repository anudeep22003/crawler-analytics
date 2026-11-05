"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { PlatformCount } from "@/lib/site-activity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartConfig = {
  visits: { label: "Recorded visits", color: "var(--primary)" },
};

export function PlatformBreakdown({
  platforms,
}: {
  platforms: PlatformCount[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Visits by platform</CardTitle>
      </CardHeader>
      <CardContent>
        {platforms.length === 0 ? (
          <p>No platforms in this selection.</p>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="h-80 w-full"
            aria-label="Visits by platform chart"
          >
            <BarChart accessibilityLayer data={platforms} layout="vertical">
              <CartesianGrid horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis
                dataKey="platform"
                type="category"
                width={100}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="visits"
                fill="var(--color-visits)"
                radius={4}
                isAnimationActive={false}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

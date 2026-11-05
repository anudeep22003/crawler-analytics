"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartConfig = {
  visits: { label: "Recorded visits", color: "var(--primary)" },
};

type Point = { bucket_start: string; visits: number; label: string };

export function ActivityTimeline({ points }: { points: Point[] }) {
  return (
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
  );
}

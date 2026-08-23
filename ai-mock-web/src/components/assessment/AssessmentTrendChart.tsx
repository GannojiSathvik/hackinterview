"use client";

import { LineChart as LineChartIcon } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ScoreTrendPoint } from "@/types/assessment";

interface AssessmentTrendChartProps {
  trend: ScoreTrendPoint[];
}

export default function AssessmentTrendChart({ trend }: AssessmentTrendChartProps) {
  const data = trend.map((point) => ({
    name: `#${point.attemptNumber}`,
    score: point.score,
  }));

  return (
    <div className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-md">
      <div className="flex items-center gap-2 mb-5">
        <LineChartIcon className="w-5 h-5 text-primary" />
        <h3 className="text-base font-bold text-foreground">Performance Trend</h3>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="name"
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
              width={36}
            />
            <Tooltip
              formatter={(value: number) => [`${value}%`, "Score"]}
              labelFormatter={(label) => `Attempt ${label}`}
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "0.75rem",
                fontSize: "0.75rem",
              }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="var(--primary)"
              strokeWidth={2.5}
              dot={{ fill: "var(--primary)", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

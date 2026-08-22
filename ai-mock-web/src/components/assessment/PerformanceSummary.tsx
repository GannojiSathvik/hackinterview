"use client";

import { Sparkles } from "lucide-react";
import { getPerformanceLevel, PERFORMANCE_COLORS, PERFORMANCE_FEEDBACK } from "@/constants/assessment";

interface PerformanceSummaryProps {
  scorePercentage: number;
}

export default function PerformanceSummary({
  scorePercentage,
}: PerformanceSummaryProps) {
  const level = getPerformanceLevel(scorePercentage);
  const colors = PERFORMANCE_COLORS[level];

  return (
    <div className={`bg-card border ${colors.border} rounded-2xl p-6 md:p-8 shadow-md mt-6`}>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className={`w-5 h-5 ${colors.text}`} />
        <h3 className="text-base font-bold text-foreground">
          Performance Summary
        </h3>
      </div>
      <p className={`text-sm font-semibold ${colors.text} mb-1`}>{level}</p>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {PERFORMANCE_FEEDBACK[level]}
      </p>
    </div>
  );
}

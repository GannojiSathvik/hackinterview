"use client";

import { ListChecks, ArrowRight } from "lucide-react";
import { getPerformanceLevel, PERFORMANCE_RECOMMENDATIONS } from "@/constants/assessment";

interface RecommendationListProps {
  scorePercentage: number;
}

export default function RecommendationList({
  scorePercentage,
}: RecommendationListProps) {
  const level = getPerformanceLevel(scorePercentage);
  const recommendations = PERFORMANCE_RECOMMENDATIONS[level];

  return (
    <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-md mt-6">
      <div className="flex items-center gap-2 mb-4">
        <ListChecks className="w-5 h-5 text-primary" />
        <h3 className="text-base font-bold text-foreground">
          Recommended Next Steps
        </h3>
      </div>
      <ul className="space-y-2.5">
        {recommendations.map((item) => (
          <li
            key={item}
            className="flex items-center gap-2.5 text-sm text-foreground/90"
          >
            <ArrowRight className="w-4 h-4 text-primary shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

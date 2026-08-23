"use client";

import { ListOrdered, Trophy, TrendingUp, Target } from "lucide-react";
import type { AssessmentStatisticsSummary } from "@/types/assessment";

interface AssessmentStatisticsCardsProps {
  statistics: AssessmentStatisticsSummary;
}

export default function AssessmentStatisticsCards({
  statistics,
}: AssessmentStatisticsCardsProps) {
  const cards = [
    {
      label: "Total Attempts",
      value: statistics.totalAttempts,
      icon: ListOrdered,
    },
    {
      label: "Best Score",
      value: `${statistics.bestScore}%`,
      icon: Trophy,
    },
    {
      label: "Average Score",
      value: `${statistics.averageScore}%`,
      icon: TrendingUp,
    },
    {
      label: "Average Accuracy",
      value: `${statistics.averageAccuracy}%`,
      icon: Target,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ label, value, icon: Icon }) => (
        <div
          key={label}
          className="bg-card border border-border rounded-2xl p-5 shadow-md"
        >
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-3">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{label}</p>
        </div>
      ))}
    </div>
  );
}

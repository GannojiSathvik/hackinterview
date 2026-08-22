"use client";

import { BarChart3 } from "lucide-react";
import type { AssessmentResult } from "@/types/assessment";

interface AssessmentStatisticsProps {
  result: AssessmentResult;
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function AssessmentStatistics({
  result,
}: AssessmentStatisticsProps) {
  const stats = [
    { label: "Score", value: `${result.scorePercentage}%` },
    { label: "Total Questions", value: result.totalQuestions },
    { label: "Correct Answers", value: result.correctAnswers },
    { label: "Wrong Answers", value: result.wrongAnswers },
    { label: "Time Taken", value: formatDuration(result.timeTakenSeconds) },
    { label: "Accuracy Rate", value: `${result.accuracyRate}%` },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-md mt-6">
      <div className="flex items-center gap-2 mb-5">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h3 className="text-base font-bold text-foreground">
          Assessment Statistics
        </h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col items-center p-4 rounded-xl bg-muted/50 border border-border"
          >
            <span className="text-xl font-bold text-foreground">
              {stat.value}
            </span>
            <span className="text-xs text-muted-foreground mt-1 text-center">
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

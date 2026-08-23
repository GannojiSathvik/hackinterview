"use client";

import { Eye } from "lucide-react";
import type { AttemptHistoryItem } from "@/types/assessment";
import { PERFORMANCE_COLORS } from "@/constants/assessment";

interface AssessmentHistoryTableProps {
  attempts: AttemptHistoryItem[];
  onViewDetails: (attemptId: string) => void;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function AssessmentHistoryTable({
  attempts,
  onViewDetails,
}: AssessmentHistoryTableProps) {
  return (
    <div className="bg-card border border-border rounded-2xl shadow-md overflow-hidden">
      <div className="px-5 md:px-6 py-4 border-b border-border/60">
        <h3 className="text-base font-bold text-foreground">Attempt History</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground uppercase tracking-wide border-b border-border/60">
              <th className="px-5 md:px-6 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Score</th>
              <th className="px-4 py-3 font-semibold">Accuracy</th>
              <th className="px-4 py-3 font-semibold">Performance</th>
              <th className="px-4 py-3 font-semibold">Time Taken</th>
              <th className="px-4 py-3 font-semibold text-right pr-5 md:pr-6">Actions</th>
            </tr>
          </thead>
          <tbody>
            {attempts.map((attempt) => {
              const colors = PERFORMANCE_COLORS[attempt.performanceLevel];
              return (
                <tr
                  key={attempt.attemptId}
                  className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-5 md:px-6 py-3.5 text-foreground/90 whitespace-nowrap">
                    {formatDate(attempt.completedAt)}
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-foreground">
                    {attempt.score}%
                  </td>
                  <td className="px-4 py-3.5 text-foreground/90">
                    {attempt.accuracyRate}%
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${colors.text} ${colors.bg} border ${colors.border}`}
                    >
                      {attempt.performanceLevel}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-foreground/90 font-mono text-xs">
                    {formatDuration(attempt.timeTakenSeconds)}
                  </td>
                  <td className="px-4 py-3.5 text-right pr-5 md:pr-6">
                    <button
                      onClick={() => onViewDetails(attempt.attemptId)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Details
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { CheckCircle2, XCircle, X, MinusCircle } from "lucide-react";
import type { AttemptDetails } from "@/types/assessment";
import { PERFORMANCE_COLORS } from "@/constants/assessment";

interface AttemptDetailsModalProps {
  details: AttemptDetails;
  onClose: () => void;
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function AttemptDetailsModal({
  details,
  onClose,
}: AttemptDetailsModalProps) {
  const colors = PERFORMANCE_COLORS[details.performanceLevel];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-border/60 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-foreground">Attempt Details</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {formatDate(details.completedAt)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-6 py-5 space-y-6">
          {/* Summary */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span
                className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${colors.text} ${colors.bg} border ${colors.border}`}
              >
                {details.performanceLevel}
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              <div className="flex flex-col items-center p-3 rounded-xl bg-muted/50 border border-border">
                <span className="text-lg font-bold text-foreground">{details.score}%</span>
                <span className="text-[11px] text-muted-foreground mt-0.5">Score</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-xl bg-muted/50 border border-border">
                <span className="text-lg font-bold text-foreground">{details.accuracyRate}%</span>
                <span className="text-[11px] text-muted-foreground mt-0.5">Accuracy</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {details.correctAnswers}
                </span>
                <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                  Correct
                </span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                <span className="text-lg font-bold text-red-600 dark:text-red-400">
                  {details.wrongAnswers}
                </span>
                <span className="text-[11px] text-red-600/80 dark:text-red-400/80 mt-0.5">
                  Wrong
                </span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-xl bg-muted/50 border border-border">
                <span className="text-lg font-bold text-foreground">
                  {details.unansweredAnswers}
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5">Unanswered</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-xl bg-muted/50 border border-border">
                <span className="text-lg font-bold text-foreground font-mono">
                  {formatDuration(details.timeTakenSeconds)}
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5">Time Taken</span>
              </div>
            </div>
          </div>

          {/* Question breakdown */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">
              Question Breakdown
            </h4>
            <div className="space-y-3">
              {details.questions.map((q, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-border bg-muted/20"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-primary bg-primary/10 rounded-full px-2.5 py-0.5">
                      {q.category}
                    </span>
                    {q.selectedAnswer === null ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground shrink-0">
                        <MinusCircle className="w-3.5 h-3.5" />
                        Unanswered
                      </span>
                    ) : q.isCorrect ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Correct
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 shrink-0">
                        <XCircle className="w-3.5 h-3.5" />
                        Incorrect
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground/90 mb-2">
                    <span className="text-primary mr-1.5">Q{idx + 1}.</span>
                    {q.questionText}
                  </p>
                  {q.selectedAnswer !== null && (
                    <p className="text-xs text-muted-foreground">
                      Your answer:{" "}
                      <span className="text-foreground/80 font-medium">
                        {q.selectedAnswer}
                      </span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

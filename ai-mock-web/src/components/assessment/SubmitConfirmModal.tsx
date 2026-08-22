"use client";

import { AlertTriangle, X } from "lucide-react";

interface SubmitConfirmModalProps {
  totalQuestions: number;
  answeredCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function SubmitConfirmModal({
  totalQuestions,
  answeredCount,
  onCancel,
  onConfirm,
}: SubmitConfirmModalProps) {
  const unanswered = totalQuestions - answeredCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4 animate-fade-in">
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Icon */}
        <div className="w-14 h-14 bg-yellow-500/10 rounded-2xl flex items-center justify-center mb-5 mx-auto">
          <AlertTriangle className="w-7 h-7 text-yellow-500" />
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-foreground text-center mb-2">
          Submit Assessment?
        </h3>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Please review your submission summary before confirming.
        </p>

        {/* Summary */}
        <div className="space-y-3 mb-8">
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/50 border border-border">
            <span className="text-sm text-muted-foreground">
              Total Questions
            </span>
            <span className="text-sm font-semibold text-foreground">
              {totalQuestions}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <span className="text-sm text-emerald-600 dark:text-emerald-400">
              Answered
            </span>
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              {answeredCount}
            </span>
          </div>
          {unanswered > 0 && (
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-red-500/5 border border-red-500/20">
              <span className="text-sm text-red-600 dark:text-red-400">
                Unanswered
              </span>
              <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                {unanswered}
              </span>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-5 py-3 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-medium text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] transition-all duration-300"
          >
            Submit Assessment
          </button>
        </div>
      </div>
    </div>
  );
}

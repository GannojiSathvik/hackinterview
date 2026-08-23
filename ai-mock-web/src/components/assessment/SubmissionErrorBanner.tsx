"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

interface SubmissionErrorBannerProps {
  message: string | null;
  onRetry: () => void;
}

/** Shown when a submission attempt fails (as opposed to failing to start
 * the assessment at all) — answers are preserved, retry just re-submits. */
export default function SubmissionErrorBanner({
  message,
  onRetry,
}: SubmissionErrorBannerProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/5 border border-red-500/20 text-sm">
      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
      <span className="flex-1 text-red-600 dark:text-red-400">
        {message || "Couldn't submit your assessment. Your answers are safe — try again."}
      </span>
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium text-xs shrink-0 transition-colors"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Retry
      </button>
    </div>
  );
}

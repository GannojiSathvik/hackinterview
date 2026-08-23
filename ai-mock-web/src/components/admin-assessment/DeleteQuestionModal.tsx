"use client";

import { AlertTriangle, X } from "lucide-react";
import type { AdminQuestion } from "@/app/lib/adminAssessmentApi";

interface DeleteQuestionModalProps {
  question: AdminQuestion;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteQuestionModal({
  question,
  busy,
  error,
  onCancel,
  onConfirm,
}: DeleteQuestionModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={busy ? undefined : onCancel} />

      <div className="relative bg-card border border-border rounded-2xl p-8 shadow-2xl max-w-md w-full animate-fade-in">
        <button
          onClick={onCancel}
          disabled={busy}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-40"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mb-5 mx-auto">
          <AlertTriangle className="w-7 h-7 text-red-500" />
        </div>

        <h3 className="text-xl font-bold text-foreground text-center mb-2">Delete this question?</h3>
        <p className="text-sm text-muted-foreground text-center mb-2">
          &ldquo;{question.questionText.slice(0, 120)}
          {question.questionText.length > 120 ? "…" : ""}&rdquo;
        </p>
        <p className="text-xs text-muted-foreground text-center mb-6">
          This cannot be undone. If this question has been used in a completed attempt, deletion
          will be blocked — disable it instead.
        </p>

        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 text-center mb-4 bg-red-500/10 border border-red-500/20 rounded-lg py-2 px-3">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 px-5 py-3 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-medium text-sm transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 px-5 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm shadow-lg shadow-red-500/25 transition-colors disabled:opacity-50"
          >
            {busy ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

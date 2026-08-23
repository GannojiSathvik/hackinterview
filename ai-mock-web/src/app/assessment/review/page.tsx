"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import { useAssessmentSession } from "@/contexts/AssessmentSessionContext";

import Timer from "@/components/assessment/Timer";
import ReviewQuestionGrid from "@/components/assessment/ReviewQuestionGrid";
import SubmitConfirmModal from "@/components/assessment/SubmitConfirmModal";
import SubmissionErrorBanner from "@/components/assessment/SubmissionErrorBanner";

export default function AssessmentReviewPage() {
  const router = useRouter();
  const { attempt, attemptStatus, attemptError, timeRemaining, goTo, finalizeAndSubmit } =
    useAssessmentSession();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const isSubmitting = attemptStatus === "submitting";

  // Route guard: no in-progress attempt to review, or it's already finalized.
  useEffect(() => {
    if (!attempt) {
      router.replace("/assessment/test");
    } else if (attempt.isFinalized) {
      router.replace("/assessment/result");
    }
  }, [attempt, router]);

  // If a submission fails, close the confirm modal so the page-level error
  // banner (with its own Retry) is the one place to recover from — avoids
  // showing a modal and a banner at the same time.
  useEffect(() => {
    if (attemptStatus === "error") {
      setShowConfirmModal(false);
    }
  }, [attemptStatus]);

  if (!attempt || attempt.isFinalized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { order, answers } = attempt;
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = order.length - answeredCount;

  const handleJumpTo = (index: number) => {
    goTo(index);
    router.push("/assessment/test");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Top Bar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <button
            onClick={() => router.push("/assessment/test")}
            className="flex items-center gap-1.5 text-sm font-semibold text-foreground/80 hover:text-primary transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 rounded"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Test
          </button>
          <h1 className="text-base md:text-lg font-bold text-foreground truncate">
            Review Answers
          </h1>
          <Timer remainingSeconds={timeRemaining} />
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────── */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 md:px-6 py-6 md:py-10 space-y-6">
        {/* Assessment Summary */}
        <div className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-md">
          <h4 className="text-sm font-semibold text-foreground mb-4">
            Assessment Summary
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex flex-col items-center p-4 rounded-xl bg-muted/50 border border-border">
              <span className="text-xl font-bold text-foreground">
                {order.length}
              </span>
              <span className="text-xs text-muted-foreground mt-1">
                Total Questions
              </span>
            </div>
            <div className="flex flex-col items-center p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {answeredCount}
              </span>
              <span className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1">
                Answered
              </span>
            </div>
            <div className="flex flex-col items-center p-4 rounded-xl bg-red-500/5 border border-red-500/20">
              <span className="text-xl font-bold text-red-600 dark:text-red-400">
                {unansweredCount}
              </span>
              <span className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">
                Unanswered
              </span>
            </div>
            <div className="flex flex-col items-center p-4 rounded-xl bg-muted/50 border border-border">
              <span className="text-xl font-bold text-foreground font-mono">
                {String(Math.floor(timeRemaining / 60)).padStart(2, "0")}:
                {String(timeRemaining % 60).padStart(2, "0")}
              </span>
              <span className="text-xs text-muted-foreground mt-1">
                Time Remaining
              </span>
            </div>
          </div>
        </div>

        {/* Question Review Grid */}
        <ReviewQuestionGrid
          totalQuestions={order.length}
          answers={answers}
          onJumpTo={handleJumpTo}
        />

        {attemptStatus === "error" && (
          <SubmissionErrorBanner message={attemptError} onRetry={finalizeAndSubmit} />
        )}
      </div>

      {/* ── Bottom Nav ──────────────────────────────────────── */}
      <footer className="sticky bottom-0 z-40 bg-background/80 backdrop-blur-md border-t border-border/50">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => router.push("/assessment/test")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-medium text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back To Test
          </button>

          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? "Submitting…" : "Submit Final Assessment"}
          </button>
        </div>
      </footer>

      {/* ── Submit Confirmation Modal ───────────────────────── */}
      {showConfirmModal && (
        <SubmitConfirmModal
          totalQuestions={order.length}
          answeredCount={answeredCount}
          onCancel={() => setShowConfirmModal(false)}
          onConfirm={finalizeAndSubmit}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}

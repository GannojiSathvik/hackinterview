"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ListChecks } from "lucide-react";
import { useAssessmentSession } from "@/contexts/AssessmentSessionContext";

import Timer from "@/components/assessment/Timer";
import ProgressBar from "@/components/assessment/ProgressBar";
import QuestionCard from "@/components/assessment/QuestionCard";
import QuestionPalette from "@/components/assessment/QuestionPalette";
import ExitConfirmationModal from "@/components/assessment/ExitConfirmationModal";

export default function AssessmentTestPage() {
  const router = useRouter();
  const { attempt, timeRemaining, startAttempt, selectAnswer, goTo, next, prev } =
    useAssessmentSession();
  const [showExitModal, setShowExitModal] = useState(false);

  // Start a fresh, shuffled attempt only if one isn't already in progress —
  // this keeps returning from /assessment/review from reshuffling anything.
  useEffect(() => {
    if (!attempt) {
      startAttempt();
    }
  }, [attempt, startAttempt]);

  // Warn on tab close / refresh / external navigation while the attempt is active.
  useEffect(() => {
    if (!attempt || attempt.isFinalized) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [attempt]);

  if (!attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { order, currentIndex, answers, visited } = attempt;
  const answeredCount = Object.keys(answers).length;
  const currentEntry = order[currentIndex];

  const handleConfirmExit = () => {
    router.push("/assessment");
  };

  const handleReview = () => {
    router.push("/assessment/review");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Top Bar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          {/* Left: Title */}
          <button
            onClick={() => setShowExitModal(true)}
            className="text-sm font-semibold text-foreground/80 hover:text-primary transition-colors hidden sm:block focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 rounded"
          >
            ← Exit
          </button>
          <h1 className="text-base md:text-lg font-bold text-foreground truncate">
            Aptitude Assessment
          </h1>

          {/* Center: Progress */}
          <div className="hidden md:block flex-1 max-w-xs">
            <ProgressBar answered={answeredCount} total={order.length} />
          </div>

          {/* Right: Timer */}
          <Timer remainingSeconds={timeRemaining} />
        </div>

        {/* Mobile progress */}
        <div className="md:hidden px-4 pb-3">
          <ProgressBar answered={answeredCount} total={order.length} />
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────── */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Question area */}
          <div className="flex-1">
            <QuestionCard
              question={currentEntry.question}
              questionIndex={currentIndex}
              totalQuestions={order.length}
              optionOrder={currentEntry.optionOrder}
              selectedAnswer={answers[currentIndex]}
              onSelectAnswer={selectAnswer}
            />
          </div>

          {/* Sidebar: palette */}
          <div className="lg:w-64 shrink-0">
            <QuestionPalette
              totalQuestions={order.length}
              currentIndex={currentIndex}
              answers={answers}
              visited={visited}
              onJumpTo={goTo}
            />
          </div>
        </div>
      </div>

      {/* ── Bottom Nav ──────────────────────────────────────── */}
      <footer className="sticky bottom-0 z-40 bg-background/80 backdrop-blur-md border-t border-border/50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <button
            onClick={prev}
            disabled={currentIndex === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-medium text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          {/* Question counter (mobile) */}
          <span className="text-sm text-muted-foreground font-medium lg:hidden">
            {currentIndex + 1} / {order.length}
          </span>

          <div className="flex items-center gap-3">
            {currentIndex < order.length - 1 ? (
              <button
                onClick={next}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary/10 text-primary font-semibold text-sm hover:bg-primary hover:text-primary-foreground transition-all duration-300"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : null}

            <button
              onClick={handleReview}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] transition-all duration-300"
            >
              <ListChecks className="w-4 h-4" />
              Review Answers
            </button>
          </div>
        </div>
      </footer>

      {/* ── Exit Confirmation Modal ─────────────────────────── */}
      {showExitModal && (
        <ExitConfirmationModal
          onCancel={() => setShowExitModal(false)}
          onConfirm={handleConfirmExit}
        />
      )}
    </div>
  );
}

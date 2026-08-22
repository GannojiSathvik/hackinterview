"use client";

import type { AnswerMap } from "@/types/assessment";

interface ReviewQuestionGridProps {
  totalQuestions: number;
  answers: AnswerMap;
  onJumpTo: (index: number) => void;
}

export default function ReviewQuestionGrid({
  totalQuestions,
  answers,
  onJumpTo,
}: ReviewQuestionGridProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-md">
      <h4 className="text-sm font-semibold text-foreground mb-4">
        Question Review
      </h4>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-5">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-primary/20" />
          Answered
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-muted border border-border" />
          Unanswered
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
        {Array.from({ length: totalQuestions }, (_, idx) => {
          const isAnswered = answers[idx] !== undefined;

          return (
            <button
              key={idx}
              onClick={() => onJumpTo(idx)}
              aria-label={`Question ${idx + 1}, ${
                isAnswered ? "answered" : "unanswered"
              }`}
              className={`w-10 h-10 rounded-lg text-sm font-semibold flex items-center justify-center transition-all duration-200 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 ${
                isAnswered
                  ? "bg-primary/20 text-primary hover:bg-primary/30"
                  : "bg-muted text-muted-foreground border border-border hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

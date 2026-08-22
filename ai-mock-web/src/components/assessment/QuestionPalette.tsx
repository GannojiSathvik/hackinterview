"use client";

import type { AnswerMap } from "@/types/assessment";

interface QuestionPaletteProps {
  totalQuestions: number;
  currentIndex: number;
  answers: AnswerMap;
  visited: Set<number>;
  onJumpTo: (index: number) => void;
}

export default function QuestionPalette({
  totalQuestions,
  currentIndex,
  answers,
  visited,
  onJumpTo,
}: QuestionPaletteProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-md">
      <h4 className="text-sm font-semibold text-foreground mb-4">
        Question Palette
      </h4>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-4">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-primary" />
          Current
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-primary/30" />
          Answered
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-muted border border-primary/40" />
          Visited
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-muted border border-border" />
          Not Visited
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: totalQuestions }, (_, idx) => {
          const isCurrent = idx === currentIndex;
          const isAnswered = answers[idx] !== undefined;
          const isVisited = visited.has(idx);

          let classes =
            "w-10 h-10 rounded-lg text-sm font-semibold flex items-center justify-center transition-all duration-200 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 ";

          if (isCurrent) {
            classes +=
              "bg-primary text-primary-foreground ring-2 ring-primary/50 ring-offset-2 ring-offset-card shadow-md";
          } else if (isAnswered) {
            classes += "bg-primary/20 text-primary hover:bg-primary/30";
          } else if (isVisited) {
            classes +=
              "bg-muted text-muted-foreground border border-primary/40 hover:text-foreground";
          } else {
            classes +=
              "bg-muted text-muted-foreground border border-border hover:border-primary/40 hover:text-foreground";
          }

          const status = isAnswered
            ? "answered"
            : isVisited
              ? "visited, unanswered"
              : "not visited";

          return (
            <button
              key={idx}
              onClick={() => onJumpTo(idx)}
              aria-label={`Question ${idx + 1}, ${status}${isCurrent ? ", current" : ""}`}
              aria-current={isCurrent ? "true" : undefined}
              className={classes}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

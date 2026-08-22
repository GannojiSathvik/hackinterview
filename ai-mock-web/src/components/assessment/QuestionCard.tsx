"use client";

import type { Question } from "@/types/assessment";

interface QuestionCardProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  /** Original option indices (0-3), in the order they should be displayed. */
  optionOrder: number[];
  /** Selected option's original index, or undefined if unanswered. */
  selectedAnswer: number | undefined;
  /** Receives the original (pre-shuffle) option index of the chosen option. */
  onSelectAnswer: (originalOptionIndex: number) => void;
}

export default function QuestionCard({
  question,
  questionIndex,
  totalQuestions,
  optionOrder,
  selectedAnswer,
  onSelectAnswer,
}: QuestionCardProps) {
  const fieldsetName = `question-${questionIndex}`;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-md">
      {/* Question header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold tracking-widest uppercase text-primary bg-primary/10 rounded-full px-3 py-1">
          {question.category}
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {question.difficulty}
        </span>
      </div>

      <fieldset>
        {/* Question number + text */}
        <legend className="text-lg md:text-xl font-semibold text-foreground mt-4 mb-8 leading-relaxed text-left">
          <span className="text-primary mr-2">Q{questionIndex + 1}.</span>
          {question.question}
        </legend>

        {/* Options */}
        <div className="space-y-3">
          {optionOrder.map((originalIdx, displayPos) => {
            const isSelected = selectedAnswer === originalIdx;
            const letter = String.fromCharCode(65 + displayPos); // A, B, C, D

            return (
              <label
                key={originalIdx}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl border transition-all duration-200 cursor-pointer group has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background ${
                  isSelected
                    ? "border-primary bg-primary/10 shadow-sm shadow-primary/10"
                    : "border-border hover:border-primary/40 hover:bg-primary/5"
                }`}
              >
                <input
                  type="radio"
                  name={fieldsetName}
                  value={originalIdx}
                  checked={isSelected}
                  onChange={() => onSelectAnswer(originalIdx)}
                  className="sr-only"
                />

                {/* Letter circle */}
                <span
                  aria-hidden="true"
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors duration-200 ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
                  }`}
                >
                  {letter}
                </span>

                {/* Option text */}
                <span
                  className={`text-sm md:text-base transition-colors duration-200 ${
                    isSelected
                      ? "text-foreground font-medium"
                      : "text-muted-foreground group-hover:text-foreground"
                  }`}
                >
                  {question.options[originalIdx]}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Footer */}
      <p className="text-xs text-muted-foreground mt-6 text-right">
        Question {questionIndex + 1} of {totalQuestions}
      </p>
    </div>
  );
}

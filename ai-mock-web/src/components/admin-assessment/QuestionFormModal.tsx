"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { AdminCategory, AdminQuestion, QuestionFormInput } from "@/app/lib/adminAssessmentApi";

interface QuestionFormModalProps {
  mode: "create" | "edit";
  categories: AdminCategory[];
  initial?: AdminQuestion;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: QuestionFormInput) => void;
}

const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;

function initialOptions(initial: AdminQuestion | undefined) {
  if (initial) {
    return initial.options.map((o) => ({ optionText: o.optionText, isCorrect: o.isCorrect }));
  }
  return [
    { optionText: "", isCorrect: false },
    { optionText: "", isCorrect: false },
    { optionText: "", isCorrect: false },
    { optionText: "", isCorrect: false },
  ];
}

export default function QuestionFormModal({
  mode,
  categories,
  initial,
  submitting,
  error,
  onClose,
  onSubmit,
}: QuestionFormModalProps) {
  const [questionText, setQuestionText] = useState(initial?.questionText ?? "");
  const [categoryId, setCategoryId] = useState(initial?.category.id ?? categories[0]?.id ?? "");
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? "Easy");
  const [options, setOptions] = useState(initialOptions(initial));
  const [formError, setFormError] = useState<string | null>(null);

  const updateOptionText = (index: number, text: string) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, optionText: text } : o)));
  };

  const setCorrectOption = (index: number) => {
    setOptions((prev) => prev.map((o, i) => ({ ...o, isCorrect: i === index })));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!questionText.trim()) {
      setFormError("Question text is required.");
      return;
    }
    if (!categoryId) {
      setFormError("Please select a category.");
      return;
    }
    if (options.some((o) => !o.optionText.trim())) {
      setFormError("All 4 options must be filled in.");
      return;
    }
    if (options.filter((o) => o.isCorrect).length !== 1) {
      setFormError("Exactly one option must be marked correct.");
      return;
    }

    onSubmit({ questionText: questionText.trim(), categoryId, difficulty, options });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={submitting ? undefined : onClose} />

      <div className="relative bg-card border border-border rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col animate-fade-in">
        <div className="flex items-start justify-between px-6 py-5 border-b border-border/60 shrink-0">
          <h3 className="text-lg font-bold text-foreground">
            {mode === "create" ? "New Question" : "Edit Question"}
          </h3>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-40"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
              Question Text
            </label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2">
              Options — select the correct one
            </label>
            <div className="space-y-2.5">
              {options.map((option, i) => (
                <div key={i} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="correct-option"
                    checked={option.isCorrect}
                    onChange={() => setCorrectOption(i)}
                    className="w-4 h-4 accent-primary shrink-0"
                  />
                  <input
                    type="text"
                    value={option.optionText}
                    onChange={(e) => updateOptionText(i, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              ))}
            </div>
          </div>

          {(formError || error) && (
            <p className="text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg py-2 px-3">
              {formError || error}
            </p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-5 py-3 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-medium text-sm transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 transition-all disabled:opacity-50"
            >
              {submitting ? "Saving..." : mode === "create" ? "Create Question" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

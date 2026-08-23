"use client";

import { Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import type { AdminQuestion } from "@/app/lib/adminAssessmentApi";

interface QuestionTableProps {
  questions: AdminQuestion[];
  busyId: string | null;
  onEdit: (question: AdminQuestion) => void;
  onDelete: (question: AdminQuestion) => void;
  onToggleActive: (question: AdminQuestion) => void;
}

const difficultyColors: Record<string, string> = {
  Easy: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  Medium: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
  Hard: "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20",
};

export default function QuestionTable({
  questions,
  busyId,
  onEdit,
  onDelete,
  onToggleActive,
}: QuestionTableProps) {
  return (
    <div className="bg-card border border-border rounded-2xl shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-semibold">Question</th>
              <th className="px-5 py-3 font-semibold">Category</th>
              <th className="px-5 py-3 font-semibold">Difficulty</th>
              <th className="px-5 py-3 font-semibold">Active</th>
              <th className="px-5 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => {
              const busy = busyId === q.id;
              return (
                <tr key={q.id} className="border-b border-border/60 last:border-0 hover:bg-muted/20">
                  <td className="px-5 py-4 max-w-md">
                    <p className="text-foreground/90 line-clamp-2">{q.questionText}</p>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-muted-foreground">
                    {q.category.name}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span
                      className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${
                        difficultyColors[q.difficulty] ?? "text-muted-foreground bg-muted border-border"
                      }`}
                    >
                      {q.difficulty}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span
                      className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${
                        q.isActive
                          ? "text-primary bg-primary/10 border-primary/20"
                          : "text-muted-foreground bg-muted border-border"
                      }`}
                    >
                      {q.isActive ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onToggleActive(q)}
                        disabled={busy}
                        title={q.isActive ? "Disable" : "Enable"}
                        className="p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-40"
                      >
                        {q.isActive ? (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                      <button
                        onClick={() => onEdit(q)}
                        disabled={busy}
                        title="Edit"
                        className="p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-40"
                      >
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => onDelete(q)}
                        disabled={busy}
                        title="Delete"
                        className="p-2 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

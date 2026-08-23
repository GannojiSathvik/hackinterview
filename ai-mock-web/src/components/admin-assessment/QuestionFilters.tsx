"use client";

import { Search } from "lucide-react";
import type { AdminCategory } from "@/app/lib/adminAssessmentApi";

export interface QuestionFiltersValue {
  search: string;
  categoryId: string;
  difficulty: string;
  active: string; // "" | "true" | "false"
}

interface QuestionFiltersProps {
  categories: AdminCategory[];
  value: QuestionFiltersValue;
  onChange: (value: QuestionFiltersValue) => void;
}

const selectClass =
  "px-3 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

export default function QuestionFilters({ categories, value, onChange }: QuestionFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search question text..."
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <select
        value={value.categoryId}
        onChange={(e) => onChange({ ...value, categoryId: e.target.value })}
        className={selectClass}
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        value={value.difficulty}
        onChange={(e) => onChange({ ...value, difficulty: e.target.value })}
        className={selectClass}
      >
        <option value="">All difficulties</option>
        <option value="Easy">Easy</option>
        <option value="Medium">Medium</option>
        <option value="Hard">Hard</option>
      </select>

      <select
        value={value.active}
        onChange={(e) => onChange({ ...value, active: e.target.value })}
        className={selectClass}
      >
        <option value="">All statuses</option>
        <option value="true">Active only</option>
        <option value="false">Disabled only</option>
      </select>
    </div>
  );
}

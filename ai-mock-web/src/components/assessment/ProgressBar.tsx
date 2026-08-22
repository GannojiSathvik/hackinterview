"use client";

interface ProgressBarProps {
  answered: number;
  total: number;
}

export default function ProgressBar({ answered, total }: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((answered / total) * 100) : 0;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          Progress
        </span>
        <span className="text-xs font-semibold text-foreground">
          {answered}/{total} answered
        </span>
      </div>
      <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

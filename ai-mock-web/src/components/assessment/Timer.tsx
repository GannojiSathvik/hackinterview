"use client";

import { Clock } from "lucide-react";

interface TimerProps {
  /** Seconds remaining, owned by the shared assessment session (single source of truth). */
  remainingSeconds: number;
}

export default function Timer({ remainingSeconds }: TimerProps) {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // Colour transitions based on time left
  let colorClass = "text-foreground";
  if (remainingSeconds <= 30) {
    colorClass = "text-red-500 animate-pulse";
  } else if (remainingSeconds <= 120) {
    colorClass = "text-yellow-500";
  }

  return (
    <div
      role="timer"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`Time remaining: ${minutes} minutes ${seconds} seconds`}
      className={`flex items-center gap-2 font-mono text-lg font-bold ${colorClass} transition-colors duration-300`}
    >
      <Clock className="w-5 h-5" aria-hidden="true" />
      <span>{formatted}</span>
    </div>
  );
}

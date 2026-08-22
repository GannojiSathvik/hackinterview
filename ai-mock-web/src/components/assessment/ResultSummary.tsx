"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Trophy } from "lucide-react";
import type { AssessmentResult } from "@/types/assessment";
import {
  getPerformanceLevel,
  PERFORMANCE_COLORS,
} from "@/constants/assessment";

interface ResultSummaryProps {
  result: AssessmentResult;
}

export default function ResultSummary({ result }: ResultSummaryProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const performanceLevel = getPerformanceLevel(result.scorePercentage);
  const colors = PERFORMANCE_COLORS[performanceLevel];

  // Animate score from 0 → actual score
  useEffect(() => {
    const target = result.scorePercentage;
    if (target === 0) return;

    const duration = 1200; // ms
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= target) {
        setAnimatedScore(target);
        clearInterval(interval);
      } else {
        setAnimatedScore(Math.round(current));
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [result.scorePercentage]);

  // SVG circle dash
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const dashOffset =
    circumference - (animatedScore / 100) * circumference;

  return (
    <div className="bg-card border border-border rounded-2xl p-8 md:p-10 shadow-xl">
      {/* Top badge */}
      <div className="flex justify-center mb-8">
        <span
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold ${colors.text} ${colors.bg} border ${colors.border}`}
        >
          <Trophy className="w-4 h-4" />
          {performanceLevel}
        </span>
      </div>

      {/* Circular score */}
      <div className="flex justify-center mb-10">
        <div className="relative w-44 h-44">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
            {/* Background circle */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              strokeWidth="10"
              className="stroke-muted"
            />
            {/* Score arc */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              className="stroke-primary"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-extrabold text-foreground">
              {animatedScore}%
            </span>
            <span className="text-xs text-muted-foreground mt-1">Score</span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Total */}
        <div className="flex flex-col items-center p-4 rounded-xl bg-muted/50 border border-border">
          <span className="text-2xl font-bold text-foreground">
            {result.totalQuestions}
          </span>
          <span className="text-xs text-muted-foreground mt-1">Total</span>
        </div>

        {/* Correct */}
        <div className="flex flex-col items-center p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {result.correctAnswers}
            </span>
          </div>
          <span className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1">
            Correct
          </span>
        </div>

        {/* Wrong */}
        <div className="flex flex-col items-center p-4 rounded-xl bg-red-500/5 border border-red-500/20">
          <div className="flex items-center gap-1.5">
            <XCircle className="w-5 h-5 text-red-500" />
            <span className="text-2xl font-bold text-red-600 dark:text-red-400">
              {result.wrongAnswers}
            </span>
          </div>
          <span className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">
            Wrong
          </span>
        </div>
      </div>
    </div>
  );
}

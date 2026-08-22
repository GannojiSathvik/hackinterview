/**
 * Assessment Module — Constants
 * All magic numbers and reusable values extracted here.
 */

import type { PerformanceLevel } from "@/types/assessment";

/** Assessment duration in minutes */
export const ASSESSMENT_DURATION_MINUTES = 15;

/** Assessment duration in seconds (used by the Timer component) */
export const ASSESSMENT_DURATION_SECONDS = ASSESSMENT_DURATION_MINUTES * 60;

/** Total number of questions in an assessment */
export const TOTAL_QUESTIONS = 10;

/** Score thresholds for performance levels (percentage) */
export const PERFORMANCE_THRESHOLDS = {
  excellent: 90,
  good: 75,
  average: 50,
} as const;

/** Topics covered in the Aptitude Assessment */
export const TOPICS_COVERED = [
  "Quantitative Aptitude",
  "Logical Reasoning",
  "Data Interpretation",
] as const;

/** sessionStorage key for persisting assessment results */
export const SESSION_STORAGE_KEY = "assessmentResult";

/**
 * Derive a performance level label from a percentage score.
 */
export function getPerformanceLevel(percentage: number): PerformanceLevel {
  if (percentage >= PERFORMANCE_THRESHOLDS.excellent) return "Excellent";
  if (percentage >= PERFORMANCE_THRESHOLDS.good) return "Good";
  if (percentage >= PERFORMANCE_THRESHOLDS.average) return "Average";
  return "Needs Improvement";
}

/**
 * Map performance level → Tailwind-friendly colour class tokens.
 */
export const PERFORMANCE_COLORS: Record<
  PerformanceLevel,
  { text: string; bg: string; border: string }
> = {
  Excellent: {
    text: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
  },
  Good: {
    text: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
  },
  Average: {
    text: "text-yellow-500",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
  },
  "Needs Improvement": {
    text: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
  },
};

/** Feedback copy shown in the Performance Summary section of the results page. */
export const PERFORMANCE_FEEDBACK: Record<PerformanceLevel, string> = {
  Excellent: "Outstanding performance. You demonstrate strong aptitude skills.",
  Good: "Good work. A little more practice can further improve your accuracy.",
  Average: "You have a basic understanding. Focus on improving consistency.",
  "Needs Improvement":
    "More practice is recommended before attempting placement assessments.",
};

/** Static, rule-based "next steps" recommendations shown on the results page. */
export const PERFORMANCE_RECOMMENDATIONS: Record<PerformanceLevel, string[]> = {
  "Needs Improvement": [
    "Practice Quantitative Aptitude",
    "Improve Time Management",
    "Take Another Assessment",
  ],
  Average: [
    "Practice Quantitative Aptitude",
    "Improve Accuracy",
    "Take Another Assessment",
  ],
  Good: [
    "Continue Aptitude Practice",
    "Practice Technical Interviews",
    "Take More Mock Assessments",
  ],
  Excellent: [
    "Attempt Advanced Assessments",
    "Practice Technical Interviews",
    "Continue Mock Interviews",
  ],
};

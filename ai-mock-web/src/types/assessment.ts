/**
 * Assessment Module — Shared TypeScript Types
 * Single source of truth for all assessment-related interfaces.
 */

/** Difficulty level for a question */
export type QuestionDifficulty = "Easy" | "Medium" | "Hard";

/** Category of an aptitude question */
export type QuestionCategory =
  | "Quantitative Aptitude"
  | "Logical Reasoning"
  | "Data Interpretation";

/** A single assessment question */
export interface Question {
  id: number;
  question: string;
  options: [string, string, string, string];
  /** Index (0-3) of the correct option */
  correctAnswer: number;
  category: QuestionCategory;
  difficulty: QuestionDifficulty;
}

/** Map of sessionQuestionIndex → selected option position (original, pre-shuffle position into the question's options array) */
export type AnswerMap = Record<number, number>;

/** Where an assessment attempt's questions come from. */
export type AssessmentSource = "mock" | "api";

/** A single answer option in the normalized (source-agnostic) shape used by
 * the session context, regardless of whether it came from the mock array
 * or the live API. */
export interface AttemptOption {
  /** Stable identifier: the option's UUID from the API, or its own index
   * (as a string) for mock-sourced questions. */
  id: string;
  text: string;
}

/** A question in the normalized shape the session context operates on.
 * `correctAnswer` is present only for mock-sourced questions — the API
 * never returns the answer key, so it's optional here by design. See
 * AssessmentSessionContext's finalizeAndSubmit() for how scoring degrades
 * gracefully (to "unavailable") when it's absent. */
export interface AttemptQuestion {
  id: string;
  question: string;
  category: string;
  difficulty: QuestionDifficulty;
  options: AttemptOption[];
  correctAnswer?: number;
}

/** An AttemptQuestion known (at the type level) to carry its answer key —
 * only mock-sourced questions satisfy this. calculateScore requires it so
 * it can never silently score against a missing answer key. */
export type ScorableQuestion = AttemptQuestion & { correctAnswer: number };

/** A question plus a shuffled display order for its options, for a single attempt. */
export interface ShuffledAttemptQuestion {
  question: AttemptQuestion;
  /** Original option positions (0-3) in the order they should be displayed. */
  optionOrder: number[];
}

/** Result of a completed assessment, stored in sessionStorage */
export interface AssessmentResult {
  totalQuestions: number;
  correctAnswers: number;
  /** Answered but incorrect (does NOT include unanswered questions). */
  wrongAnswers: number;
  answeredCount: number;
  unansweredCount: number;
  /** correctAnswers / answeredCount * 100, rounded; 0 when nothing was answered. */
  accuracyRate: number;
  timeTakenSeconds: number;
  scorePercentage: number;
  answers: AnswerMap;
  timestamp: string; // ISO 8601
  /** True when the questions came from a source that doesn't expose the
   * answer key (API mode) — every numeric scoring field above is a
   * meaningless zero in that case, and the UI must show an explicit
   * "unavailable" state instead of the normal results. */
  scoringUnavailable: boolean;
}

/** Live state while taking the assessment */
export interface AssessmentState {
  currentQuestionIndex: number;
  answers: AnswerMap;
  timeRemaining: number; // seconds
  isSubmitted: boolean;
}

/** Performance level derived from scorePercentage */
export type PerformanceLevel =
  | "Excellent"
  | "Good"
  | "Average"
  | "Needs Improvement";

// =====================================================================
// Assessment History & Analytics (V2.3)
// Only populated in API mode — mock-mode attempts are never persisted
// server-side, so history is legitimately always empty under mock mode.
// =====================================================================

/** One row in the attempt history list. */
export interface AttemptHistoryItem {
  attemptId: string;
  completedAt: string | null;
  score: number;
  accuracyRate: number;
  correctAnswers: number;
  wrongAnswers: number;
  unansweredAnswers: number;
  timeTakenSeconds: number;
  performanceLevel: PerformanceLevel;
}

/** One question's recorded answer in an attempt's detail breakdown. Only
 * the user's own selection and its correctness — never the answer key. */
export interface AnsweredQuestionDetail {
  questionText: string;
  category: string;
  selectedAnswer: string | null;
  isCorrect: boolean;
}

/** Full breakdown for a single completed attempt. */
export interface AttemptDetails {
  attemptId: string;
  completedAt: string | null;
  score: number;
  accuracyRate: number;
  timeTakenSeconds: number;
  correctAnswers: number;
  wrongAnswers: number;
  unansweredAnswers: number;
  performanceLevel: PerformanceLevel;
  questions: AnsweredQuestionDetail[];
}

/** Aggregate stats across every completed attempt. */
export interface AssessmentStatisticsSummary {
  totalAttempts: number;
  bestScore: number;
  averageScore: number;
  averageAccuracy: number;
  averageTimeTaken: number;
  latestScore: number | null;
  highestAccuracy: number;
  lowestAccuracy: number;
}

/** Accuracy aggregated by category, across every completed attempt. */
export interface CategoryPerformance {
  category: string;
  attemptsSeen: number;
  correctAnswers: number;
  totalQuestions: number;
  accuracyRate: number;
}

/** One point on the score-over-time trend chart. */
export interface ScoreTrendPoint {
  attemptNumber: number;
  score: number;
}

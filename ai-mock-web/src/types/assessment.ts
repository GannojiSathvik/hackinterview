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

/** Map of sessionQuestionIndex → selected option index (original, pre-shuffle index) */
export type AnswerMap = Record<number, number>;

/** A question plus a shuffled display order for its options, for a single attempt. */
export interface ShuffledAttemptQuestion {
  question: Question;
  /** Original option indices (0-3) in the order they should be displayed. */
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

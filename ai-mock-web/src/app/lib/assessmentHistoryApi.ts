/**
 * Client for the read-only Online Assessment history & analytics API
 * (V2.3). Only meaningful in API mode — mock-mode attempts are never
 * persisted server-side, so these will always return empty/zeroed data
 * under mock mode. That's expected, not an error.
 */
import { API_BASE } from "./api";
import type {
  AnsweredQuestionDetail,
  AssessmentStatisticsSummary,
  AttemptDetails,
  AttemptHistoryItem,
  CategoryPerformance,
  PerformanceLevel,
  ScoreTrendPoint,
} from "@/types/assessment";

interface ApiHistoryItem {
  attempt_id: string;
  completed_at: string | null;
  score: number;
  accuracy_rate: number;
  correct_answers: number;
  wrong_answers: number;
  unanswered_answers: number;
  time_taken_seconds: number;
  performance_level: string;
}

interface ApiAnsweredQuestion {
  question_text: string;
  category: string;
  selected_answer: string | null;
  is_correct: boolean;
}

interface ApiAttemptDetails {
  attempt_id: string;
  completed_at: string | null;
  score: number;
  accuracy_rate: number;
  time_taken_seconds: number;
  correct_answers: number;
  wrong_answers: number;
  unanswered_answers: number;
  performance_level: string;
  questions: ApiAnsweredQuestion[];
}

interface ApiStatistics {
  total_attempts: number;
  best_score: number;
  average_score: number;
  average_accuracy: number;
  average_time_taken: number;
  latest_score: number | null;
  highest_accuracy: number;
  lowest_accuracy: number;
}

interface ApiCategoryPerformance {
  category: string;
  attempts_seen: number;
  correct_answers: number;
  total_questions: number;
  accuracy_rate: number;
}

interface ApiScoreTrendPoint {
  attempt_number: number;
  score: number;
}

export class AssessmentHistoryApiError extends Error {}

async function getJson<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`);
  } catch {
    throw new AssessmentHistoryApiError(
      "Couldn't reach the assessment service. Check your connection and try again."
    );
  }

  if (!response.ok) {
    let detail: string | undefined;
    try {
      const body = await response.json();
      detail = typeof body?.detail === "string" ? body.detail : undefined;
    } catch {
      // response body wasn't JSON — fall through to the generic message
    }
    throw new AssessmentHistoryApiError(
      detail || `Assessment service returned an error (HTTP ${response.status}).`
    );
  }

  try {
    return await response.json();
  } catch {
    throw new AssessmentHistoryApiError("Assessment service returned an invalid response.");
  }
}

function toHistoryItem(a: ApiHistoryItem): AttemptHistoryItem {
  return {
    attemptId: a.attempt_id,
    completedAt: a.completed_at,
    score: a.score,
    accuracyRate: a.accuracy_rate,
    correctAnswers: a.correct_answers,
    wrongAnswers: a.wrong_answers,
    unansweredAnswers: a.unanswered_answers,
    timeTakenSeconds: a.time_taken_seconds,
    performanceLevel: a.performance_level as PerformanceLevel,
  };
}

export async function getHistory(): Promise<AttemptHistoryItem[]> {
  const data = await getJson<ApiHistoryItem[]>("/api/assessment/history");
  return data.map(toHistoryItem);
}

export async function getAttemptDetails(attemptId: string): Promise<AttemptDetails> {
  const data = await getJson<ApiAttemptDetails>(
    `/api/assessment/history/${encodeURIComponent(attemptId)}`
  );
  const questions: AnsweredQuestionDetail[] = data.questions.map((q) => ({
    questionText: q.question_text,
    category: q.category,
    selectedAnswer: q.selected_answer,
    isCorrect: q.is_correct,
  }));
  return {
    attemptId: data.attempt_id,
    completedAt: data.completed_at,
    score: data.score,
    accuracyRate: data.accuracy_rate,
    timeTakenSeconds: data.time_taken_seconds,
    correctAnswers: data.correct_answers,
    wrongAnswers: data.wrong_answers,
    unansweredAnswers: data.unanswered_answers,
    performanceLevel: data.performance_level as PerformanceLevel,
    questions,
  };
}

export async function getStatistics(): Promise<AssessmentStatisticsSummary> {
  const data = await getJson<ApiStatistics>("/api/assessment/statistics");
  return {
    totalAttempts: data.total_attempts,
    bestScore: data.best_score,
    averageScore: data.average_score,
    averageAccuracy: data.average_accuracy,
    averageTimeTaken: data.average_time_taken,
    latestScore: data.latest_score,
    highestAccuracy: data.highest_accuracy,
    lowestAccuracy: data.lowest_accuracy,
  };
}

export async function getCategoryPerformance(): Promise<CategoryPerformance[]> {
  const data = await getJson<ApiCategoryPerformance[]>("/api/assessment/category-performance");
  return data.map((c) => ({
    category: c.category,
    attemptsSeen: c.attempts_seen,
    correctAnswers: c.correct_answers,
    totalQuestions: c.total_questions,
    accuracyRate: c.accuracy_rate,
  }));
}

export async function getTrends(): Promise<ScoreTrendPoint[]> {
  const data = await getJson<ApiScoreTrendPoint[]>("/api/assessment/trends");
  return data.map((t) => ({ attemptNumber: t.attempt_number, score: t.score }));
}

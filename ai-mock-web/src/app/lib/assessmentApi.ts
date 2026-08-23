/**
 * Client for the live Online Assessment question-bank API (V2.1 start,
 * V2.2 secure server-side submission/scoring).
 * Only used when ASSESSMENT_SOURCE === "api" — mock mode never imports this
 * at runtime beyond the types it returns.
 */
import { API_BASE } from "./api";
import type { AttemptQuestion, QuestionDifficulty } from "@/types/assessment";

interface ApiQuestionOption {
  id: string;
  option_text: string;
  option_index: number;
}

interface ApiQuestion {
  id: string;
  question_text: string;
  difficulty: string;
  category: { id: string; name: string; slug: string; description: string | null };
  options: ApiQuestionOption[];
}

interface AttemptStartApiResponse {
  attempt_id: string;
  questions: ApiQuestion[];
}

interface AttemptSubmitApiResponse {
  attempt_id: string;
  score_percentage: number;
  correct_answers: number;
  wrong_answers: number;
  unanswered_answers: number;
  accuracy_percentage: number;
  time_taken_seconds: number;
  performance_level: string;
}

export interface StartedAttempt {
  attemptId: string;
  questions: AttemptQuestion[];
}

export interface ServerScoreResult {
  attemptId: string;
  scorePercentage: number;
  correctAnswers: number;
  wrongAnswers: number;
  unansweredAnswers: number;
  accuracyPercentage: number;
  timeTakenSeconds: number;
}

export class AssessmentApiError extends Error {}

function toAttemptQuestion(q: ApiQuestion): AttemptQuestion {
  return {
    id: q.id,
    question: q.question_text,
    category: q.category.name,
    difficulty: q.difficulty as QuestionDifficulty,
    options: [...q.options]
      .sort((a, b) => a.option_index - b.option_index)
      .map((o) => ({ id: o.id, text: o.option_text })),
    // Deliberately no correctAnswer — the API never sends the answer key.
  };
}

/** Shared fetch + error-extraction for both assessment endpoints. */
async function postJson<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AssessmentApiError(
      "Couldn't reach the assessment service. Check your connection and try again."
    );
  }

  if (!response.ok) {
    let detail: string | undefined;
    try {
      const errorBody = await response.json();
      detail = typeof errorBody?.detail === "string" ? errorBody.detail : undefined;
    } catch {
      // response body wasn't JSON — fall through to the generic message
    }
    throw new AssessmentApiError(
      detail || `Assessment service returned an error (HTTP ${response.status}).`
    );
  }

  try {
    return await response.json();
  } catch {
    throw new AssessmentApiError("Assessment service returned an invalid response.");
  }
}

/**
 * Request a new, randomly-selected set of questions from the live bank.
 * The backend persists an in-progress attempt and returns its id, which
 * must be passed to submitAssessmentAttempt() later.
 */
export async function startAssessmentAttempt(params: {
  category?: string;
  difficulty?: string;
  questionCount: number;
}): Promise<StartedAttempt> {
  const data = await postJson<AttemptStartApiResponse>("/api/assessment/attempts/start", {
    category: params.category ?? null,
    difficulty: params.difficulty ?? null,
    question_count: params.questionCount,
  });

  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    throw new AssessmentApiError("Assessment service returned no questions.");
  }
  if (!data.attempt_id) {
    throw new AssessmentApiError("Assessment service returned no attempt id.");
  }

  return {
    attemptId: data.attempt_id,
    questions: data.questions.map(toAttemptQuestion),
  };
}

/**
 * Submit the user's answers for server-side scoring. The client sends only
 * which option (if any) was picked per question — never a score, correct
 * count, or accuracy. The backend is the sole authority on correctness.
 */
export async function submitAssessmentAttempt(
  attemptId: string,
  answers: { questionId: string; selectedOptionId: string | null }[],
  timeTakenSeconds: number
): Promise<ServerScoreResult> {
  const data = await postJson<AttemptSubmitApiResponse>("/api/assessment/attempts/submit", {
    attempt_id: attemptId,
    answers: answers.map((a) => ({
      question_id: a.questionId,
      selected_option_id: a.selectedOptionId,
    })),
    time_taken_seconds: timeTakenSeconds,
  });

  return {
    attemptId: data.attempt_id,
    scorePercentage: data.score_percentage,
    correctAnswers: data.correct_answers,
    wrongAnswers: data.wrong_answers,
    unansweredAnswers: data.unanswered_answers,
    accuracyPercentage: data.accuracy_percentage,
    timeTakenSeconds: data.time_taken_seconds,
  };
}

/**
 * Client for the admin-only Online Assessment question-bank management API
 * (V2.4). Calls the Next.js server-side proxy under /api/admin/assessment/**
 * (same-origin, relative paths) — NOT the FastAPI API_BASE directly, unlike
 * assessmentApi.ts. Only the proxy can resolve the caller's real admin/user
 * role from a verified NextAuth session and attach the shared secret
 * FastAPI's require_admin() checks for; a browser calling FastAPI directly
 * has no way to pass that check.
 */

export interface AdminQuestionOptionOut {
  id: string;
  optionText: string;
  optionIndex: number;
  isCorrect: boolean;
}

export interface AdminQuestion {
  id: string;
  questionText: string;
  difficulty: string;
  isActive: boolean;
  category: { id: string; name: string; slug: string; description: string | null };
  options: AdminQuestionOptionOut[];
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface QuestionFilters {
  search?: string;
  categoryId?: string;
  difficulty?: string;
  active?: boolean;
}

export interface QuestionOptionInput {
  optionText: string;
  isCorrect: boolean;
}

export interface QuestionFormInput {
  questionText: string;
  categoryId: string;
  difficulty: string;
  options: QuestionOptionInput[];
}

interface ApiQuestionOption {
  id: string;
  option_text: string;
  option_index: number;
  is_correct: boolean;
}

interface ApiQuestion {
  id: string;
  question_text: string;
  difficulty: string;
  is_active: boolean;
  category: { id: string; name: string; slug: string; description: string | null };
  options: ApiQuestionOption[];
}

interface ApiQuestionListResponse {
  questions: ApiQuestion[];
  total: number;
}

interface ApiCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

interface ApiValidationErrorItem {
  msg?: string;
}

export class AdminAssessmentApiError extends Error {}

const BASE = "/api/admin/assessment";

function toAdminQuestion(q: ApiQuestion): AdminQuestion {
  return {
    id: q.id,
    questionText: q.question_text,
    difficulty: q.difficulty,
    isActive: q.is_active,
    category: q.category,
    options: [...q.options]
      .sort((a, b) => a.option_index - b.option_index)
      .map((o) => ({
        id: o.id,
        optionText: o.option_text,
        optionIndex: o.option_index,
        isCorrect: o.is_correct,
      })),
  };
}

function toWireOptions(options: QuestionOptionInput[]) {
  return options.map((o) => ({ option_text: o.optionText, is_correct: o.isCorrect }));
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new AdminAssessmentApiError(
      "Couldn't reach the admin service. Check your connection and try again."
    );
  }

  if (!response.ok) {
    let detail: string | undefined;
    try {
      const body = await response.json();
      if (typeof body?.detail === "string") {
        detail = body.detail;
      } else if (Array.isArray(body?.detail)) {
        detail = (body.detail as ApiValidationErrorItem[])
          .map((d) => d.msg)
          .filter(Boolean)
          .join("; ");
      }
    } catch {
      // response body wasn't JSON — fall through to the generic message
    }
    throw new AdminAssessmentApiError(
      detail || `Admin service returned an error (HTTP ${response.status}).`
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  try {
    return await response.json();
  } catch {
    throw new AdminAssessmentApiError("Admin service returned an invalid response.");
  }
}

export async function getQuestions(
  filters: QuestionFilters = {}
): Promise<{ questions: AdminQuestion[]; total: number }> {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.categoryId) params.set("category", filters.categoryId);
  if (filters.difficulty) params.set("difficulty", filters.difficulty);
  if (filters.active !== undefined) params.set("active", String(filters.active));
  const qs = params.toString();

  const data = await request<ApiQuestionListResponse>(`${BASE}/questions${qs ? `?${qs}` : ""}`);
  return { questions: data.questions.map(toAdminQuestion), total: data.total };
}

export async function getQuestion(id: string): Promise<AdminQuestion> {
  const data = await request<ApiQuestion>(`${BASE}/questions/${id}`);
  return toAdminQuestion(data);
}

export async function createQuestion(input: QuestionFormInput): Promise<AdminQuestion> {
  const data = await request<ApiQuestion>(`${BASE}/questions`, {
    method: "POST",
    body: JSON.stringify({
      question_text: input.questionText,
      category_id: input.categoryId,
      difficulty: input.difficulty,
      options: toWireOptions(input.options),
    }),
  });
  return toAdminQuestion(data);
}

export async function updateQuestion(id: string, input: QuestionFormInput): Promise<AdminQuestion> {
  const data = await request<ApiQuestion>(`${BASE}/questions/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      question_text: input.questionText,
      category_id: input.categoryId,
      difficulty: input.difficulty,
      options: toWireOptions(input.options),
    }),
  });
  return toAdminQuestion(data);
}

export async function deleteQuestion(id: string): Promise<void> {
  await request<void>(`${BASE}/questions/${id}`, { method: "DELETE" });
}

export async function toggleQuestion(id: string): Promise<AdminQuestion> {
  const data = await request<ApiQuestion>(`${BASE}/questions/${id}/toggle-active`, {
    method: "PATCH",
  });
  return toAdminQuestion(data);
}

export async function getCategories(): Promise<AdminCategory[]> {
  return request<ApiCategory[]>(`${BASE}/categories`);
}

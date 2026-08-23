"""Online Assessment question-bank Pydantic models (read-only, Phase 1)."""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class CategoryOut(BaseModel):
    """A question-bank category."""
    id: str
    name: str
    slug: str
    description: Optional[str] = None


class QuestionOptionOut(BaseModel):
    """An answer option. Deliberately excludes `is_correct` — the backend/DB
    remains the source of truth for correctness; nothing upstream should
    receive it from this read-only endpoint."""
    id: str
    option_text: str
    option_index: int


class QuestionOut(BaseModel):
    """A question-bank entry with its category and options."""
    id: str
    question_text: str
    difficulty: str
    category: CategoryOut
    options: List[QuestionOptionOut]


class AttemptStartRequest(BaseModel):
    """Request to start a new (unpersisted) assessment attempt.

    `category` omitted/None means "pull from every category" — this mirrors
    the V1.1 mock assessment, which is a single mixed-category attempt, not
    a per-category one.
    """
    category: Optional[str] = None
    difficulty: Optional[str] = None
    question_count: int = 10


class AttemptStartResponse(BaseModel):
    """The randomly-selected question set for a new attempt, plus the
    attempt_id needed to submit it later."""
    attempt_id: str
    questions: List[QuestionOut]


class SubmitAnswerIn(BaseModel):
    """One question's submitted answer. `selected_option_id` is None for a
    question the user left unanswered."""
    question_id: str
    selected_option_id: Optional[str] = None


class AttemptSubmitRequest(BaseModel):
    attempt_id: str
    answers: List[SubmitAnswerIn]
    time_taken_seconds: int


class AttemptSubmitResponse(BaseModel):
    """The server-computed result. Deliberately excludes is_correct per
    question, correct option references, and explanations — the client
    only ever learns aggregate statistics."""
    attempt_id: str
    score_percentage: float
    correct_answers: int
    wrong_answers: int
    unanswered_answers: int
    accuracy_percentage: float
    time_taken_seconds: int
    performance_level: str


# =====================================================================
# Assessment History & Analytics (V2.3) — all read-only.
# =====================================================================

class AttemptHistoryItem(BaseModel):
    """One row in the attempt history list."""
    attempt_id: str
    completed_at: Optional[datetime]
    score: float
    accuracy_rate: float
    correct_answers: int
    wrong_answers: int
    unanswered_answers: int
    time_taken_seconds: int
    performance_level: str


class AnsweredQuestionOut(BaseModel):
    """One question's recorded answer, for the attempt-details breakdown.
    Only the user's own selection and its correctness — never the answer
    key or any other option."""
    question_text: str
    category: str
    selected_answer: Optional[str]
    is_correct: bool


class AttemptDetailsOut(BaseModel):
    attempt_id: str
    completed_at: Optional[datetime]
    score: float
    accuracy_rate: float
    time_taken_seconds: int
    correct_answers: int
    wrong_answers: int
    unanswered_answers: int
    performance_level: str
    questions: List[AnsweredQuestionOut]


class AssessmentStatisticsOut(BaseModel):
    total_attempts: int
    best_score: float
    average_score: float
    average_accuracy: float
    average_time_taken: float
    latest_score: Optional[float]
    highest_accuracy: float
    lowest_accuracy: float


class CategoryPerformanceItem(BaseModel):
    category: str
    attempts_seen: int
    correct_answers: int
    total_questions: int
    accuracy_rate: float


class ScoreTrendPoint(BaseModel):
    attempt_number: int
    score: float

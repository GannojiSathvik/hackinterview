"""Online Assessment question-bank routes.

Phase 1: read-only verification (GET /health, GET /api/assessment/questions).
V2.1: POST /api/assessment/attempts/start — stateless random selection.
V2.2: /attempts/start now persists an attempt, and /attempts/submit scores
it entirely server-side. The client never receives is_correct, a correct
option reference, or an explanation at any point — and it never sends a
score, correct count, or accuracy for the server to trust.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models import AssessmentQuestion
from schemas.assessment import (
    AssessmentStatisticsOut,
    AttemptDetailsOut,
    AttemptHistoryItem,
    AttemptStartRequest,
    AttemptStartResponse,
    AttemptSubmitRequest,
    AttemptSubmitResponse,
    CategoryPerformanceItem,
    QuestionOut,
    ScoreTrendPoint,
)
from services.assessment_service import (
    AttemptAlreadySubmittedError,
    AttemptNotFoundError,
    CategoryNotFoundError,
    InsufficientQuestionsError,
    InvalidDifficultyError,
    InvalidOptionOwnershipError,
    InvalidQuestionOwnershipError,
    create_attempt,
    serialize_question,
    submit_attempt,
)
from services.assessment_history_service import (
    get_assessment_statistics,
    get_attempt_details,
    get_attempt_history,
    get_category_performance,
    get_score_trend,
)

router = APIRouter(tags=["assessment"])

# Mirrors the frontend's getPerformanceLevel() thresholds exactly
# (src/constants/assessment.ts). Kept as an independent implementation on
# purpose — the backend can't depend on frontend code, and the whole point
# of server-side scoring is that the backend never trusts the client.
_PERFORMANCE_THRESHOLDS = {"excellent": 90, "good": 75, "average": 50}


def _performance_level(score_percentage: float) -> str:
    if score_percentage >= _PERFORMANCE_THRESHOLDS["excellent"]:
        return "Excellent"
    if score_percentage >= _PERFORMANCE_THRESHOLDS["good"]:
        return "Good"
    if score_percentage >= _PERFORMANCE_THRESHOLDS["average"]:
        return "Average"
    return "Needs Improvement"


@router.get("/health")
async def health(db: AsyncSession = Depends(get_db)):
    """Liveness + DB-connectivity check. Never reports "ok" while the
    database is actually unreachable — degrades honestly instead."""
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        return JSONResponse(
            status_code=503,
            content={"status": "degraded", "database": "unavailable"},
        )
    return {"status": "ok", "database": "connected"}


@router.get("/api/assessment/questions", response_model=list[QuestionOut])
async def list_assessment_questions(
    category: Optional[str] = Query(None, description="Filter by category slug"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty: Easy | Medium | Hard"),
    db: AsyncSession = Depends(get_db),
):
    """Read-only listing of the question bank. No pagination, randomization,
    scoring, or answer-submission — purely a verification endpoint."""
    stmt = select(AssessmentQuestion).options(
        selectinload(AssessmentQuestion.category),
        selectinload(AssessmentQuestion.options),
    )

    if category:
        stmt = stmt.where(AssessmentQuestion.category.has(slug=category))
    if difficulty:
        stmt = stmt.where(AssessmentQuestion.difficulty == difficulty)

    result = await db.execute(stmt)
    questions = result.scalars().unique().all()

    return [serialize_question(q) for q in questions]


@router.post("/api/assessment/attempts/start", response_model=AttemptStartResponse)
async def start_assessment_attempt(
    payload: AttemptStartRequest,
    db: AsyncSession = Depends(get_db),
):
    """Randomly select `question_count` questions and persist an
    in-progress attempt recording exactly which questions were chosen.
    The answer key is never included in the response."""
    try:
        attempt, questions = await create_attempt(
            db,
            category_slug=payload.category,
            difficulty=payload.difficulty,
            question_count=payload.question_count,
        )
    except CategoryNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except (InvalidDifficultyError, InsufficientQuestionsError) as e:
        raise HTTPException(status_code=422, detail=str(e))

    return AttemptStartResponse(
        attempt_id=attempt.id,
        questions=[serialize_question(q) for q in questions],
    )


@router.post("/api/assessment/attempts/submit", response_model=AttemptSubmitResponse)
async def submit_assessment_attempt(
    payload: AttemptSubmitRequest,
    db: AsyncSession = Depends(get_db),
):
    """Score an attempt entirely server-side. The client only ever sends
    which option (if any) it picked per question — never a score, correct
    count, or accuracy for the server to trust."""
    try:
        attempt = await submit_attempt(
            db,
            attempt_id=payload.attempt_id,
            answers=payload.answers,
            time_taken_seconds=payload.time_taken_seconds,
        )
    except AttemptNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except AttemptAlreadySubmittedError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except (InvalidQuestionOwnershipError, InvalidOptionOwnershipError) as e:
        raise HTTPException(status_code=400, detail=str(e))

    return AttemptSubmitResponse(
        attempt_id=attempt.id,
        score_percentage=attempt.score_percentage,
        correct_answers=attempt.correct_answers,
        wrong_answers=attempt.wrong_answers,
        unanswered_answers=attempt.unanswered_answers,
        accuracy_percentage=attempt.accuracy_percentage,
        time_taken_seconds=attempt.time_taken_seconds,
        performance_level=_performance_level(attempt.score_percentage),
    )


# =====================================================================
# Assessment History & Analytics (V2.3) — read-only. None of these
# endpoints create, update, or delete anything; they only ever read back
# what /attempts/submit already wrote.
# =====================================================================

@router.get("/api/assessment/history", response_model=list[AttemptHistoryItem])
async def list_assessment_history(db: AsyncSession = Depends(get_db)):
    """Every completed attempt, newest first."""
    attempts = await get_attempt_history(db)
    return [
        AttemptHistoryItem(
            attempt_id=a.id,
            completed_at=a.submitted_at,
            score=round(a.score_percentage, 2),
            accuracy_rate=round(a.accuracy_percentage, 2),
            correct_answers=a.correct_answers,
            wrong_answers=a.wrong_answers,
            unanswered_answers=a.unanswered_answers,
            time_taken_seconds=a.time_taken_seconds,
            performance_level=_performance_level(a.score_percentage),
        )
        for a in attempts
    ]


@router.get("/api/assessment/history/{attempt_id}", response_model=AttemptDetailsOut)
async def get_assessment_history_detail(attempt_id: str, db: AsyncSession = Depends(get_db)):
    """Full breakdown for one completed attempt — the user's own selected
    answer and its correctness per question, never the answer key."""
    details = await get_attempt_details(db, attempt_id)
    if details is None:
        raise HTTPException(status_code=404, detail=f"Attempt not found: {attempt_id!r}")
    return AttemptDetailsOut(**details)


@router.get("/api/assessment/statistics", response_model=AssessmentStatisticsOut)
async def get_assessment_statistics_summary(db: AsyncSession = Depends(get_db)):
    """Aggregate stats across every completed attempt."""
    return AssessmentStatisticsOut(**await get_assessment_statistics(db))


@router.get("/api/assessment/category-performance", response_model=list[CategoryPerformanceItem])
async def get_assessment_category_performance(db: AsyncSession = Depends(get_db)):
    """Accuracy aggregated by category, across every completed attempt."""
    return [CategoryPerformanceItem(**row) for row in await get_category_performance(db)]


@router.get("/api/assessment/trends", response_model=list[ScoreTrendPoint])
async def get_assessment_trends(db: AsyncSession = Depends(get_db)):
    """Score per attempt, oldest first, for chart rendering."""
    return [ScoreTrendPoint(**row) for row in await get_score_trend(db)]

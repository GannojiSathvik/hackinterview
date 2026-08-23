"""Read-only Online Assessment history & analytics (V2.3).

Deliberately kept separate from services/assessment_service.py — nothing
here touches question selection, submission validation, or scoring. Every
function here only ever SELECTs from data that /attempts/submit already
wrote; nothing is created, updated, or deleted.

Only "submitted" attempts (status == "submitted", i.e. submitted_at is not
null) count as history — an abandoned in_progress attempt never appears.
"""
from typing import Optional

from sqlalchemy import Integer, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models import (
    AssessmentAttempt,
    AssessmentAttemptAnswer,
    AssessmentCategory,
    AssessmentQuestion,
    AssessmentQuestionOption,
)

_PERFORMANCE_THRESHOLDS = {"excellent": 90, "good": 75, "average": 50}


def _performance_level(score_percentage: float) -> str:
    """Mirrors routes/assessment.py's _performance_level() and the
    frontend's getPerformanceLevel() thresholds exactly. Duplicated on
    purpose: importing a routes module from a service would invert this
    codebase's dependency direction, and routes/assessment.py must not be
    touched by this phase."""
    if score_percentage >= _PERFORMANCE_THRESHOLDS["excellent"]:
        return "Excellent"
    if score_percentage >= _PERFORMANCE_THRESHOLDS["good"]:
        return "Good"
    if score_percentage >= _PERFORMANCE_THRESHOLDS["average"]:
        return "Average"
    return "Needs Improvement"


async def get_attempt_history(db: AsyncSession) -> list[AssessmentAttempt]:
    """All completed attempts, newest first."""
    result = await db.execute(
        select(AssessmentAttempt)
        .where(AssessmentAttempt.status == "submitted")
        .order_by(AssessmentAttempt.submitted_at.desc())
    )
    return list(result.scalars().all())


async def get_attempt_details(db: AsyncSession, attempt_id: str) -> Optional[dict]:
    """Full breakdown for one completed attempt, or None if it doesn't
    exist or was never submitted (caller maps None -> 404).

    Only the user's own selected option (text + correctness) is ever
    included — no other option's text or is_correct is loaded or exposed."""
    attempt = await db.get(AssessmentAttempt, attempt_id)
    if attempt is None or attempt.status != "submitted":
        return None

    answers_result = await db.execute(
        select(AssessmentAttemptAnswer).where(AssessmentAttemptAnswer.attempt_id == attempt_id)
    )
    answers = list(answers_result.scalars().all())

    # Resolve each answer's *own* selected option text in one batched query
    # (never the other options for that question).
    selected_option_ids = [a.selected_option_id for a in answers if a.selected_option_id]
    option_text_by_id: dict[str, str] = {}
    if selected_option_ids:
        options_result = await db.execute(
            select(AssessmentQuestionOption.id, AssessmentQuestionOption.option_text).where(
                AssessmentQuestionOption.id.in_(selected_option_ids)
            )
        )
        option_text_by_id = {row.id: row.option_text for row in options_result.all()}

    # Question text + category name, joined in one query (AssessmentAttemptAnswer
    # has no ORM relationship to AssessmentQuestion defined in models.py, so this
    # is a plain explicit query rather than a relationship load).
    question_ids = [a.question_id for a in answers]
    question_info: dict[str, dict] = {}
    if question_ids:
        questions_result = await db.execute(
            select(
                AssessmentQuestion.id,
                AssessmentQuestion.question_text,
                AssessmentCategory.name,
            )
            .join(AssessmentCategory, AssessmentCategory.id == AssessmentQuestion.category_id)
            .where(AssessmentQuestion.id.in_(question_ids))
        )
        question_info = {
            row.id: {"question_text": row.question_text, "category": row.name}
            for row in questions_result.all()
        }

    questions_out = [
        {
            "question_text": question_info.get(a.question_id, {}).get(
                "question_text", "Unknown question"
            ),
            "category": question_info.get(a.question_id, {}).get("category", "Unknown"),
            "selected_answer": option_text_by_id.get(a.selected_option_id)
            if a.selected_option_id
            else None,
            "is_correct": a.is_correct,
        }
        for a in answers
    ]

    return {
        "attempt_id": attempt.id,
        "completed_at": attempt.submitted_at,
        "score": round(attempt.score_percentage, 2),
        "accuracy_rate": round(attempt.accuracy_percentage, 2),
        "time_taken_seconds": attempt.time_taken_seconds,
        "correct_answers": attempt.correct_answers,
        "wrong_answers": attempt.wrong_answers,
        "unanswered_answers": attempt.unanswered_answers,
        "performance_level": _performance_level(attempt.score_percentage),
        "questions": questions_out,
    }


async def get_assessment_statistics(db: AsyncSession) -> dict:
    """Aggregate stats across every completed attempt. Safe (zeroed) when
    there are zero attempts — never divides by zero."""
    agg_result = await db.execute(
        select(
            func.count(AssessmentAttempt.id),
            func.max(AssessmentAttempt.score_percentage),
            func.avg(AssessmentAttempt.score_percentage),
            func.avg(AssessmentAttempt.accuracy_percentage),
            func.avg(AssessmentAttempt.time_taken_seconds),
            func.max(AssessmentAttempt.accuracy_percentage),
            func.min(AssessmentAttempt.accuracy_percentage),
        ).where(AssessmentAttempt.status == "submitted")
    )
    (
        total_attempts,
        best_score,
        average_score,
        average_accuracy,
        average_time_taken,
        highest_accuracy,
        lowest_accuracy,
    ) = agg_result.one()

    latest_score = None
    if total_attempts:
        latest_result = await db.execute(
            select(AssessmentAttempt.score_percentage)
            .where(AssessmentAttempt.status == "submitted")
            .order_by(AssessmentAttempt.submitted_at.desc())
            .limit(1)
        )
        latest_score = latest_result.scalar_one_or_none()

    return {
        "total_attempts": total_attempts or 0,
        "best_score": best_score or 0.0,
        "average_score": round(average_score, 2) if average_score is not None else 0.0,
        "average_accuracy": round(average_accuracy, 2) if average_accuracy is not None else 0.0,
        "average_time_taken": round(average_time_taken, 2) if average_time_taken is not None else 0.0,
        "latest_score": latest_score,
        "highest_accuracy": highest_accuracy or 0.0,
        "lowest_accuracy": lowest_accuracy or 0.0,
    }


async def get_category_performance(db: AsyncSession) -> list[dict]:
    """Aggregate accuracy per category, across every completed attempt."""
    result = await db.execute(
        select(
            AssessmentCategory.name,
            func.count(AssessmentAttemptAnswer.id),
            func.sum(cast(AssessmentAttemptAnswer.is_correct, Integer)),
            func.count(func.distinct(AssessmentAttemptAnswer.attempt_id)),
        )
        .join(AssessmentQuestion, AssessmentQuestion.id == AssessmentAttemptAnswer.question_id)
        .join(AssessmentCategory, AssessmentCategory.id == AssessmentQuestion.category_id)
        .join(AssessmentAttempt, AssessmentAttempt.id == AssessmentAttemptAnswer.attempt_id)
        .where(AssessmentAttempt.status == "submitted")
        .group_by(AssessmentCategory.name)
    )

    performance = []
    for category_name, total_questions, correct_answers, attempts_seen in result.all():
        correct_answers = correct_answers or 0
        accuracy_rate = (correct_answers / total_questions * 100) if total_questions else 0.0
        performance.append(
            {
                "category": category_name,
                "attempts_seen": attempts_seen,
                "correct_answers": correct_answers,
                "total_questions": total_questions,
                "accuracy_rate": round(accuracy_rate, 2),
            }
        )
    return performance


async def get_score_trend(db: AsyncSession) -> list[dict]:
    """Score per attempt, oldest first, for chart rendering."""
    result = await db.execute(
        select(AssessmentAttempt.score_percentage)
        .where(AssessmentAttempt.status == "submitted")
        .order_by(AssessmentAttempt.submitted_at.asc())
    )
    scores = result.scalars().all()
    return [
        {"attempt_number": i + 1, "score": score}
        for i, score in enumerate(scores)
    ]

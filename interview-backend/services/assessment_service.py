"""Business logic for the Online Assessment question bank.

Kept out of routes/assessment.py so the route stays a thin HTTP layer,
matching the rest of the codebase's routes/ + services/ split.
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models import (
    AssessmentAttempt,
    AssessmentAttemptAnswer,
    AssessmentCategory,
    AssessmentQuestion,
    AssessmentQuestionOption,
)
from schemas.assessment import QuestionOut

VALID_DIFFICULTIES = {"Easy", "Medium", "Hard"}


class CategoryNotFoundError(Exception):
    def __init__(self, slug: str):
        self.slug = slug
        super().__init__(f"Unknown category: {slug!r}")


class InvalidDifficultyError(Exception):
    def __init__(self, difficulty: str):
        self.difficulty = difficulty
        super().__init__(
            f"Invalid difficulty {difficulty!r}; expected one of {sorted(VALID_DIFFICULTIES)}"
        )


class InsufficientQuestionsError(Exception):
    def __init__(self, available: int, requested: int):
        self.available = available
        self.requested = requested
        super().__init__(
            f"Only {available} question(s) available for this filter, but {requested} were requested"
        )


class AttemptNotFoundError(Exception):
    def __init__(self, attempt_id: str):
        self.attempt_id = attempt_id
        super().__init__(f"Attempt not found: {attempt_id!r}")


class AttemptAlreadySubmittedError(Exception):
    def __init__(self, attempt_id: str):
        self.attempt_id = attempt_id
        super().__init__(f"Attempt {attempt_id!r} has already been submitted")


class InvalidQuestionOwnershipError(Exception):
    def __init__(self, question_id: str):
        self.question_id = question_id
        super().__init__(f"Question {question_id!r} does not belong to this attempt")


class InvalidOptionOwnershipError(Exception):
    def __init__(self, question_id: str, option_id: str):
        self.question_id = question_id
        self.option_id = option_id
        super().__init__(f"Option {option_id!r} does not belong to question {question_id!r}")


def serialize_question(question: AssessmentQuestion) -> QuestionOut:
    """Shared question -> QuestionOut mapping, used by both the read-only
    listing and the random-selection endpoint so the shape is defined once."""
    return QuestionOut(
        id=question.id,
        question_text=question.question_text,
        difficulty=question.difficulty,
        category={
            "id": question.category.id,
            "name": question.category.name,
            "slug": question.category.slug,
            "description": question.category.description,
        },
        options=sorted(
            (
                {"id": o.id, "option_text": o.option_text, "option_index": o.option_index}
                for o in question.options
            ),
            key=lambda o: o["option_index"],
        ),
    )


async def select_random_questions(
    db: AsyncSession,
    category_slug: Optional[str],
    difficulty: Optional[str],
    count: int,
) -> list[AssessmentQuestion]:
    """Randomly select `count` questions from the bank, optionally filtered
    by category slug and/or difficulty. Raises on invalid filters or an
    insufficient question pool. Nothing is written to the database — this
    is a pure read."""
    if difficulty is not None and difficulty not in VALID_DIFFICULTIES:
        raise InvalidDifficultyError(difficulty)

    # V2.4: admin-disabled questions must never be selected into a new
    # attempt — applied unconditionally, not just when a filter is given.
    stmt = select(AssessmentQuestion).options(
        selectinload(AssessmentQuestion.category),
        selectinload(AssessmentQuestion.options),
    ).where(AssessmentQuestion.is_active.is_(True))

    if category_slug is not None:
        category_result = await db.execute(
            select(AssessmentCategory).where(AssessmentCategory.slug == category_slug)
        )
        if category_result.scalar_one_or_none() is None:
            raise CategoryNotFoundError(category_slug)
        stmt = stmt.where(AssessmentQuestion.category.has(slug=category_slug))

    if difficulty is not None:
        stmt = stmt.where(AssessmentQuestion.difficulty == difficulty)

    stmt = stmt.order_by(func.random()).limit(count)

    result = await db.execute(stmt)
    questions = result.scalars().unique().all()

    if len(questions) < count:
        # Re-count without the LIMIT to report how many actually exist for
        # this filter, so the error message is genuinely useful.
        count_stmt = (
            select(func.count())
            .select_from(AssessmentQuestion)
            .where(AssessmentQuestion.is_active.is_(True))
        )
        if category_slug is not None:
            count_stmt = count_stmt.where(AssessmentQuestion.category.has(slug=category_slug))
        if difficulty is not None:
            count_stmt = count_stmt.where(AssessmentQuestion.difficulty == difficulty)
        available = (await db.execute(count_stmt)).scalar_one()
        raise InsufficientQuestionsError(available=available, requested=count)

    return list(questions)


async def create_attempt(
    db: AsyncSession,
    category_slug: Optional[str],
    difficulty: Optional[str],
    question_count: int,
) -> tuple[AssessmentAttempt, list[AssessmentQuestion]]:
    """Select random questions (reusing select_random_questions unchanged)
    and persist an in-progress attempt recording exactly which questions
    were chosen — this is what makes ownership validation possible at
    submit time."""
    questions = await select_random_questions(db, category_slug, difficulty, question_count)

    attempt = AssessmentAttempt(
        category_slug=category_slug,
        difficulty=difficulty,
        question_count=question_count,
        question_ids=[q.id for q in questions],
        total_questions=len(questions),
        status="in_progress",
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)

    return attempt, questions


async def submit_attempt(
    db: AsyncSession,
    attempt_id: str,
    answers,
    time_taken_seconds: int,
) -> AssessmentAttempt:
    """Score an attempt entirely server-side. `answers` is an iterable of
    objects with `.question_id` / `.selected_option_id` — the client never
    sends a score or correctness, only which option (if any) it picked per
    question. Correctness is looked up from the database, never trusted
    from the request. Nothing is persisted unless the whole submission
    validates cleanly."""
    attempt = await db.get(AssessmentAttempt, attempt_id)
    if attempt is None:
        raise AttemptNotFoundError(attempt_id)
    if attempt.status == "submitted":
        raise AttemptAlreadySubmittedError(attempt_id)

    question_id_set = set(attempt.question_ids)
    submitted_by_question: dict[str, Optional[str]] = {}
    for answer in answers:
        if answer.question_id not in question_id_set:
            raise InvalidQuestionOwnershipError(answer.question_id)
        submitted_by_question[answer.question_id] = answer.selected_option_id

    # Load every option for every question in this attempt in one query, so
    # option-ownership checks and correctness lookups need no N+1 queries.
    options_result = await db.execute(
        select(AssessmentQuestionOption).where(
            AssessmentQuestionOption.question_id.in_(attempt.question_ids)
        )
    )
    options_by_question: dict[str, dict[str, AssessmentQuestionOption]] = {}
    for option in options_result.scalars().all():
        options_by_question.setdefault(option.question_id, {})[option.id] = option

    correct_count = 0
    answered_count = 0
    answer_rows: list[AssessmentAttemptAnswer] = []

    for question_id in attempt.question_ids:
        selected_option_id = submitted_by_question.get(question_id)
        is_correct = False

        if selected_option_id is not None:
            option = options_by_question.get(question_id, {}).get(selected_option_id)
            if option is None:
                raise InvalidOptionOwnershipError(question_id, selected_option_id)
            answered_count += 1
            is_correct = option.is_correct
            if is_correct:
                correct_count += 1

        answer_rows.append(
            AssessmentAttemptAnswer(
                attempt_id=attempt.id,
                question_id=question_id,
                selected_option_id=selected_option_id,
                is_correct=is_correct,
            )
        )

    # Nothing is added/committed until every answer has validated cleanly —
    # a single bad reference anywhere fails the whole submission atomically.
    total_questions = len(attempt.question_ids)
    wrong_count = answered_count - correct_count
    unanswered_count = total_questions - answered_count
    accuracy_percentage = (correct_count / answered_count * 100) if answered_count > 0 else 0.0
    score_percentage = (correct_count / total_questions * 100) if total_questions > 0 else 0.0

    for row in answer_rows:
        db.add(row)

    attempt.status = "submitted"
    attempt.submitted_at = datetime.utcnow()
    attempt.correct_answers = correct_count
    attempt.wrong_answers = wrong_count
    attempt.unanswered_answers = unanswered_count
    attempt.score_percentage = score_percentage
    attempt.accuracy_percentage = accuracy_percentage
    attempt.time_taken_seconds = time_taken_seconds

    await db.commit()
    await db.refresh(attempt)

    return attempt

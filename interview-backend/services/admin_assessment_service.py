"""Business logic for admin management of the Online Assessment question bank.

Kept separate from services/assessment_service.py: that module is the
candidate-facing selection/scoring path (V2.1/V2.2) and must stay untouched
by this V2.4 admin CRUD layer. Nothing in this module is reachable except
through routes/admin_assessment.py, which is gated by require_admin().
"""
from typing import Optional

from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models import AssessmentCategory, AssessmentQuestion, AssessmentQuestionOption
from schemas.assessment import QuestionCreate, QuestionUpdate


class QuestionNotFoundError(Exception):
    def __init__(self, question_id: str):
        self.question_id = question_id
        super().__init__(f"Question not found: {question_id!r}")


class CategoryNotFoundError(Exception):
    def __init__(self, category_id: str):
        self.category_id = category_id
        super().__init__(f"Category not found: {category_id!r}")


class QuestionInUseError(Exception):
    def __init__(self, question_id: str):
        self.question_id = question_id
        super().__init__(
            f"Question {question_id!r} cannot be deleted because it has recorded "
            "attempt answers; disable it instead"
        )


def _question_stmt():
    return select(AssessmentQuestion).options(
        selectinload(AssessmentQuestion.category),
        selectinload(AssessmentQuestion.options),
    )


async def get_categories(db: AsyncSession) -> list[AssessmentCategory]:
    result = await db.execute(select(AssessmentCategory).order_by(AssessmentCategory.name))
    return list(result.scalars().all())


async def get_questions(
    db: AsyncSession,
    search: Optional[str] = None,
    category_id: Optional[str] = None,
    difficulty: Optional[str] = None,
    active: Optional[bool] = None,
) -> tuple[list[AssessmentQuestion], int]:
    """Admin listing with search/category/difficulty/active filters. No
    pagination — the admin question bank is small enough to list in full,
    matching the spec's explicit "pagination not required"."""
    stmt = _question_stmt()

    if search:
        stmt = stmt.where(AssessmentQuestion.question_text.ilike(f"%{search}%"))
    if category_id:
        stmt = stmt.where(AssessmentQuestion.category_id == category_id)
    if difficulty:
        stmt = stmt.where(AssessmentQuestion.difficulty == difficulty)
    if active is not None:
        stmt = stmt.where(AssessmentQuestion.is_active == active)

    stmt = stmt.order_by(AssessmentQuestion.created_at.desc())

    result = await db.execute(stmt)
    questions = list(result.scalars().unique().all())
    return questions, len(questions)


async def get_question(db: AsyncSession, question_id: str) -> AssessmentQuestion:
    stmt = _question_stmt().where(AssessmentQuestion.id == question_id)
    result = await db.execute(stmt)
    question = result.scalar_one_or_none()
    if question is None:
        raise QuestionNotFoundError(question_id)
    return question


async def _require_category(db: AsyncSession, category_id: str) -> AssessmentCategory:
    category = await db.get(AssessmentCategory, category_id)
    if category is None:
        raise CategoryNotFoundError(category_id)
    return category


async def create_question(db: AsyncSession, payload: QuestionCreate) -> AssessmentQuestion:
    await _require_category(db, payload.category_id)

    question = AssessmentQuestion(
        category_id=payload.category_id,
        question_text=payload.question_text,
        difficulty=payload.difficulty,
        is_active=True,
    )
    question.options = [
        AssessmentQuestionOption(option_text=o.option_text, option_index=i, is_correct=o.is_correct)
        for i, o in enumerate(payload.options)
    ]
    db.add(question)
    await db.commit()
    return await get_question(db, question.id)


async def update_question(
    db: AsyncSession, question_id: str, payload: QuestionUpdate
) -> AssessmentQuestion:
    question = await get_question(db, question_id)
    await _require_category(db, payload.category_id)

    question.category_id = payload.category_id
    question.question_text = payload.question_text
    question.difficulty = payload.difficulty

    # Explicit delete-then-insert (not `question.options = [...]`) because
    # (question_id, option_index) is unique: replacing the collection risks
    # the new rows' INSERTs racing the old rows' DELETEs within one flush.
    # The intermediate flush guarantees the old rows are gone first.
    await db.execute(
        delete(AssessmentQuestionOption).where(AssessmentQuestionOption.question_id == question_id)
    )
    await db.flush()
    for i, o in enumerate(payload.options):
        db.add(
            AssessmentQuestionOption(
                question_id=question_id, option_text=o.option_text, option_index=i, is_correct=o.is_correct
            )
        )

    await db.commit()

    # The raw bulk delete()/add() above bypassed `question.options`, so the
    # session's already-loaded (now stale) collection on this identity-mapped
    # object is never invalidated by commit() (expire_on_commit=False on this
    # app's sessionmaker). Without expiring it explicitly, the re-query below
    # would silently return the pre-update options from the same session's
    # in-memory cache instead of the real post-update rows.
    db.expire(question, ["options"])
    return await get_question(db, question_id)


async def delete_question(db: AsyncSession, question_id: str) -> None:
    """Hard delete. Blocked by a foreign-key constraint (and surfaced here
    as a clean 409) if the question has recorded attempt answers — use
    set_question_active(..., False) instead for any question with history."""
    question = await get_question(db, question_id)
    await db.delete(question)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise QuestionInUseError(question_id)


async def set_question_active(db: AsyncSession, question_id: str, is_active: bool) -> AssessmentQuestion:
    question = await get_question(db, question_id)
    question.is_active = is_active
    await db.commit()
    return await get_question(db, question_id)

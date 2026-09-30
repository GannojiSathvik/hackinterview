"""Tests for server-side assessment scoring in services/assessment_service.py.

Runs against an in-memory SQLite database (aiosqlite), so no Postgres is
needed. Each test gets a fresh database.
"""
import asyncio
from types import SimpleNamespace

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import models  # noqa: F401 — registers every model on Base.metadata
from database import Base
from models import AssessmentCategory, AssessmentQuestion, AssessmentQuestionOption
from services.assessment_service import (
    AttemptAlreadySubmittedError,
    InsufficientQuestionsError,
    InvalidOptionOwnershipError,
    InvalidQuestionOwnershipError,
    create_attempt,
    serialize_question,
    submit_attempt,
)


def run(coro):
    return asyncio.run(coro)


async def _new_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session = async_sessionmaker(engine, expire_on_commit=False)()

    category = AssessmentCategory(name="Quant", slug="quant")
    session.add(category)
    await session.flush()
    for n in range(3):
        question = AssessmentQuestion(category_id=category.id, question_text=f"Q{n}", difficulty="Easy")
        question.options = [
            AssessmentQuestionOption(option_text=f"Q{n} right", option_index=0, is_correct=True),
            AssessmentQuestionOption(option_text=f"Q{n} wrong", option_index=1, is_correct=False),
        ]
        session.add(question)
    await session.commit()
    return session


def _answer(question_id, option_id):
    return SimpleNamespace(question_id=question_id, selected_option_id=option_id)


def _option(question, correct):
    return next(o.id for o in question.options if o.is_correct is correct)


def test_scores_correct_wrong_and_unanswered():
    async def scenario():
        db = await _new_db()
        attempt, questions = await create_attempt(db, category_slug="quant", difficulty=None, question_count=3)
        q1, q2, _q3 = questions
        answers = [_answer(q1.id, _option(q1, True)), _answer(q2.id, _option(q2, False))]  # q3 unanswered
        return await submit_attempt(db, attempt.id, answers, time_taken_seconds=42)

    attempt = run(scenario())

    assert attempt.status == "submitted"
    assert (attempt.correct_answers, attempt.wrong_answers, attempt.unanswered_answers) == (1, 1, 1)
    assert attempt.score_percentage == pytest.approx(100 / 3)   # correct / total
    assert attempt.accuracy_percentage == pytest.approx(50.0)   # correct / answered
    assert attempt.time_taken_seconds == 42


def test_questions_sent_to_client_do_not_reveal_the_answer():
    async def scenario():
        db = await _new_db()
        _attempt, questions = await create_attempt(db, category_slug=None, difficulty=None, question_count=1)
        return serialize_question(questions[0]).model_dump()

    question = run(scenario())

    assert all("is_correct" not in option for option in question["options"])


def test_rejects_a_question_that_is_not_part_of_the_attempt():
    async def scenario():
        db = await _new_db()
        attempt, questions = await create_attempt(db, category_slug=None, difficulty=None, question_count=1)
        other = await create_attempt(db, category_slug=None, difficulty=None, question_count=3)
        outsider = next(q for q in other[1] if q.id != questions[0].id)
        await submit_attempt(db, attempt.id, [_answer(outsider.id, _option(outsider, True))], 0)

    with pytest.raises(InvalidQuestionOwnershipError):
        run(scenario())


def test_rejects_an_option_from_a_different_question():
    async def scenario():
        db = await _new_db()
        attempt, (q1, q2) = await create_attempt(db, category_slug=None, difficulty=None, question_count=2)
        await submit_attempt(db, attempt.id, [_answer(q1.id, _option(q2, True))], 0)

    with pytest.raises(InvalidOptionOwnershipError):
        run(scenario())


def test_an_attempt_cannot_be_submitted_twice():
    async def scenario():
        db = await _new_db()
        attempt, _ = await create_attempt(db, category_slug=None, difficulty=None, question_count=1)
        await submit_attempt(db, attempt.id, [], 0)
        await submit_attempt(db, attempt.id, [], 0)

    with pytest.raises(AttemptAlreadySubmittedError):
        run(scenario())


def test_requesting_more_questions_than_exist_fails():
    async def scenario():
        db = await _new_db()
        await create_attempt(db, category_slug=None, difficulty=None, question_count=10)

    with pytest.raises(InsufficientQuestionsError):
        run(scenario())

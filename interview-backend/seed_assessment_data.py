"""
Seed the Online Assessment question bank from seed_data/aptitude_questions.json
(generated from the V1.1 frontend mock data — see
ai-mock-web/scripts/export-assessment-questions.mjs).

Safe to re-run: every insert is preceded by a look-up, so reruns are no-ops.
Validates each question before inserting anything for it — fails loudly
with a clear error rather than creating a partial/broken row.

Run with: python seed_assessment_data.py
"""
import asyncio
import json
import os

from sqlalchemy import select

from database import AsyncSessionLocal
from models import AssessmentCategory, AssessmentQuestion, AssessmentQuestionOption

SEED_FILE = os.path.join(os.path.dirname(__file__), "seed_data", "aptitude_questions.json")

VALID_DIFFICULTIES = {"Easy", "Medium", "Hard"}
EXPECTED_OPTION_COUNT = 4


def slugify(name: str) -> str:
    return name.strip().lower().replace(" ", "-")


def validate_question(raw: dict) -> None:
    """Raise ValueError with a clear message on any inconsistency."""
    qid = raw.get("id", "<unknown>")

    question_text = raw.get("question", "")
    if not isinstance(question_text, str) or not question_text.strip():
        raise ValueError(f"Question {qid}: question_text is empty")

    category = raw.get("category", "")
    if not isinstance(category, str) or not category.strip():
        raise ValueError(f"Question {qid}: category is empty")

    difficulty = raw.get("difficulty")
    if difficulty not in VALID_DIFFICULTIES:
        raise ValueError(
            f"Question {qid}: difficulty {difficulty!r} not in {sorted(VALID_DIFFICULTIES)}"
        )

    options = raw.get("options")
    if not isinstance(options, list) or len(options) != EXPECTED_OPTION_COUNT:
        raise ValueError(
            f"Question {qid}: expected exactly {EXPECTED_OPTION_COUNT} options, got {options!r}"
        )
    for idx, opt in enumerate(options):
        if not isinstance(opt, str) or not opt.strip():
            raise ValueError(f"Question {qid}: option at index {idx} is empty")

    correct_answer = raw.get("correctAnswer")
    if not isinstance(correct_answer, int) or not (0 <= correct_answer < EXPECTED_OPTION_COUNT):
        raise ValueError(f"Question {qid}: correctAnswer {correct_answer!r} out of range")


async def get_or_create_category(session, name: str) -> AssessmentCategory:
    slug = slugify(name)
    result = await session.execute(
        select(AssessmentCategory).where(AssessmentCategory.slug == slug)
    )
    category = result.scalar_one_or_none()
    if category is not None:
        return category

    category = AssessmentCategory(name=name, slug=slug)
    session.add(category)
    await session.flush()  # assign category.id without committing yet
    return category


async def get_or_create_question(
    session, category: AssessmentCategory, raw: dict
) -> tuple[AssessmentQuestion, bool]:
    external_ref = f"mock-{raw['id']}"
    result = await session.execute(
        select(AssessmentQuestion).where(AssessmentQuestion.external_ref == external_ref)
    )
    existing = result.scalar_one_or_none()
    if existing is not None:
        return existing, False

    question = AssessmentQuestion(
        category_id=category.id,
        question_text=raw["question"],
        difficulty=raw["difficulty"],
        external_ref=external_ref,
    )
    session.add(question)
    await session.flush()
    return question, True


async def ensure_options(session, question: AssessmentQuestion, raw: dict) -> None:
    result = await session.execute(
        select(AssessmentQuestionOption).where(
            AssessmentQuestionOption.question_id == question.id
        )
    )
    existing_by_index = {o.option_index: o for o in result.scalars().all()}

    for idx, option_text in enumerate(raw["options"]):
        is_correct = idx == raw["correctAnswer"]
        if idx in existing_by_index:
            continue  # already seeded — leave as-is (idempotent)
        session.add(
            AssessmentQuestionOption(
                question_id=question.id,
                option_text=option_text,
                option_index=idx,
                is_correct=is_correct,
            )
        )


async def seed() -> None:
    with open(SEED_FILE, "r", encoding="utf-8") as f:
        raw_questions = json.load(f)

    if not raw_questions:
        raise ValueError(f"{SEED_FILE} is empty — nothing to seed")

    for raw in raw_questions:
        validate_question(raw)

    created_questions = 0

    async with AsyncSessionLocal() as session:
        for raw in raw_questions:
            category = await get_or_create_category(session, raw["category"])
            question, was_created = await get_or_create_question(session, category, raw)
            if was_created:
                created_questions += 1
            await ensure_options(session, question, raw)

        await session.commit()

    print(f"Seed complete. {len(raw_questions)} questions processed.")
    print(f"Newly created questions this run: {created_questions}")


if __name__ == "__main__":
    asyncio.run(seed())

"""Admin-only routes for managing the Online Assessment question bank (V2.4).

Trust model — read this before touching require_admin():
This backend has no server-side session/JWT verification of its own (see
routes/auth.py — /api/auth/me is a placeholder; NextAuth's session never
reaches FastAPI). So these routes are NOT reachable by a browser directly.
They are only ever called by the Next.js server-side proxy under
ai-mock-web/src/app/api/admin/assessment/**, which:
  1. Reads the real, cryptographically-verified NextAuth session server-side
     (via auth()) — something the browser cannot forge.
  2. Resolves admin/user role from that session's email against the
     ADMIN_EMAILS allowlist (also server-side, in Next.js).
  3. Forwards the request here with a shared secret (X-Internal-Admin-Secret)
     that only that Next.js server process knows, plus the resolved role
     (X-Admin-Role).
require_admin() re-checks both: no/wrong secret is treated as anonymous
(401) — this is also what happens if a request reaches these routes any
other way — and a valid secret with role != "admin" is 403. The role is
never taken from anything a browser could have supplied directly.
"""
import os
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from config import logger
from database import get_db
from models import AssessmentQuestion
from schemas.assessment import (
    CategoryAdminOut,
    QuestionAdminOut,
    QuestionCreate,
    QuestionListResponse,
    QuestionOptionAdminOut,
    QuestionUpdate,
)
from services.admin_assessment_service import (
    CategoryNotFoundError,
    QuestionInUseError,
    QuestionNotFoundError,
    create_question,
    delete_question,
    get_categories,
    get_question,
    get_questions,
    set_question_active,
    update_question,
)

router = APIRouter(prefix="/api/admin/assessment", tags=["admin-assessment"])

ADMIN_PROXY_SECRET = os.getenv("ADMIN_PROXY_SECRET")
if not ADMIN_PROXY_SECRET:
    logger.warning(
        "ADMIN_PROXY_SECRET is not set — every /api/admin/assessment/** request "
        "will be rejected with 401 until it is configured."
    )


async def require_admin(
    x_internal_admin_secret: Optional[str] = Header(default=None, alias="X-Internal-Admin-Secret"),
    x_admin_role: Optional[str] = Header(default=None, alias="X-Admin-Role"),
) -> None:
    if not ADMIN_PROXY_SECRET or x_internal_admin_secret != ADMIN_PROXY_SECRET:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if x_admin_role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


def _serialize_question(q: AssessmentQuestion) -> QuestionAdminOut:
    return QuestionAdminOut(
        id=q.id,
        question_text=q.question_text,
        difficulty=q.difficulty,
        is_active=q.is_active,
        category={
            "id": q.category.id,
            "name": q.category.name,
            "slug": q.category.slug,
            "description": q.category.description,
        },
        options=sorted(
            (
                QuestionOptionAdminOut(
                    id=o.id, option_text=o.option_text, option_index=o.option_index, is_correct=o.is_correct
                )
                for o in q.options
            ),
            key=lambda o: o.option_index,
        ),
    )


@router.get(
    "/questions",
    response_model=QuestionListResponse,
    dependencies=[Depends(require_admin)],
)
async def admin_list_questions(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None, description="Category id"),
    difficulty: Optional[str] = Query(None, description="Easy | Medium | Hard"),
    active: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    questions, total = await get_questions(
        db, search=search, category_id=category, difficulty=difficulty, active=active
    )
    return QuestionListResponse(questions=[_serialize_question(q) for q in questions], total=total)


@router.get(
    "/questions/{question_id}",
    response_model=QuestionAdminOut,
    dependencies=[Depends(require_admin)],
)
async def admin_get_question(question_id: str, db: AsyncSession = Depends(get_db)):
    try:
        question = await get_question(db, question_id)
    except QuestionNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return _serialize_question(question)


@router.post(
    "/questions",
    response_model=QuestionAdminOut,
    status_code=201,
    dependencies=[Depends(require_admin)],
)
async def admin_create_question(payload: QuestionCreate, db: AsyncSession = Depends(get_db)):
    try:
        question = await create_question(db, payload)
    except CategoryNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return _serialize_question(question)


@router.put(
    "/questions/{question_id}",
    response_model=QuestionAdminOut,
    dependencies=[Depends(require_admin)],
)
async def admin_update_question(
    question_id: str, payload: QuestionUpdate, db: AsyncSession = Depends(get_db)
):
    try:
        question = await update_question(db, question_id, payload)
    except QuestionNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except CategoryNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return _serialize_question(question)


@router.patch(
    "/questions/{question_id}/toggle-active",
    response_model=QuestionAdminOut,
    dependencies=[Depends(require_admin)],
)
async def admin_toggle_question_active(question_id: str, db: AsyncSession = Depends(get_db)):
    try:
        current = await get_question(db, question_id)
        question = await set_question_active(db, question_id, not current.is_active)
    except QuestionNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return _serialize_question(question)


@router.delete(
    "/questions/{question_id}",
    status_code=204,
    dependencies=[Depends(require_admin)],
)
async def admin_delete_question(question_id: str, db: AsyncSession = Depends(get_db)):
    try:
        await delete_question(db, question_id)
    except QuestionNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except QuestionInUseError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.get(
    "/categories",
    response_model=list[CategoryAdminOut],
    dependencies=[Depends(require_admin)],
)
async def admin_list_categories(db: AsyncSession = Depends(get_db)):
    categories = await get_categories(db)
    return [
        CategoryAdminOut(id=c.id, name=c.name, slug=c.slug, description=c.description) for c in categories
    ]

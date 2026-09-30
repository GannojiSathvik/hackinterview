"""Tests for the mock-interview flow in routes/interview.py.

Gemini is replaced with fakes, so these run offline and deterministically.
"""
from datetime import datetime

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from routes import interview as interview_routes
from schemas.interview import FeedbackResponse, QuestionResponse
from schemas.voice import SoftSkillsFeedback
from services.gemini_service import GeminiService
from services.session_manager import sessions


@pytest.fixture
def client():
    app = FastAPI()
    app.include_router(interview_routes.router)
    return TestClient(app)


@pytest.fixture
def fake_gemini(monkeypatch):
    """Replace every Gemini call submit-answer can make, recording what the
    grader was asked to grade."""
    graded_questions = []
    generated = []

    async def fake_feedback(question, userAnswer, company_name, job_role, extracted_resume_text=None):
        graded_questions.append(question)
        return FeedbackResponse(score=7, strengths=["s"], weaknesses=["w"], feedback_text="ok")

    async def fake_soft_skills(**kwargs):
        return SoftSkillsFeedback(overallScore=70, metrics=[])

    async def fake_generate_question(**kwargs):
        text = f"generated question {len(generated) + 1}"
        generated.append(text)
        return QuestionResponse(question=text, type="behavioral")

    monkeypatch.setattr(GeminiService, "get_feedback_and_score", staticmethod(fake_feedback))
    monkeypatch.setattr(GeminiService, "generate_soft_skills_feedback", staticmethod(fake_soft_skills))
    monkeypatch.setattr(GeminiService, "generate_question", staticmethod(fake_generate_question))
    return {"graded": graded_questions, "generated": generated}


def _make_session(session_id, current_question, question_count=2):
    sessions[session_id] = {
        "company_name": "Acme",
        "job_role": "Backend Engineer",
        "years_of_experience": 2,
        "current_question": current_question,
        "current_question_type": "behavioral",
        "interview_plan": [
            {"title": "Behavioral", "type": "behavioral", "question_count": question_count, "estimated_minutes": 20}
        ],
        "current_round_index": 0,
        "current_question_index": 0,
        "interview_history": [],
        "questions_and_answers": [],
        "is_complete": False,
        "start_time": datetime.now(),
        "session_id": session_id,
    }


def test_answer_is_graded_against_the_question_the_user_was_shown(client, fake_gemini):
    _make_session("s-grade", current_question="Tell me about a time you disagreed with your manager.")

    res = client.post("/api/submit-answer", json={"sessionId": "s-grade", "userAnswer": "I once..."})

    assert res.status_code == 200
    assert fake_gemini["graded"] == ["Tell me about a time you disagreed with your manager."]
    recorded = sessions["s-grade"]["questions_and_answers"][0]
    assert recorded["question"] == "Tell me about a time you disagreed with your manager."


def test_submit_generates_only_the_next_question(client, fake_gemini):
    _make_session("s-next", current_question="Question shown to the user")

    res = client.post("/api/submit-answer", json={"sessionId": "s-next", "userAnswer": "answer"})

    assert res.status_code == 200
    # Exactly one generation: the *next* question — not an extra one for grading.
    assert fake_gemini["generated"] == ["generated question 1"]
    assert res.json()["questionData"]["question"] == "generated question 1"
    assert sessions["s-next"]["current_question"] == "generated question 1"


def test_unknown_session_returns_404(client, fake_gemini):
    res = client.post("/api/submit-answer", json={"sessionId": "does-not-exist", "userAnswer": "x"})
    assert res.status_code == 404


@pytest.fixture
def fake_start(monkeypatch):
    """Fake plan/question generation and the posture engine for the start routes."""
    import sys
    import types

    async def fake_plan(company, role, yoe):
        return [{"title": "Behavioral", "type": "behavioral", "question_count": 1, "estimated_minutes": 10}], True, "test"

    async def fake_next_question(session, round_info):
        return QuestionResponse(question="first question", type="behavioral")

    fake_posture = types.SimpleNamespace(start_background=lambda session_id: True)
    monkeypatch.setattr(GeminiService, "generate_interview_plan", staticmethod(fake_plan))
    monkeypatch.setattr(interview_routes, "get_next_question_data", fake_next_question)
    monkeypatch.setitem(sys.modules, "services.posture_service", types.SimpleNamespace(posture_service=fake_posture))


def test_same_company_and_role_get_separate_sessions(client, fake_start):
    form = {"jobRole": "Backend Engineer", "companyName": "Acme", "yearsOfExperience": "2"}

    first = client.post("/api/start-interview", data=form).json()["sessionId"]
    second = client.post("/api/start-interview", data=form).json()["sessionId"]

    assert first != second
    assert first in sessions and second in sessions


def test_hr_interviews_get_separate_sessions(client, fake_start):
    first = client.post("/api/start-hr-interview").json()["sessionId"]
    second = client.post("/api/start-hr-interview").json()["sessionId"]

    assert first != second


def _fake_posture_module(report):
    import types
    service = types.SimpleNamespace(stop_background=lambda session_id: report)
    return types.SimpleNamespace(posture_service=service)


@pytest.fixture
def fake_summary_model(monkeypatch):
    """Fake the Gemini model used by generate_interview_summary."""
    import types
    from services import gemini_service

    text = '{"strengths": ["a"], "areas_for_improvement": ["b"], "recommendations": ["c"], "overall_feedback": "d"}'
    fake_model = types.SimpleNamespace(generate_content=lambda *a, **k: types.SimpleNamespace(text=text))
    monkeypatch.setattr(gemini_service, "model", fake_model)


def _session_with_scores(session_id, scores):
    _make_session(session_id, current_question="q")
    sessions[session_id]["questions_and_answers"] = [
        {"question": "q", "answer": "a", "score": s, "round_title": "Behavioral", "type": "behavioral"}
        for s in scores
    ]


def test_empty_posture_report_does_not_lower_the_overall_score(client, fake_summary_model, monkeypatch):
    import sys
    empty_report = {
        "session_summary": {"duration_seconds": 0, "frames_analyzed": 0},
        "overall_assessment": {"readiness_score": 0, "recommendations": []},
    }
    monkeypatch.setitem(sys.modules, "services.posture_service", _fake_posture_module(empty_report))
    _session_with_scores("s-empty-posture", [8, 6])

    body = client.get("/api/interview-summary/s-empty-posture").json()

    assert body["overall_score"] == 7.0
    assert body["posture_report"] is None


def test_posture_report_with_frames_is_blended_into_the_score(client, fake_summary_model, monkeypatch):
    import sys
    report = {
        "session_summary": {"duration_seconds": 60, "frames_analyzed": 120},
        "overall_assessment": {"readiness_score": 50, "recommendations": []},
    }
    monkeypatch.setitem(sys.modules, "services.posture_service", _fake_posture_module(report))
    _session_with_scores("s-real-posture", [8, 6])

    body = client.get("/api/interview-summary/s-real-posture").json()

    # 70% Q&A (7.0) + 30% posture (50/100 -> 5.0) = 6.4
    assert body["overall_score"] == 6.4


def test_mcq_correct_answer_is_not_sent_to_the_client(client, fake_start, monkeypatch):
    from schemas.interview import MCQQuestionResponse

    async def fake_mcq_question(session, round_info):
        return MCQQuestionResponse(
            question="2 + 2 = ?", options=["A: 3", "B: 4"], correct_answer="B: 4", type="mcq"
        )

    monkeypatch.setattr(interview_routes, "get_next_question_data", fake_mcq_question)
    form = {"jobRole": "Backend Engineer", "companyName": "Acme", "yearsOfExperience": "0"}

    question = client.post("/api/start-interview", data=form).json()["questionData"]

    assert question["options"] == ["A: 3", "B: 4"]
    assert "correct_answer" not in question

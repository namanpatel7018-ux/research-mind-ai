"""
ResearchMind AI — Interactive Quiz API
=======================================
Provides:
  - POST /api/quiz/submit: Record user quiz score, pass/fail status, answers, and stats
  - GET  /api/quiz/history: Retrieve quiz attempts for the logged-in user
  - GET  /api/quiz/sample-questions: 10 curated academic questions on AI, NLP, Transformers & RAG
  - POST /api/quiz/generate-quiz-json: Dynamic quiz question synthesis via AI Service
"""

import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.auth import get_optional_current_user, UserOut, _users, _save_store
from app.db import save_quiz_submission, list_quiz_submissions
from app.schemas.quiz_schemas import QuizAnswerItem, QuizSubmitRequest
from app.data.sample_quiz_questions import SAMPLE_QUIZ_QUESTIONS

logger = logging.getLogger("quiz")

router = APIRouter()


class GenerateQuizJSONBody(BaseModel):
    topic: str = "Artificial Intelligence"
    filename: Optional[str] = None
    num_questions: int = 10


# ── API Endpoints ──────────────────────────────────────────────────────────────

@router.get("/sample-questions")
async def get_sample_questions():
    """Returns the canonical 10 curated questions on AI, Deep Learning, Transformers & RAG."""
    return {
        "title": "Artificial Intelligence & Research Systems Examination",
        "total": len(SAMPLE_QUIZ_QUESTIONS),
        "questions": SAMPLE_QUIZ_QUESTIONS
    }


@router.post("/submit")
async def submit_quiz(
    req: QuizSubmitRequest,
    current_user: Optional[UserOut] = Depends(get_optional_current_user)
):
    """
    Saves a completed quiz attempt:
      - Validates score and total
      - Calculates percentage and pass/fail (default pass mark >= 40%)
      - Stores to SQLite quiz_submissions table and logs dashboard activity
      - Attaches to logged-in user profile in auth store
    """
    user_id = (current_user.email if current_user else (req.userId or "researcher@example.com")).strip().lower()
    total = max(1, req.total)
    score = max(0, min(req.score, total))
    percentage = req.percentage if req.percentage is not None else round((score / total) * 100, 1)
    passed = req.passed if req.passed is not None else (percentage >= 40.0)

    # 1. Save to SQLite database
    record = save_quiz_submission(
        user_id=user_id,
        score=score,
        total=total,
        percentage=percentage,
        passed=passed,
        topic=req.topic,
        time_spent_seconds=req.timeSpentSeconds,
        answers=req.answers
    )

    # 2. Update user profile in auth store if user exists
    try:
        if user_id in _users:
            history = _users[user_id].setdefault("quiz_history", [])
            history.append({
                "id": record["id"],
                "score": score,
                "total": total,
                "percentage": percentage,
                "passed": passed,
                "topic": req.topic,
                "created_at": record["created_at"]
            })
            _save_store()
    except Exception as err:
        logger.warning(f"Could not update user record with quiz result: {err}")

    return {
        "status": "success",
        "message": "Quiz result saved successfully",
        "submissionId": record["id"],
        "userId": user_id,
        "score": score,
        "total": total,
        "percentage": percentage,
        "passed": passed,
        "topic": record["topic"],
        "timeSpentSeconds": record["time_spent_seconds"],
        "createdAt": record["created_at"]
    }


@router.get("/history")
async def get_quiz_history(
    limit: int = 20,
    current_user: Optional[UserOut] = Depends(get_optional_current_user)
):
    """Returns recent quiz submissions for the current user."""
    user_id = (current_user.email if current_user else "researcher@example.com").strip().lower()
    items = list_quiz_submissions(user_id=user_id, limit=limit)
    return {
        "userId": user_id,
        "count": len(items),
        "submissions": items
    }


@router.post("/generate-quiz-json")
async def generate_quiz_json_api(
    req: GenerateQuizJSONBody,
    current_user: Optional[UserOut] = Depends(get_optional_current_user)
):
    from app.application.services.quiz_service import quiz_service
    user_id = current_user.email if current_user else "researcher@example.com"
    try:
        return quiz_service.generate_quiz_json(
            topic=req.topic,
            user_id=user_id,
            filename=req.filename,
            num_questions=req.num_questions,
        )
    except Exception as exc:
        sample = quiz_service.get_sample_questions()
        n = max(3, min(req.num_questions, len(sample["questions"])))
        adapted = [
            {
                "subtitle": q.get("subtitle", req.topic),
                "question": q["question"],
                "options": q["options"],
                "correct": ["A", "B", "C", "D"][q.get("correctAnswerIndex", 0)],
                "explanation": q.get("explanation", "Academic rationale."),
            }
            for q in sample["questions"][:n]
        ]
        return {"title": f"Assessment: {req.topic}", "questions": adapted}


__all__ = [
    "router",
    "QuizAnswerItem",
    "QuizSubmitRequest",
    "GenerateQuizJSONBody",
    "SAMPLE_QUIZ_QUESTIONS",
    "get_sample_questions",
    "submit_quiz",
    "get_quiz_history",
    "generate_quiz_json_api",
]

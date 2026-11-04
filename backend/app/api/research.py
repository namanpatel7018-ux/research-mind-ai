"""
ResearchMind AI — Research Tools & History API
==============================================
Provides:
  - POST   /summarize: AI summarization with tailored academic foci
  - POST   /compare: Cross-document comparative analysis
  - POST   /literature-review: Literature review synthesis
  - GET    /history/summaries: User summary history
  - GET    /history/comparisons: User comparison history
  - GET    /history/presentations: User presentation history
  - GET    /history/literature: User literature review history
  - GET    /history/activities: User activity stream
  - POST   /save-answer: Bookmark AI answer with sources
  - GET    /saved-answers: List bookmarked answers
  - DELETE /saved-answers/{answer_id}: Remove bookmarked answer
  - GET    /terminology: Document-grounded terminology & acronym expansions
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.api.auth import get_optional_current_user, UserOut
from app.application.services.research_service import research_service
from app.core.exceptions import EntityNotFoundError
from app.db import (
    list_summaries,
    list_comparisons,
    list_presentations,
    list_literature_reviews,
    list_activities,
    save_answer,
    list_saved_answers,
    delete_saved_answer,
    get_document_terminology,
)

router = APIRouter()


class SummarizeRequest(BaseModel):
    filename: str
    focus: Optional[str] = "general"
    custom_prompt: Optional[str] = None


class CompareRequest(BaseModel):
    filenames: list[str]


class LiteratureReviewRequest(BaseModel):
    filenames: list[str] | None = None
    topic: Optional[str] = None


class SaveAnswerRequest(BaseModel):
    title: str
    content: str
    conversation_id: Optional[str] = None
    message_id: Optional[str] = None
    sources: Optional[List[Any]] = None


@router.post("/summarize")
async def summarize(
    request: SummarizeRequest,
    current_user: Optional[UserOut] = Depends(get_optional_current_user)
):
    user_id = current_user.email if current_user else "researcher@example.com"
    try:
        return research_service.summarize_document(
            filename=request.filename,
            user_id=user_id,
            focus=request.focus or "general",
            custom_prompt=request.custom_prompt,
        )
    except EntityNotFoundError as err:
        raise HTTPException(status_code=404, detail=str(err))


@router.post("/compare")
async def compare(
    request: CompareRequest,
    current_user: Optional[UserOut] = Depends(get_optional_current_user)
):
    user_id = current_user.email if current_user else "researcher@example.com"
    try:
        return research_service.compare_documents(
            filenames=request.filenames,
            user_id=user_id
        )
    except EntityNotFoundError as err:
        raise HTTPException(status_code=404, detail=str(err))


@router.post("/literature-review")
async def literature_review(
    request: LiteratureReviewRequest,
    current_user: Optional[UserOut] = Depends(get_optional_current_user)
):
    user_id = current_user.email if current_user else "researcher@example.com"
    try:
        return research_service.generate_literature_review(
            user_id=user_id,
            filenames=request.filenames,
            topic=request.topic,
        )
    except EntityNotFoundError as err:
        raise HTTPException(status_code=404, detail=str(err))


# ── History Endpoints ─────────────────────────────────────────────────────────

@router.get("/history/summaries")
async def get_summary_history(current_user: Optional[UserOut] = Depends(get_optional_current_user)):
    user_id = current_user.email if current_user else "researcher@example.com"
    return {"summaries": list_summaries(user_id)}


@router.get("/history/comparisons")
async def get_comparison_history(current_user: Optional[UserOut] = Depends(get_optional_current_user)):
    user_id = current_user.email if current_user else "researcher@example.com"
    return {"comparisons": list_comparisons(user_id)}


@router.get("/history/presentations")
async def get_presentation_history(current_user: Optional[UserOut] = Depends(get_optional_current_user)):
    user_id = current_user.email if current_user else "researcher@example.com"
    return {"presentations": list_presentations(user_id)}


@router.get("/history/literature")
async def get_literature_history(current_user: Optional[UserOut] = Depends(get_optional_current_user)):
    user_id = current_user.email if current_user else "researcher@example.com"
    return {"literature_reviews": list_literature_reviews(user_id)}


@router.get("/history/activities")
async def get_activity_history(
    limit: int = 25,
    current_user: Optional[UserOut] = Depends(get_optional_current_user)
):
    user_id = current_user.email if current_user else "researcher@example.com"
    return {"activities": list_activities(user_id, limit)}


# ── Saved Answers ─────────────────────────────────────────────────────────────

@router.post("/save-answer")
async def save_answer_endpoint(
    req: SaveAnswerRequest,
    current_user: Optional[UserOut] = Depends(get_optional_current_user)
):
    user_id = current_user.email if current_user else "researcher@example.com"
    record = save_answer(
        user_id=user_id,
        title=req.title,
        content=req.content,
        conversation_id=req.conversation_id,
        message_id=req.message_id,
        sources=req.sources,
    )
    return {"status": "saved", "answer": record}


@router.get("/saved-answers")
async def get_saved_answers(current_user: Optional[UserOut] = Depends(get_optional_current_user)):
    user_id = current_user.email if current_user else "researcher@example.com"
    return {"saved_answers": list_saved_answers(user_id)}


@router.delete("/saved-answers/{answer_id}")
async def delete_saved(
    answer_id: str,
    current_user: Optional[UserOut] = Depends(get_optional_current_user)
):
    user_id = current_user.email if current_user else "researcher@example.com"
    ok = delete_saved_answer(answer_id, user_id)
    return {"status": "deleted" if ok else "not_found"}


# ── Terminology ───────────────────────────────────────────────────────────────

@router.get("/terminology")
async def get_terminology(
    document_id: Optional[str] = None,
    current_user: Optional[UserOut] = Depends(get_optional_current_user)
):
    user_id = current_user.email if current_user else "researcher@example.com"
    terms = get_document_terminology(user_id, document_id)
    return {"terminology": terms, "count": len(terms)}

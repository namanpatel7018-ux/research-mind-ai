"""
ResearchMind AI — Chat & Conversation API
=========================================
Provides:
  - GET    /conversations: List conversations for user
  - POST   /conversations: Create new conversation
  - GET    /conversations/{conv_id}: Get conversation with full message history
  - PATCH  /conversations/{conv_id}: Rename conversation
  - DELETE /conversations/{conv_id}: Delete conversation and messages
  - POST   /chat: Production-grade grounded RAG chat endpoint
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from app.api.auth import get_optional_current_user, UserOut
from app.application.services.chat_service import chat_service
from app.db import (
    create_conversation,
    list_conversations,
    get_conversation,
    update_conversation_title,
    delete_conversation,
)

router = APIRouter()


class ChatRequest(BaseModel):
    prompt: str
    filename: Optional[str] = None
    filenames: Optional[List[str]] = None
    conversation_id: Optional[str] = None
    mode: Optional[str] = "strict"  # "strict" | "deepthink"
    recent_history: Optional[List[Dict[str, str]]] = None


class ChatResponse(BaseModel):
    query: str
    answer: str
    sources: List[Any] = Field(default_factory=list)
    retrieval: Optional[Dict[str, Any]] = None
    usage: Optional[Dict[str, Any]] = None
    used_chunks_detail: Optional[List[Dict[str, Any]]] = None
    provider: Optional[str] = "ResearchMind AI"
    fallback_used: Optional[bool] = None
    conversation_id: Optional[str] = None


class CreateConversationRequest(BaseModel):
    title: Optional[str] = None
    active_file: Optional[str] = None
    mode: Optional[str] = "strict"


class UpdateConversationRequest(BaseModel):
    title: str


@router.get("/conversations")
async def get_user_conversations(current_user: Optional[UserOut] = Depends(get_optional_current_user)):
    user_id = current_user.email if current_user else "researcher@example.com"
    return {"conversations": list_conversations(user_id)}


@router.post("/conversations")
async def create_new_conversation(
    req: CreateConversationRequest,
    current_user: Optional[UserOut] = Depends(get_optional_current_user)
):
    user_id = current_user.email if current_user else "researcher@example.com"
    conv = create_conversation(user_id, req.title, req.active_file, req.mode or "strict")
    return conv


@router.get("/conversations/{conv_id}")
async def get_single_conversation(
    conv_id: str,
    current_user: Optional[UserOut] = Depends(get_optional_current_user)
):
    user_id = current_user.email if current_user else "researcher@example.com"
    conv = get_conversation(conv_id, user_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv


@router.patch("/conversations/{conv_id}")
async def update_single_conversation(
    conv_id: str,
    req: UpdateConversationRequest,
    current_user: Optional[UserOut] = Depends(get_optional_current_user)
):
    user_id = current_user.email if current_user else "researcher@example.com"
    ok = update_conversation_title(conv_id, user_id, req.title)
    if not ok:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"status": "updated"}


@router.delete("/conversations/{conv_id}")
async def delete_single_conversation(
    conv_id: str,
    current_user: Optional[UserOut] = Depends(get_optional_current_user)
):
    user_id = current_user.email if current_user else "researcher@example.com"
    ok = delete_conversation(conv_id, user_id)
    return {"status": "deleted" if ok else "not_found"}


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: Optional[UserOut] = Depends(get_optional_current_user)
):
    user_id = current_user.email if current_user else "researcher@example.com"
    res = chat_service.execute_chat(
        prompt=request.prompt,
        user_id=user_id,
        conversation_id=request.conversation_id,
        filename=request.filename,
        filenames=request.filenames,
        recent_history=request.recent_history,
        mode=request.mode or "strict",
    )
    return ChatResponse(**res)

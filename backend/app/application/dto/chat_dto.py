"""
ResearchMind AI — Chat & Conversation DTOs
==========================================
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ChatRequestDTO(BaseModel):
    prompt: str
    filename: Optional[str] = None
    filenames: Optional[List[str]] = None
    conversation_id: Optional[str] = None
    mode: Optional[str] = "strict"  # "strict" | "deepthink"
    recent_history: Optional[List[Dict[str, str]]] = None


class ChatResponseDTO(BaseModel):
    query: str
    answer: str
    sources: List[Any] = Field(default_factory=list)
    retrieval: Optional[Dict[str, Any]] = None
    usage: Optional[Dict[str, Any]] = None
    used_chunks_detail: Optional[List[Dict[str, Any]]] = None
    provider: Optional[str] = "ResearchMind AI"
    fallback_used: Optional[bool] = None
    conversation_id: Optional[str] = None


class CreateConversationDTO(BaseModel):
    title: Optional[str] = None
    active_file: Optional[str] = None
    mode: Optional[str] = "strict"


class UpdateConversationDTO(BaseModel):
    title: str

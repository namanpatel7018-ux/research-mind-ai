"""
ResearchMind AI — Conversation and Message Domain Entities
==========================================================
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any


@dataclass
class Message:
    id: str
    conversation_id: str
    user_id: str
    role: str
    text: str
    image: Optional[str] = None
    mode: str = "strict"
    provider: Optional[str] = None
    sources: List[Any] = field(default_factory=list)
    retrieval: Optional[Dict[str, Any]] = None
    usage: Optional[Dict[str, Any]] = None
    used_chunks_detail: List[Any] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "user_id": self.user_id,
            "role": self.role,
            "text": self.text,
            "image": self.image,
            "mode": self.mode,
            "provider": self.provider,
            "sources": self.sources,
            "retrieval": self.retrieval,
            "usage": self.usage,
            "used_chunks_detail": self.used_chunks_detail,
            "created_at": self.created_at,
        }


@dataclass
class Conversation:
    id: str
    user_id: str
    title: str
    active_file: Optional[str] = None
    mode: str = "strict"
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    messages: List[Message] = field(default_factory=list)
    message_count: int = 0
    last_message: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "active_file": self.active_file,
            "mode": self.mode,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "messages": [m.to_dict() for m in self.messages],
            "message_count": self.message_count,
            "last_message": self.last_message,
        }

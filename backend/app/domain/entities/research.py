"""
ResearchMind AI — Research Domain Entities
==========================================
Defines business entities for Summaries, Comparisons, Presentations,
Literature Reviews, Activities, Saved Answers, and User Settings.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any


@dataclass
class Summary:
    id: str
    user_id: str
    document_id: str
    document_name: str
    summary: str
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "document_id": self.document_id,
            "document_name": self.document_name,
            "summary": self.summary,
            "created_at": self.created_at,
        }


@dataclass
class Comparison:
    id: str
    user_id: str
    document_names: List[str]
    comparison: str
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "document_names": self.document_names,
            "comparison": self.comparison,
            "created_at": self.created_at,
        }


@dataclass
class Presentation:
    id: str
    user_id: str
    topic: str
    filename: str
    source_document_id: Optional[str] = None
    num_slides: int = 8
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "topic": self.topic,
            "filename": self.filename,
            "source_document_id": self.source_document_id,
            "num_slides": self.num_slides,
            "created_at": self.created_at,
        }


@dataclass
class LiteratureReview:
    id: str
    user_id: str
    document_names: List[str]
    review: str
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "document_names": self.document_names,
            "review": self.review,
            "created_at": self.created_at,
        }


@dataclass
class Activity:
    id: str
    user_id: str
    type: str
    title: str
    reference_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "type": self.type,
            "title": self.title,
            "reference_id": self.reference_id,
            "metadata": self.metadata or {},
            "created_at": self.created_at,
        }


@dataclass
class SavedAnswer:
    id: str
    user_id: str
    title: str
    content: str
    conversation_id: Optional[str] = None
    message_id: Optional[str] = None
    sources: List[Any] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "content": self.content,
            "conversation_id": self.conversation_id,
            "message_id": self.message_id,
            "sources": self.sources,
            "created_at": self.created_at,
        }


@dataclass
class UserSettings:
    user_id: str
    theme: str = "dark"
    response_style: str = "detailed"
    default_mode: str = "strict"
    citation_display: str = "inline"
    notifications: bool = True
    auto_save: bool = True
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "theme": self.theme,
            "response_style": self.response_style,
            "default_mode": self.default_mode,
            "citation_display": self.citation_display,
            "notifications": self.notifications,
            "auto_save": self.auto_save,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

"""
ResearchMind AI — Database Facade (Backward-Compatible Layer)
=============================================================
This module provides a backward-compatible facade over the modular domain repositories
and SQLite DatabaseManager. All data operations are delegated to domain repository instances.
"""

import re
import sqlite3
from typing import List, Dict, Any, Optional

from app.core.config import settings
from app.infrastructure.database.connection import db_manager, DatabaseManager
from app.infrastructure.database.repositories.sqlite_conversation_repository import SQLiteConversationRepository
from app.infrastructure.database.repositories.sqlite_research_repository import (
    SQLiteSummaryRepository,
    SQLiteComparisonRepository,
    SQLitePresentationRepository,
    SQLiteLiteratureRepository,
    SQLiteActivityRepository,
    SQLiteTerminologyRepository,
    SQLiteSettingsRepository,
    SQLiteSavedAnswerRepository,
)
from app.infrastructure.database.repositories.sqlite_quiz_repository import SQLiteQuizRepository

# Re-export configuration paths
DATA_DIR = settings.DATA_DIR
DB_PATH = settings.DB_PATH

# Shared repository instances
_conv_repo = SQLiteConversationRepository(db_manager)
_summary_repo = SQLiteSummaryRepository(db_manager)
_comp_repo = SQLiteComparisonRepository(db_manager)
_pres_repo = SQLitePresentationRepository(db_manager)
_lit_repo = SQLiteLiteratureRepository(db_manager)
_act_repo = SQLiteActivityRepository(db_manager)
_term_repo = SQLiteTerminologyRepository(db_manager)
_settings_repo = SQLiteSettingsRepository(db_manager)
_saved_repo = SQLiteSavedAnswerRepository(db_manager)
_quiz_repo = SQLiteQuizRepository(db_manager)


def get_db_connection() -> sqlite3.Connection:
    """Returns an active SQLite connection configured with WAL and foreign keys."""
    return db_manager.get_connection()


def init_db() -> None:
    """Initializes SQLite tables and user isolation indexes."""
    db_manager.init_schema()


# Initialize schema on module load for backward compatibility
init_db()


def generate_chat_title(first_prompt: str) -> str:
    """Deterministic title extraction without unnecessary LLM call."""
    cleaned = first_prompt.strip()
    cleaned = re.sub(
        r"^(what\s+is|what\s+are|explain|define|tell\s+me\s+about|summarize|can\s+you\s+explain|how\s+does|how\s+do)\s+",
        "",
        cleaned,
        flags=re.IGNORECASE,
    ).strip(" ?.,!;:")
    if not cleaned:
        cleaned = first_prompt.strip(" ?.,!;:")
    words = cleaned.split()
    if len(words) > 6:
        words = words[:6]
    title = " ".join(words).strip()
    return title.capitalize() if title else "Research Chat"


def create_conversation(
    user_id: str,
    title: Optional[str] = None,
    active_file: Optional[str] = None,
    mode: str = "strict"
) -> Dict[str, Any]:
    return _conv_repo.create(user_id=user_id, title=title, active_file=active_file, mode=mode).to_dict()


def list_conversations(user_id: str) -> List[Dict[str, Any]]:
    return [c.to_dict() for c in _conv_repo.list_by_user(user_id)]


def get_conversation(conv_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    conv = _conv_repo.get_by_id(conv_id, user_id)
    return conv.to_dict() if conv else None


def update_conversation_title(conv_id: str, user_id: str, title: str) -> bool:
    return _conv_repo.update_title(conv_id, user_id, title)


def delete_conversation(conv_id: str, user_id: str) -> bool:
    return _conv_repo.delete(conv_id, user_id)


def add_message(
    conversation_id: str,
    user_id: str,
    role: str,
    text: str,
    image: Optional[str] = None,
    mode: str = "strict",
    provider: Optional[str] = None,
    sources: Optional[List[Any]] = None,
    retrieval: Optional[Dict[str, Any]] = None,
    usage: Optional[Dict[str, Any]] = None,
    used_chunks_detail: Optional[List[Any]] = None
) -> Dict[str, Any]:
    msg = _conv_repo.add_message(
        conversation_id=conversation_id,
        user_id=user_id,
        role=role,
        text=text,
        image=image,
        mode=mode,
        provider=provider,
        sources=sources,
        retrieval=retrieval,
        usage=usage,
        used_chunks_detail=used_chunks_detail,
    )
    return msg.to_dict()


def save_summary(user_id: str, document_id: str, document_name: str, summary: str) -> Dict[str, Any]:
    return _summary_repo.create(user_id=user_id, document_id=document_id, document_name=document_name, summary=summary).to_dict()


def list_summaries(user_id: str) -> List[Dict[str, Any]]:
    return [s.to_dict() for s in _summary_repo.list_by_user(user_id)]


def save_comparison(user_id: str, document_names: List[str], comparison: str) -> Dict[str, Any]:
    return _comp_repo.create(user_id=user_id, document_names=document_names, comparison=comparison).to_dict()


def list_comparisons(user_id: str) -> List[Dict[str, Any]]:
    return [c.to_dict() for c in _comp_repo.list_by_user(user_id)]


def save_presentation(
    user_id: str,
    topic: str,
    filename: str,
    source_document_id: Optional[str] = None,
    num_slides: int = 8
) -> Dict[str, Any]:
    return _pres_repo.create(
        user_id=user_id,
        topic=topic,
        filename=filename,
        source_document_id=source_document_id,
        num_slides=num_slides,
    ).to_dict()


def list_presentations(user_id: str) -> List[Dict[str, Any]]:
    return [p.to_dict() for p in _pres_repo.list_by_user(user_id)]


def save_literature_review(user_id: str, document_names: List[str], review: str) -> Dict[str, Any]:
    return _lit_repo.create(user_id=user_id, document_names=document_names, review=review).to_dict()


def list_literature_reviews(user_id: str) -> List[Dict[str, Any]]:
    return [r.to_dict() for r in _lit_repo.list_by_user(user_id)]


def log_activity(
    user_id: str,
    type_: Optional[str] = None,
    title: str = "",
    reference_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    type: Optional[str] = None,
    activity_type: Optional[str] = None,
) -> Dict[str, Any]:
    act_type = activity_type or type or type_ or "activity"
    return _act_repo.log(
        user_id=user_id,
        activity_type=act_type,
        title=title,
        reference_id=reference_id,
        metadata=metadata,
    ).to_dict()


def list_activities(user_id: str, limit: int = 25) -> List[Dict[str, Any]]:
    return [a.to_dict() for a in _act_repo.list_by_user(user_id, limit)]


def save_document_terminology(user_id: str, document_id: str, terms: List[Dict[str, Any]]) -> int:
    _term_repo.save_terminology(user_id=user_id, document_id=document_id, terms=terms)
    return len(terms)


def get_document_terminology(
    user_id: str,
    document_id: Optional[str] = None,
    document_ids: Optional[Any] = None
) -> List[Dict[str, Any]]:
    docs = document_ids if document_ids is not None else document_id
    return _term_repo.get_terminology(user_id=user_id, document_ids=docs)


def get_user_settings(user_id: str) -> Dict[str, Any]:
    return _settings_repo.get_by_user(user_id).to_dict()


def update_user_settings(user_id: str, settings: Dict[str, Any]) -> Dict[str, Any]:
    return _settings_repo.update(user_id, settings).to_dict()


def save_answer(
    user_id: str,
    title: str,
    content: str,
    conversation_id: Optional[str] = None,
    message_id: Optional[str] = None,
    sources: Optional[List[Any]] = None
) -> Dict[str, Any]:
    return _saved_repo.create(
        user_id=user_id,
        title=title,
        content=content,
        conversation_id=conversation_id,
        message_id=message_id,
        sources=sources,
    ).to_dict()


def list_saved_answers(user_id: str) -> List[Dict[str, Any]]:
    return [a.to_dict() for a in _saved_repo.list_by_user(user_id)]


def delete_saved_answer(answer_id: str, user_id: str) -> bool:
    return _saved_repo.delete(answer_id, user_id)


def save_quiz_submission(
    user_id: str,
    score: int,
    total: int,
    percentage: float,
    passed: bool,
    topic: Optional[str] = None,
    time_spent_seconds: Optional[int] = None,
    answers: Optional[List[Any]] = None
) -> Dict[str, Any]:
    return _quiz_repo.create_submission(
        user_id=user_id,
        score=score,
        total=total,
        percentage=percentage,
        passed=passed,
        topic=topic,
        time_spent_seconds=time_spent_seconds,
        answers=answers,
    ).to_dict()


def list_quiz_submissions(user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
    return [q.to_dict() for q in _quiz_repo.list_submissions(user_id, limit)]

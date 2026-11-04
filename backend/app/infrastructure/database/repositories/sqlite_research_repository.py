"""
ResearchMind AI — SQLite Research Repositories
==============================================
Implements repositories for Summaries, Comparisons, Presentations,
Literature Reviews, Activities, Saved Answers, Settings, and Terminology.
"""

import json
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from app.domain.entities.research import (
    Summary,
    Comparison,
    Presentation,
    LiteratureReview,
    Activity,
    SavedAnswer,
    UserSettings,
)
from app.domain.interfaces.repositories import (
    ISummaryRepository,
    IComparisonRepository,
    IPresentationRepository,
    ILiteratureRepository,
    IActivityRepository,
    ISavedAnswerRepository,
    ISettingsRepository,
    ITerminologyRepository,
)
from app.infrastructure.database.connection import DatabaseManager, db_manager


class SQLiteSummaryRepository(ISummaryRepository):
    def __init__(self, db: Optional[DatabaseManager] = None):
        self.db = db or db_manager

    def create(self, user_id: str, document_id: str, document_name: str, summary: str) -> Summary:
        summary_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        with self.db.get_connection() as conn:
            conn.execute(
                """INSERT INTO summaries (id, user_id, document_id, document_name, summary, created_at)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (summary_id, user_id, document_id, document_name, summary, now)
            )
            conn.commit()
        return Summary(
            id=summary_id,
            user_id=user_id,
            document_id=document_id,
            document_name=document_name,
            summary=summary,
            created_at=now
        )

    def list_by_user(self, user_id: str) -> List[Summary]:
        with self.db.get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM summaries WHERE user_id = ? ORDER BY created_at DESC",
                (user_id,)
            ).fetchall()
            return [
                Summary(
                    id=r["id"],
                    user_id=r["user_id"],
                    document_id=r["document_id"],
                    document_name=r["document_name"],
                    summary=r["summary"],
                    created_at=r["created_at"]
                ) for r in rows
            ]


class SQLiteComparisonRepository(IComparisonRepository):
    def __init__(self, db: Optional[DatabaseManager] = None):
        self.db = db or db_manager

    def create(self, user_id: str, document_names: List[str], comparison: str) -> Comparison:
        comp_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        doc_json = json.dumps(document_names, ensure_ascii=False)
        with self.db.get_connection() as conn:
            conn.execute(
                """INSERT INTO comparisons (id, user_id, document_names_json, comparison, created_at)
                   VALUES (?, ?, ?, ?, ?)""",
                (comp_id, user_id, doc_json, comparison, now)
            )
            conn.commit()
        return Comparison(
            id=comp_id,
            user_id=user_id,
            document_names=document_names,
            comparison=comparison,
            created_at=now
        )

    def list_by_user(self, user_id: str) -> List[Comparison]:
        with self.db.get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM comparisons WHERE user_id = ? ORDER BY created_at DESC",
                (user_id,)
            ).fetchall()
            result = []
            for r in rows:
                docs = json.loads(r["document_names_json"]) if r["document_names_json"] else []
                result.append(Comparison(
                    id=r["id"],
                    user_id=r["user_id"],
                    document_names=docs,
                    comparison=r["comparison"],
                    created_at=r["created_at"]
                ))
            return result


class SQLitePresentationRepository(IPresentationRepository):
    def __init__(self, db: Optional[DatabaseManager] = None):
        self.db = db or db_manager

    def create(
        self,
        user_id: str,
        topic: str,
        filename: str,
        source_doc: Optional[str] = None,
        num_slides: int = 8,
        source_document_id: Optional[str] = None
    ) -> Presentation:
        doc_id = source_document_id or source_doc
        ppt_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        with self.db.get_connection() as conn:
            conn.execute(
                """INSERT INTO presentations (id, user_id, topic, source_document_id, num_slides, filename, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (ppt_id, user_id, topic, doc_id, num_slides, filename, now)
            )
            conn.commit()
        return Presentation(
            id=ppt_id,
            user_id=user_id,
            topic=topic,
            filename=filename,
            source_document_id=doc_id,
            num_slides=num_slides,
            created_at=now
        )

    def list_by_user(self, user_id: str) -> List[Presentation]:
        with self.db.get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM presentations WHERE user_id = ? ORDER BY created_at DESC",
                (user_id,)
            ).fetchall()
            return [
                Presentation(
                    id=r["id"],
                    user_id=r["user_id"],
                    topic=r["topic"],
                    filename=r["filename"],
                    source_document_id=r["source_document_id"],
                    num_slides=r["num_slides"],
                    created_at=r["created_at"]
                ) for r in rows
            ]


class SQLiteLiteratureRepository(ILiteratureRepository):
    def __init__(self, db: Optional[DatabaseManager] = None):
        self.db = db or db_manager

    def create(self, user_id: str, document_names: List[str], review: str) -> LiteratureReview:
        lit_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        doc_json = json.dumps(document_names, ensure_ascii=False)
        with self.db.get_connection() as conn:
            conn.execute(
                """INSERT INTO literature_reviews (id, user_id, document_names_json, review, created_at)
                   VALUES (?, ?, ?, ?, ?)""",
                (lit_id, user_id, doc_json, review, now)
            )
            conn.commit()
        return LiteratureReview(
            id=lit_id,
            user_id=user_id,
            document_names=document_names,
            review=review,
            created_at=now
        )

    def list_by_user(self, user_id: str) -> List[LiteratureReview]:
        with self.db.get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM literature_reviews WHERE user_id = ? ORDER BY created_at DESC",
                (user_id,)
            ).fetchall()
            result = []
            for r in rows:
                docs = json.loads(r["document_names_json"]) if r["document_names_json"] else []
                result.append(LiteratureReview(
                    id=r["id"],
                    user_id=r["user_id"],
                    document_names=docs,
                    review=r["review"],
                    created_at=r["created_at"]
                ))
            return result


class SQLiteActivityRepository(IActivityRepository):
    def __init__(self, db: Optional[DatabaseManager] = None):
        self.db = db or db_manager

    def log(self, user_id: str, activity_type: str, title: str, reference_id: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None) -> Activity:
        act_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        meta_json = json.dumps(metadata, ensure_ascii=False) if metadata else None
        with self.db.get_connection() as conn:
            conn.execute(
                """INSERT INTO activities (id, user_id, type, title, reference_id, metadata_json, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (act_id, user_id, activity_type, title, reference_id, meta_json, now)
            )
            conn.commit()
        return Activity(
            id=act_id,
            user_id=user_id,
            type=activity_type,
            title=title,
            reference_id=reference_id,
            metadata=metadata or {},
            created_at=now
        )

    def list_by_user(self, user_id: str, limit: int = 25) -> List[Activity]:
        with self.db.get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM activities WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
                (user_id, limit)
            ).fetchall()
            result = []
            for r in rows:
                meta = json.loads(r["metadata_json"]) if r["metadata_json"] else {}
                result.append(Activity(
                    id=r["id"],
                    user_id=r["user_id"],
                    type=r["type"],
                    title=r["title"],
                    reference_id=r["reference_id"],
                    metadata=meta,
                    created_at=r["created_at"]
                ))
            return result


class SQLiteSavedAnswerRepository(ISavedAnswerRepository):
    def __init__(self, db: Optional[DatabaseManager] = None):
        self.db = db or db_manager

    def create(self, user_id: str, title: str, content: str, conversation_id: Optional[str] = None, message_id: Optional[str] = None, sources: Optional[List[Any]] = None) -> SavedAnswer:
        ans_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        sources_json = json.dumps(sources, ensure_ascii=False) if sources else None
        with self.db.get_connection() as conn:
            conn.execute(
                """INSERT INTO saved_answers 
                   (id, user_id, conversation_id, message_id, title, content, sources_json, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (ans_id, user_id, conversation_id, message_id, title, content, sources_json, now)
            )
            conn.commit()
        return SavedAnswer(
            id=ans_id,
            user_id=user_id,
            title=title,
            content=content,
            conversation_id=conversation_id,
            message_id=message_id,
            sources=sources or [],
            created_at=now
        )

    def list_by_user(self, user_id: str) -> List[SavedAnswer]:
        with self.db.get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM saved_answers WHERE user_id = ? ORDER BY created_at DESC",
                (user_id,)
            ).fetchall()
            result = []
            for r in rows:
                srcs = json.loads(r["sources_json"]) if r["sources_json"] else []
                result.append(SavedAnswer(
                    id=r["id"],
                    user_id=r["user_id"],
                    title=r["title"],
                    content=r["content"],
                    conversation_id=r["conversation_id"],
                    message_id=r["message_id"],
                    sources=srcs,
                    created_at=r["created_at"]
                ))
            return result

    def delete(self, saved_id: str, user_id: str) -> bool:
        with self.db.get_connection() as conn:
            cursor = conn.execute(
                "DELETE FROM saved_answers WHERE id = ? AND user_id = ?",
                (saved_id, user_id)
            )
            conn.commit()
            return cursor.rowcount > 0


class SQLiteSettingsRepository(ISettingsRepository):
    def __init__(self, db: Optional[DatabaseManager] = None):
        self.db = db or db_manager

    def get_by_user(self, user_id: str) -> UserSettings:
        with self.db.get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM user_settings WHERE user_id = ?",
                (user_id,)
            ).fetchone()
            if not row:
                now = datetime.now(timezone.utc).isoformat()
                conn.execute(
                    """INSERT OR IGNORE INTO user_settings 
                       (user_id, theme, response_style, default_mode, citation_display, notifications, auto_save, created_at, updated_at)
                       VALUES (?, 'dark', 'detailed', 'strict', 'inline', 1, 1, ?, ?)""",
                    (user_id, now, now)
                )
                conn.commit()
                return UserSettings(user_id=user_id, created_at=now, updated_at=now)

            d = dict(row)
            return UserSettings(
                user_id=d["user_id"],
                theme=d.get("theme", "dark"),
                response_style=d.get("response_style", "detailed"),
                default_mode=d.get("default_mode", "strict"),
                citation_display=d.get("citation_display", "inline"),
                notifications=bool(d.get("notifications", 1)),
                auto_save=bool(d.get("auto_save", 1)),
                created_at=d.get("created_at", ""),
                updated_at=d.get("updated_at", "")
            )

    def update(self, user_id: str, updates: Dict[str, Any]) -> UserSettings:
        allowed = {"theme", "response_style", "default_mode", "citation_display", "notifications", "auto_save"}
        valid = {k: v for k, v in updates.items() if k in allowed}
        if not valid:
            return self.get_by_user(user_id)

        if "notifications" in valid:
            valid["notifications"] = 1 if valid["notifications"] else 0
        if "auto_save" in valid:
            valid["auto_save"] = 1 if valid["auto_save"] else 0

        now = datetime.now(timezone.utc).isoformat()
        valid["updated_at"] = now

        set_clause = ", ".join(f"{k} = ?" for k in valid.keys())
        values = list(valid.values()) + [user_id]

        with self.db.get_connection() as conn:
            conn.execute(f"UPDATE user_settings SET {set_clause} WHERE user_id = ?", values)
            conn.commit()

        return self.get_by_user(user_id)


class SQLiteTerminologyRepository(ITerminologyRepository):
    def __init__(self, db: Optional[DatabaseManager] = None):
        self.db = db or db_manager

    def save_terminology(self, user_id: str, document_id: str, terms: List[Dict[str, Any]]) -> None:
        if not terms:
            return
        now = datetime.now(timezone.utc).isoformat()
        with self.db.get_connection() as conn:
            conn.execute("DELETE FROM document_terminology WHERE user_id = ? AND document_id = ?", (user_id, document_id))
            for item in terms:
                term_id = str(uuid.uuid4())
                conn.execute(
                    """INSERT INTO document_terminology
                       (id, user_id, document_id, term, expanded_term, page_number, chunk_id, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        term_id,
                        user_id,
                        document_id,
                        item["term"].strip(),
                        item["expanded_term"].strip(),
                        item.get("page_number", 1),
                        item.get("chunk_id"),
                        now
                    )
                )
            conn.commit()

    def get_terminology(self, user_id: str, document_ids: Optional[Any] = None) -> List[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            if document_ids:
                if isinstance(document_ids, str):
                    document_ids = [document_ids]
                placeholders = ",".join("?" for _ in document_ids)
                query = f"SELECT * FROM document_terminology WHERE user_id = ? AND document_id IN ({placeholders})"
                params = [user_id] + list(document_ids)
                rows = conn.execute(query, params).fetchall()
            else:
                rows = conn.execute("SELECT * FROM document_terminology WHERE user_id = ?", (user_id,)).fetchall()
            return [dict(r) for r in rows]

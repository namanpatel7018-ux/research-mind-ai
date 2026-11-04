"""
ResearchMind AI — SQLite Conversation Repository
================================================
Implements IConversationRepository backed by SQLite with user isolation.
"""

import json
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from app.domain.entities.conversation import Conversation, Message
from app.domain.interfaces.repositories import IConversationRepository
from app.infrastructure.database.connection import DatabaseManager, db_manager


class SQLiteConversationRepository(IConversationRepository):
    def __init__(self, db: Optional[DatabaseManager] = None):
        self.db = db or db_manager

    def create(
        self,
        user_id: str,
        title: Optional[str] = None,
        active_file: Optional[str] = None,
        mode: str = "strict"
    ) -> Conversation:
        conv_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        t = title or "New Research Chat"
        with self.db.get_connection() as conn:
            conn.execute(
                """INSERT INTO conversations (id, user_id, title, active_file, mode, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (conv_id, user_id, t, active_file, mode, now, now)
            )
            conn.commit()

        return Conversation(
            id=conv_id,
            user_id=user_id,
            title=t,
            active_file=active_file,
            mode=mode,
            created_at=now,
            updated_at=now,
            messages=[]
        )

    def get_by_id(self, conv_id: str, user_id: str) -> Optional[Conversation]:
        with self.db.get_connection() as conn:
            conv_row = conn.execute(
                "SELECT * FROM conversations WHERE id = ? AND user_id = ?",
                (conv_id, user_id)
            ).fetchone()
            if not conv_row:
                return None

            msg_rows = conn.execute(
                "SELECT * FROM messages WHERE conversation_id = ? AND user_id = ? ORDER BY created_at ASC",
                (conv_id, user_id)
            ).fetchall()

            messages: List[Message] = []
            for m in msg_rows:
                d = dict(m)
                messages.append(Message(
                    id=d["id"],
                    conversation_id=d["conversation_id"],
                    user_id=d["user_id"],
                    role=d["role"],
                    text=d["text"],
                    image=d.get("image"),
                    mode=d.get("mode", "strict"),
                    provider=d.get("provider"),
                    sources=json.loads(d["sources_json"]) if d.get("sources_json") else [],
                    retrieval=json.loads(d["retrieval_json"]) if d.get("retrieval_json") else None,
                    usage=json.loads(d["usage_json"]) if d.get("usage_json") else None,
                    used_chunks_detail=json.loads(d["used_chunks_json"]) if d.get("used_chunks_json") else [],
                    created_at=d["created_at"]
                ))

            d_conv = dict(conv_row)
            return Conversation(
                id=d_conv["id"],
                user_id=d_conv["user_id"],
                title=d_conv["title"],
                active_file=d_conv.get("active_file"),
                mode=d_conv.get("mode", "strict"),
                created_at=d_conv["created_at"],
                updated_at=d_conv["updated_at"],
                messages=messages,
                message_count=len(messages),
                last_message=messages[-1].text if messages else None
            )

    def list_by_user(self, user_id: str) -> List[Conversation]:
        with self.db.get_connection() as conn:
            rows = conn.execute(
                """SELECT c.*, 
                          (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as message_count,
                          (SELECT text FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message
                   FROM conversations c
                   WHERE c.user_id = ?
                   ORDER BY c.updated_at DESC""",
                (user_id,)
            ).fetchall()

            result = []
            for r in rows:
                d = dict(r)
                result.append(Conversation(
                    id=d["id"],
                    user_id=d["user_id"],
                    title=d["title"],
                    active_file=d.get("active_file"),
                    mode=d.get("mode", "strict"),
                    created_at=d["created_at"],
                    updated_at=d["updated_at"],
                    message_count=d.get("message_count", 0),
                    last_message=d.get("last_message")
                ))
            return result

    def update_title(self, conv_id: str, user_id: str, title: str) -> bool:
        now = datetime.now(timezone.utc).isoformat()
        with self.db.get_connection() as conn:
            res = conn.execute(
                "UPDATE conversations SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?",
                (title, now, conv_id, user_id)
            )
            conn.commit()
            return res.rowcount > 0

    def delete(self, conv_id: str, user_id: str) -> bool:
        with self.db.get_connection() as conn:
            conn.execute("DELETE FROM messages WHERE conversation_id = ? AND user_id = ?", (conv_id, user_id))
            res = conn.execute("DELETE FROM conversations WHERE id = ? AND user_id = ?", (conv_id, user_id))
            conn.commit()
            return res.rowcount > 0

    def add_message(
        self,
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
    ) -> Message:
        msg_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        sources_json = json.dumps(sources, ensure_ascii=False) if sources else None
        retrieval_json = json.dumps(retrieval, ensure_ascii=False) if retrieval else None
        usage_json = json.dumps(usage, ensure_ascii=False) if usage else None
        used_chunks_json = json.dumps(used_chunks_detail, ensure_ascii=False) if used_chunks_detail else None

        with self.db.get_connection() as conn:
            conn.execute(
                """INSERT INTO messages 
                   (id, conversation_id, user_id, role, text, image, mode, provider, sources_json, retrieval_json, usage_json, used_chunks_json, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (msg_id, conversation_id, user_id, role, text, image, mode, provider, sources_json, retrieval_json, usage_json, used_chunks_json, now)
            )
            conn.execute(
                "UPDATE conversations SET updated_at = ? WHERE id = ? AND user_id = ?",
                (now, conversation_id, user_id)
            )
            conn.commit()

        return Message(
            id=msg_id,
            conversation_id=conversation_id,
            user_id=user_id,
            role=role,
            text=text,
            image=image,
            mode=mode,
            provider=provider,
            sources=sources or [],
            retrieval=retrieval,
            usage=usage,
            used_chunks_detail=used_chunks_detail or [],
            created_at=now
        )

"""
ResearchMind AI — SQLite Quiz Repository
========================================
Implements IQuizRepository backed by SQLite.
"""

import json
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from app.domain.entities.quiz import QuizSubmission
from app.domain.interfaces.repositories import IQuizRepository
from app.infrastructure.database.connection import DatabaseManager, db_manager


class SQLiteQuizRepository(IQuizRepository):
    def __init__(self, db: Optional[DatabaseManager] = None):
        self.db = db or db_manager

    def create_submission(
        self,
        user_id: str,
        score: int,
        total: int,
        percentage: float,
        passed: bool,
        topic: Optional[str] = None,
        time_spent_seconds: Optional[int] = None,
        answers: Optional[List[Any]] = None
    ) -> QuizSubmission:
        sub_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        answers_json = json.dumps(answers or [], ensure_ascii=False)
        topic_str = topic or "General Assessment"
        time_spent = time_spent_seconds or 0

        with self.db.get_connection() as conn:
            conn.execute(
                """INSERT INTO quiz_submissions
                   (id, user_id, score, total, percentage, passed, topic, time_spent_seconds, answers_json, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (sub_id, user_id, score, total, percentage, 1 if passed else 0, topic_str, time_spent, answers_json, now)
            )
            conn.commit()

        return QuizSubmission(
            id=sub_id,
            user_id=user_id,
            score=score,
            total=total,
            percentage=percentage,
            passed=passed,
            topic=topic_str,
            time_spent_seconds=time_spent,
            answers=answers or [],
            created_at=now
        )

    def list_submissions(self, user_id: str, limit: int = 20) -> List[QuizSubmission]:
        with self.db.get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM quiz_submissions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
                (user_id, limit)
            ).fetchall()
            result = []
            for r in rows:
                ans = json.loads(r["answers_json"]) if r["answers_json"] else []
                result.append(QuizSubmission(
                    id=r["id"],
                    user_id=r["user_id"],
                    score=r["score"],
                    total=r["total"],
                    percentage=r["percentage"],
                    passed=bool(r["passed"]),
                    topic=r["topic"],
                    time_spent_seconds=r["time_spent_seconds"],
                    answers=ans,
                    created_at=r["created_at"]
                ))
            return result

"""
ResearchMind AI — Quiz Domain Entities
======================================
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any


@dataclass
class QuizQuestion:
    id: Any
    subtitle: str
    question: str
    options: List[str]
    correct_answer_index: int
    marks: int = 1
    explanation: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "subtitle": self.subtitle,
            "question": self.question,
            "options": self.options,
            "correctAnswerIndex": self.correct_answer_index,
            "marks": self.marks,
            "explanation": self.explanation,
        }


@dataclass
class QuizSubmission:
    id: str
    user_id: str
    score: int
    total: int
    percentage: float
    passed: bool
    topic: str
    time_spent_seconds: int = 0
    answers: List[Any] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "score": self.score,
            "total": self.total,
            "percentage": self.percentage,
            "passed": self.passed,
            "topic": self.topic,
            "time_spent_seconds": self.time_spent_seconds,
            "answers": self.answers,
            "created_at": self.created_at,
        }

"""
ResearchMind AI — User Domain Entity
====================================
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any


@dataclass
class User:
    email: str
    full_name: str
    hashed_password: Optional[str] = None
    picture: Optional[str] = None
    is_verified: bool = True
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    quiz_history: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "email": self.email,
            "full_name": self.full_name,
            "hashed_password": self.hashed_password,
            "picture": self.picture,
            "is_verified": self.is_verified,
            "created_at": self.created_at,
            "quiz_history": self.quiz_history,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "User":
        return cls(
            email=data.get("email", ""),
            full_name=data.get("full_name", ""),
            hashed_password=data.get("hashed_password"),
            picture=data.get("picture"),
            is_verified=data.get("is_verified", True),
            created_at=data.get("created_at") or datetime.now(timezone.utc).isoformat(),
            quiz_history=data.get("quiz_history") or [],
        )

"""
ResearchMind AI — Domain Repository Interfaces
==============================================
Defines abstract contracts for persistence, enforcing the Dependency
Inversion Principle (DIP) and Interface Segregation Principle (ISP).
"""

from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any

from app.domain.entities.user import User
from app.domain.entities.conversation import Conversation, Message
from app.domain.entities.research import (
    Summary,
    Comparison,
    Presentation,
    LiteratureReview,
    Activity,
    SavedAnswer,
    UserSettings,
)
from app.domain.entities.quiz import QuizSubmission


class IUserRepository(ABC):
    @abstractmethod
    def get_by_email(self, email: str) -> Optional[User]:
        pass

    @abstractmethod
    def save(self, user: User) -> User:
        pass

    @abstractmethod
    def delete(self, email: str) -> bool:
        pass

    @abstractmethod
    def update_profile(self, email: str, full_name: str) -> Optional[User]:
        pass

    @abstractmethod
    def update_password(self, email: str, hashed_password: str) -> bool:
        pass


class IConversationRepository(ABC):
    @abstractmethod
    def create(self, user_id: str, title: Optional[str] = None, active_file: Optional[str] = None, mode: str = "strict") -> Conversation:
        pass

    @abstractmethod
    def get_by_id(self, conv_id: str, user_id: str) -> Optional[Conversation]:
        pass

    @abstractmethod
    def list_by_user(self, user_id: str) -> List[Conversation]:
        pass

    @abstractmethod
    def update_title(self, conv_id: str, user_id: str, title: str) -> bool:
        pass

    @abstractmethod
    def delete(self, conv_id: str, user_id: str) -> bool:
        pass

    @abstractmethod
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
        pass


class ISummaryRepository(ABC):
    @abstractmethod
    def create(self, user_id: str, document_id: str, document_name: str, summary: str) -> Summary:
        pass

    @abstractmethod
    def list_by_user(self, user_id: str) -> List[Summary]:
        pass


class IComparisonRepository(ABC):
    @abstractmethod
    def create(self, user_id: str, document_names: List[str], comparison: str) -> Comparison:
        pass

    @abstractmethod
    def list_by_user(self, user_id: str) -> List[Comparison]:
        pass


class IPresentationRepository(ABC):
    @abstractmethod
    def create(self, user_id: str, topic: str, filename: str, source_doc: Optional[str] = None, num_slides: int = 8) -> Presentation:
        pass

    @abstractmethod
    def list_by_user(self, user_id: str) -> List[Presentation]:
        pass


class ILiteratureRepository(ABC):
    @abstractmethod
    def create(self, user_id: str, document_names: List[str], review: str) -> LiteratureReview:
        pass

    @abstractmethod
    def list_by_user(self, user_id: str) -> List[LiteratureReview]:
        pass


class IActivityRepository(ABC):
    @abstractmethod
    def log(self, user_id: str, activity_type: str, title: str, reference_id: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None) -> Activity:
        pass

    @abstractmethod
    def list_by_user(self, user_id: str, limit: int = 25) -> List[Activity]:
        pass


class ISavedAnswerRepository(ABC):
    @abstractmethod
    def create(self, user_id: str, title: str, content: str, conversation_id: Optional[str] = None, message_id: Optional[str] = None, sources: Optional[List[Any]] = None) -> SavedAnswer:
        pass

    @abstractmethod
    def list_by_user(self, user_id: str) -> List[SavedAnswer]:
        pass

    @abstractmethod
    def delete(self, saved_id: str, user_id: str) -> bool:
        pass


class IQuizRepository(ABC):
    @abstractmethod
    def create_submission(self, user_id: str, score: int, total: int, percentage: float, passed: bool, topic: Optional[str] = None, time_spent_seconds: Optional[int] = None, answers: Optional[List[Any]] = None) -> QuizSubmission:
        pass

    @abstractmethod
    def list_submissions(self, user_id: str, limit: int = 20) -> List[QuizSubmission]:
        pass


class ISettingsRepository(ABC):
    @abstractmethod
    def get_by_user(self, user_id: str) -> UserSettings:
        pass

    @abstractmethod
    def update(self, user_id: str, updates: Dict[str, Any]) -> UserSettings:
        pass


class ITerminologyRepository(ABC):
    @abstractmethod
    def save_terminology(self, user_id: str, document_id: str, terms: List[Dict[str, Any]]) -> None:
        pass

    @abstractmethod
    def get_terminology(self, user_id: str, document_ids: Optional[Any] = None) -> List[Dict[str, Any]]:
        pass

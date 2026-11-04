"""
ResearchMind AI — Application Services Package
===============================================
Exports application service classes and default singletons.
"""

from app.application.services.auth_service import AuthService
from app.application.services.document_service import DocumentService, document_service
from app.application.services.chat_service import ChatService
from app.application.services.research_service import ResearchService, research_service
from app.application.services.export_service import ExportService, export_service
from app.application.services.quiz_service import QuizService, quiz_service
from app.infrastructure.database.repositories.sqlite_user_repository import user_repository

auth_service = AuthService(user_repo=user_repository)
chat_service = ChatService()

__all__ = [
    "AuthService",
    "auth_service",
    "DocumentService",
    "document_service",
    "ChatService",
    "chat_service",
    "ResearchService",
    "research_service",
    "ExportService",
    "export_service",
    "QuizService",
    "quiz_service",
]

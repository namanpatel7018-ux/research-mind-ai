"""
ResearchMind AI — Unified AI & RAG Router (Modular Facade)
==========================================================
Aggregates and exposes modular routers for:
  - Document management & parsing (app.api.documents)
  - Grounded RAG Chat & Conversations (app.api.chat)
  - Summaries, Comparisons, Reviews & History (app.api.research)
  - Professional Exports (PPTX, PDF, Quiz Report) (app.api.export)

Provides 100% backward compatibility for all existing route paths, query parameters,
mock patches, and helper imports across test suites.
"""

from fastapi import APIRouter

from app.api import documents, chat, research, export
from app.rag.rag_service import rag_service
from app.infrastructure.export.pptx_builder import _generate_ppt_professional, pptx_builder
from app.infrastructure.export.pdf_builder import _build_markdown_pdf, pdf_builder
from app.application.services.document_service import document_service

# Re-export models for backward compatibility
from app.api.chat import ChatRequest, ChatResponse, CreateConversationRequest, UpdateConversationRequest
from app.api.research import SummarizeRequest, CompareRequest, LiteratureReviewRequest, SaveAnswerRequest
from app.api.export import (
    ConvertToPPTRequest,
    GeneratePDFRequest,
    GenerateQuizRequest,
    ExportQuizReportRequest,
    QuizQuestionReportItem,
)

# Unified router combining all AI, RAG, research, document, and export endpoints
router = APIRouter()

router.include_router(documents.router)
router.include_router(chat.router)
router.include_router(research.router)
router.include_router(export.router)

# Backward-compatible helper aliases
def _get_user_file_path(filename: str, user_id: str):
    return document_service.storage.get_file_path(user_id, filename)

__all__ = [
    "router",
    "rag_service",
    "_generate_ppt_professional",
    "_build_markdown_pdf",
    "_get_user_file_path",
    "ChatRequest",
    "ChatResponse",
    "CreateConversationRequest",
    "UpdateConversationRequest",
    "SummarizeRequest",
    "CompareRequest",
    "LiteratureReviewRequest",
    "SaveAnswerRequest",
    "ConvertToPPTRequest",
    "GeneratePDFRequest",
    "GenerateQuizRequest",
    "ExportQuizReportRequest",
    "QuizQuestionReportItem",
]

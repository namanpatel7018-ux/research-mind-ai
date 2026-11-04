"""
ResearchMind AI — Document, Research, Quiz, and Export DTOs
===========================================================
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# ── Document DTOs ──
class DocumentUploadResponseDTO(BaseModel):
    filename: str
    status: str = "indexed"
    page_count: int
    chunk_count: int
    character_count: int
    token_count: int
    processing_time_ms: float


class DocumentFileItemDTO(BaseModel):
    filename: str
    size: int
    page_count: int = 0
    chunk_count: int = 0
    indexed: bool = False


# ── Research DTOs ──
class SummarizeRequestDTO(BaseModel):
    filename: str
    focus: Optional[str] = "general"
    custom_prompt: Optional[str] = None


class CompareRequestDTO(BaseModel):
    filenames: List[str]


class LiteratureReviewRequestDTO(BaseModel):
    filenames: Optional[List[str]] = None
    topic: Optional[str] = None


class SaveAnswerRequestDTO(BaseModel):
    title: str
    content: str
    conversation_id: Optional[str] = None
    message_id: Optional[str] = None
    sources: Optional[List[Any]] = None


# ── Export DTOs ──
class ConvertToPPTRequestDTO(BaseModel):
    topic: str
    filename: Optional[str] = None
    num_slides: int = 8
    content: Optional[str] = None
    source_type: Optional[str] = "document"


class GeneratePDFRequestDTO(BaseModel):
    topic: str
    filename: Optional[str] = None
    doc_type: str = "report"
    content: Optional[str] = None


class GenerateQuizRequestDTO(BaseModel):
    topic: str
    filename: Optional[str] = None
    num_questions: int = 10
    include_answers: bool = False


class GenerateQuizJSONRequestDTO(BaseModel):
    topic: str
    filename: Optional[str] = None
    num_questions: int = 10


# ── Quiz DTOs ──
class QuizAnswerItemDTO(BaseModel):
    questionId: Optional[Any] = None
    question: Optional[str] = None
    selectedOption: Optional[int] = None
    correctOption: Optional[int] = None
    isCorrect: Optional[bool] = None
    explanation: Optional[str] = None


class QuizSubmitRequestDTO(BaseModel):
    userId: Optional[str] = None
    score: int = Field(..., ge=0)
    total: int = Field(..., gt=0)
    answers: Optional[List[Any]] = Field(default_factory=list)
    percentage: Optional[float] = None
    passed: Optional[bool] = None
    timeSpentSeconds: Optional[int] = 0
    topic: Optional[str] = "Artificial Intelligence & Deep Learning"

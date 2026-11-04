"""
ResearchMind AI — Quiz Schemas & DTOs
=====================================
Pydantic models for quiz question reports, answer validations, and scoring submissions.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class QuizAnswerItem(BaseModel):
    questionId: Optional[Any] = None
    question: Optional[str] = None
    selectedOption: Optional[int] = None
    correctOption: Optional[int] = None
    isCorrect: Optional[bool] = None
    explanation: Optional[str] = None


class QuizSubmitRequest(BaseModel):
    userId: Optional[str] = None
    score: int = Field(..., ge=0, description="Total score / correct answers")
    total: int = Field(..., gt=0, description="Total number of questions")
    answers: Optional[List[Any]] = Field(default_factory=list, description="Array of question answers")
    percentage: Optional[float] = None
    passed: Optional[bool] = None
    timeSpentSeconds: Optional[int] = Field(0, description="Time taken to finish quiz in seconds")
    topic: Optional[str] = Field("Artificial Intelligence & Deep Learning", description="Subject or document title")

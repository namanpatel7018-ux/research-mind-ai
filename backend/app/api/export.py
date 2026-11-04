"""
ResearchMind AI — Export & Generation API
=========================================
Provides:
  - POST /convert-to-ppt: Generate executive-grade 16:9 widescreen PowerPoint deck
  - POST /generate-pdf: Generate publication-grade ReportLab PDF document
  - POST /export-quiz-report: Export assessment scorecard and certificate as PDF
  - POST /generate-quiz: AI multiple-choice question generation
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.api.auth import get_optional_current_user, UserOut
from app.application.services.export_service import export_service
from app.application.services.quiz_service import quiz_service
from app.core.exceptions import ValidationError, EntityNotFoundError

router = APIRouter()


class ConvertToPPTRequest(BaseModel):
    topic: str
    filename: str | None = None
    num_slides: int = 8
    content: Optional[str] = None
    source_type: Optional[str] = "document"


class GeneratePDFRequest(BaseModel):
    topic: str
    filename: str | None = None
    doc_type: str = "report"
    content: Optional[str] = None


class QuizQuestionReportItem(BaseModel):
    id: Optional[Any] = None
    subtitle: Optional[str] = ""
    question: str
    options: List[str] = []
    correctAnswerIndex: int = 0
    marks: Optional[int] = 1
    explanation: Optional[str] = ""
    selectedOption: Optional[int] = None
    isCorrect: Optional[bool] = False


class ExportQuizReportRequest(BaseModel):
    quizTitle: str = "Assessment Report"
    candidateName: Optional[str] = "Researcher"
    score: int = 0
    total: int = 5
    percentage: int = 0
    passed: bool = False
    passMarkPercent: int = 40
    timeSpentSeconds: int = 0
    questions: List[QuizQuestionReportItem] = []


class GenerateQuizRequest(BaseModel):
    topic: str
    filename: str | None = None
    num_questions: int = 10
    include_answers: bool = False


@router.post("/convert-to-ppt")
async def convert_to_ppt(
    request: ConvertToPPTRequest,
    current_user: Optional[UserOut] = Depends(get_optional_current_user)
):
    user_id = current_user.email if current_user else "researcher@example.com"
    try:
        buf, filename = export_service.generate_presentation(
            topic=request.topic,
            user_id=user_id,
            filename=request.filename,
            num_slides=request.num_slides,
            content=request.content,
            source_type=request.source_type,
        )
        return StreamingResponse(
            buf,
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except EntityNotFoundError as err:
        raise HTTPException(status_code=404, detail=str(err))
    except ValidationError as err:
        raise HTTPException(status_code=400, detail=str(err))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Presentation generation failed: {exc}")


@router.post("/generate-pdf")
async def generate_pdf(
    request: GeneratePDFRequest,
    current_user: Optional[UserOut] = Depends(get_optional_current_user)
):
    user_id = current_user.email if current_user else "researcher@example.com"
    try:
        buf, filename = export_service.generate_pdf(
            topic=request.topic,
            user_id=user_id,
            filename=request.filename,
            doc_type=request.doc_type,
            content=request.content,
        )
        return StreamingResponse(
            buf,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except EntityNotFoundError as err:
        raise HTTPException(status_code=404, detail=str(err))
    except ValidationError as err:
        raise HTTPException(status_code=400, detail=str(err))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {exc}")


@router.post("/export-quiz-report")
async def export_quiz_report(
    req: ExportQuizReportRequest,
    current_user: Optional[UserOut] = Depends(get_optional_current_user)
):
    try:
        buf, filename = export_service.export_quiz_report(
            quiz_title=req.quizTitle,
            candidate_name=req.candidateName or (current_user.full_name if current_user else "Researcher"),
            score=req.score,
            total=req.total,
            percentage=req.percentage,
            passed=req.passed,
            pass_mark_percent=req.passMarkPercent,
            time_spent_seconds=req.timeSpentSeconds,
            questions=[q.model_dump() for q in req.questions],
        )
        return StreamingResponse(
            buf,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to generate quiz report: {exc}")


class GenerateQuizJSONRequest(BaseModel):
    topic: str = "Artificial Intelligence"
    filename: Optional[str] = None
    num_questions: int = 10


@router.post("/generate-quiz-json")
async def generate_quiz_json_endpoint(
    req: GenerateQuizJSONRequest,
    current_user: Optional[UserOut] = Depends(get_optional_current_user)
):
    user_id = current_user.email if current_user else "researcher@example.com"
    try:
        data = quiz_service.generate_quiz_json(
            topic=req.topic,
            user_id=user_id,
            filename=req.filename,
            num_questions=req.num_questions,
        )
        return data
    except Exception as exc:
        # Fallback to high quality academic sample questions
        sample = quiz_service.get_sample_questions()
        n = max(3, min(req.num_questions, len(sample["questions"])))
        adapted = [
            {
                "subtitle": q.get("subtitle", req.topic),
                "question": q["question"],
                "options": q["options"],
                "correct": ["A", "B", "C", "D"][q.get("correctAnswerIndex", 0)],
                "explanation": q.get("explanation", "Academic rationale."),
            }
            for q in sample["questions"][:n]
        ]
        return {"title": f"Assessment: {req.topic}", "questions": adapted}


@router.post("/generate-quiz")
async def generate_quiz_endpoint(
    req: GenerateQuizRequest,
    current_user: Optional[UserOut] = Depends(get_optional_current_user)
):
    user_id = current_user.email if current_user else "researcher@example.com"
    try:
        buf, filename = export_service.generate_quiz_pdf(
            topic=req.topic,
            user_id=user_id,
            filename=req.filename,
            num_questions=req.num_questions,
            include_answers=req.include_answers,
        )
        return StreamingResponse(
            buf,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except EntityNotFoundError as err:
        raise HTTPException(status_code=404, detail=str(err))
    except ValidationError as err:
        raise HTTPException(status_code=400, detail=str(err))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to generate quiz: {exc}")

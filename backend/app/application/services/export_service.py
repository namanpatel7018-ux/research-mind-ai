"""
ResearchMind AI — Export Application Service
============================================
Coordinates generation of PowerPoint presentations (PPTX) and ReportLab PDF documents.
"""

import io
import re
import json
from typing import Optional, List, Dict, Any, Tuple

from app.core.exceptions import ValidationError, EntityNotFoundError
from app.domain.interfaces.repositories import IPresentationRepository, IActivityRepository
from app.infrastructure.database.repositories.sqlite_research_repository import (
    SQLitePresentationRepository,
    SQLiteActivityRepository,
)
from app.infrastructure.export.pptx_builder import PPTXBuilder, pptx_builder
from app.infrastructure.export.pdf_builder import PDFBuilder, pdf_builder
from app.application.services.document_service import DocumentService, document_service
from app.services import ai_service, TaskType


class ExportService:
    def __init__(
        self,
        presentation_repo: Optional[IPresentationRepository] = None,
        activity_repo: Optional[IActivityRepository] = None,
        pptx_exporter: Optional[PPTXBuilder] = None,
        pdf_exporter: Optional[PDFBuilder] = None,
        doc_service: Optional[DocumentService] = None,
    ):
        self.presentation_repo = presentation_repo or SQLitePresentationRepository()
        self.activity_repo = activity_repo or SQLiteActivityRepository()
        self.pptx_exporter = pptx_exporter or pptx_builder
        self.pdf_exporter = pdf_exporter or pdf_builder
        self.doc_service = doc_service or document_service

    def generate_presentation(
        self,
        topic: str,
        user_id: str,
        filename: Optional[str] = None,
        num_slides: int = 8,
        content: Optional[str] = None,
        source_type: Optional[str] = "document"
    ) -> Tuple[io.BytesIO, str]:
        """Generates a professional 16:9 PowerPoint deck and persists presentation record."""
        n = max(6, min(num_slides, 20))

        if content:
            source_block = f"Direct Source Content:\n\n{content[:12000]}"
            t = topic or "Research Presentation"
        elif filename:
            text = self.doc_service.get_document_text(filename, user_id)
            if not text:
                raise EntityNotFoundError(f"Document '{filename}' not found.")
            source_block = f"Source document ({filename}):\n\n{text[:10000]}"
            t = topic or filename
        elif topic:
            source_block = ""
            t = topic
        else:
            raise ValidationError("Provide either a topic, filename, or content.")

        system = (
            "You are a world-class executive presentation designer and academic content specialist. "
            "Your only output is valid JSON — no markdown fences, no explanatory text, just the raw JSON array.\n"
            "Create an executive-grade 16:9 widescreen presentation following this precise layout structure:\n"
            "  - Slide 0 (Title): {\"type\": \"title\", \"title\": \"...\", \"subtitle\": \"Executive Research Briefing\", \"author\": \"ResearchMind AI\"}\n"
            "  - Slide 1 (Executive Summary): {\"type\": \"abstract\", \"title\": \"Executive Overview\", \"content\": \"3-4 sentences synthesizing the core thesis, methodology, and primary breakthrough.\"}\n"
            "  - Slide 2 (Context & Scope): {\"type\": \"intro\", \"title\": \"Context & Objectives\", \"bullets\": [\"**Context**: ...\", \"**Core Problem**: ...\", \"**Framework**: ...\", \"**Target Scope**: ...\"]}\n"
            "  - Content Slides (intelligently choose the most engaging layout for the topic):\n"
            "      * Comparison / Two-column: {\"type\": \"two_column\", \"title\": \"...\", \"col1_title\": \"Approach A\", \"col1_bullets\": [\"**Lead**: text\", ...], \"col2_title\": \"Approach B\", \"col2_bullets\": [\"**Lead**: text\", ...], \"synthesis\": \"...\"}\n"
            "      * Pillars / Three-column: {\"type\": \"three_column\", \"title\": \"...\", \"col1_title\": \"Pillar 1\", \"col1_bullets\": [...], \"col2_title\": \"Pillar 2\", \"col2_bullets\": [...], \"col3_title\": \"Pillar 3\", \"col3_bullets\": [...]}\n"
            "      * Sequential Process: {\"type\": \"process\", \"title\": \"...\", \"steps\": [{\"title\": \"Stage Name\", \"description\": \"Key action & mechanism\"}, ...]}\n"
            "      * Metrics & Results: {\"type\": \"stats\", \"title\": \"...\", \"stats\": [{\"value\": \"99.4%\", \"label\": \"Metric Label\", \"description\": \"Context & benchmark result\"}, ...]}\n"
            "      * Key Findings: {\"type\": \"content\", \"title\": \"...\", \"bullets\": [\"**Key Concept**: Specific empirical or theoretical detail.\", ...], \"note\": \"Strategic takeaway or note\"}\n"
            "  - Slide N-1 (Strategic Conclusions): {\"type\": \"conclusion\", \"title\": \"Strategic Conclusions\", \"bullets\": [\"**Verified Grounding**: ...\", \"**Empirical Impact**: ...\", \"**Production Ready**: ...\"]}\n"
            "  - Slide N (Q&A): {\"type\": \"thanks\", \"title\": \"Thank You\", \"subtitle\": \"Open Discussion & Inquiries\"}\n\n"
            "Important Guidelines:\n"
            "1. Every bullet MUST start with a concise bold lead-in followed by a colon and substantive explanation.\n"
            "2. Ensure layout variety across the deck.\n"
            "3. Provide rich, grounded, and academically rigorous content with zero filler words."
        )

        user_msg = (
            f"Create a {n}-slide professional presentation on: \"{t}\".\n"
            + (f"\n{source_block}" if source_block else "")
            + f"\n\nReturn ONLY the JSON array with exactly {n} slide objects following the schema above."
        )

        try:
            slides_data, ai_resp = ai_service.generate_json(
                task_type=TaskType.PPT,
                system_prompt=system,
                user_prompt=user_msg,
                expected_type=list,
                context_size=len(source_block)
            )
        except Exception:
            resp = ai_service.generate(
                task_type=TaskType.PPT,
                system_prompt=system,
                user_prompt=user_msg,
                context_size=len(source_block)
            )
            raw = resp.content.strip()
            raw = re.sub(r"^```[a-z]*\n?", "", raw)
            raw = re.sub(r"\n?```$", "", raw)
            m = re.search(r"\[.*\]", raw, re.DOTALL)
            slides_data = json.loads(m.group(0) if m else raw)

        pptx_buf = self.pptx_exporter.build_presentation(t, slides_data, num_slides=n)
        safe_name = re.sub(r"[^a-zA-Z0-9_\-]", "_", t)[:40]
        out_filename = f"{safe_name}.pptx"

        self.presentation_repo.create(
            user_id=user_id,
            topic=t,
            filename=out_filename,
            source_doc=filename,
            num_slides=len(slides_data)
        )

        return pptx_buf, out_filename

    def generate_pdf_report(
        self,
        topic: str,
        user_id: str,
        filename: Optional[str] = None,
        doc_type: str = "report",
        content: Optional[str] = None
    ) -> Tuple[io.BytesIO, str]:
        """Builds a publication-grade PDF report."""
        if content and content.strip():
            markdown_content = content.strip()
            clean_topic = topic or "Research Report"
        else:
            source_block = ""
            if filename:
                text = self.doc_service.get_document_text(filename, user_id)
                if text:
                    source_block = f"\n\nSource Material ({filename}):\n{text[:12000]}"
            system_prompt = (
                "You are ResearchMind AI, a senior academic research intelligence engine. "
                "Write an exhaustive, publication-grade academic report on the requested topic. "
                "Structure your output using clear Markdown headings (# Title, ## Section, ### Subsection), "
                "bulleted lists, bold lead-ins for key points, and comparisons where relevant."
            )
            user_prompt = f"Write a comprehensive {doc_type.replace('_', ' ')} on: \"{topic}\".{source_block}"
            ai_resp = ai_service.generate(
                task_type=TaskType.REPORT,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                context_size=len(source_block)
            )
            markdown_content = ai_resp.content
            clean_topic = topic

        pdf_buf = self.pdf_exporter.build_pdf_report(
            topic=clean_topic,
            content=markdown_content,
            doc_type=doc_type
        )
        safe_name = re.sub(r"[^a-zA-Z0-9_\-]", "_", clean_topic)[:40]
        out_filename = f"{safe_name}_{doc_type}.pdf"
        return pdf_buf, out_filename

    def generate_quiz_pdf(
        self,
        topic: str,
        user_id: str,
        filename: Optional[str] = None,
        num_questions: int = 10,
        include_answers: bool = False
    ) -> Tuple[io.BytesIO, str]:
        """Generates quiz questions + topic summary via LLM and builds assessment PDF."""
        n = max(3, min(num_questions, 50))
        source_block = ""
        if filename:
            text = self.doc_service.get_document_text(filename, user_id)
            if text:
                source_block = f"\n\nSource document ({filename}):\n{text[:10000]}"

        # Questions
        q_system = (
            "You are an expert academic exam setter. "
            "Output ONLY a valid JSON array — no prose, no markdown fences. "
            "Each element must have: \"subtitle\", \"question\", \"options\" (exactly 4 strings), \"correct\" (A/B/C/D), \"explanation\"."
        )
        q_user = f"Create exactly {n} high-quality MCQ questions on: \"{topic}\".{source_block}\n\nReturn ONLY the JSON array."

        questions, _ = ai_service.generate_json(
            task_type=TaskType.QUIZ,
            system_prompt=q_system,
            user_prompt=q_user,
            expected_type=list,
            context_size=len(source_block)
        )

        # Topic summary
        s_system = "You are ResearchMind AI. Write a comprehensive professional academic summary of the topic."
        s_user = f"Write a comprehensive professional summary of: \"{topic}\".{source_block}"
        s_resp = ai_service.generate(
            task_type=TaskType.SIMPLE_SUMMARY,
            system_prompt=s_system,
            user_prompt=s_user,
            context_size=len(source_block)
        )
        summary = s_resp.content

        pdf_buf = self.pdf_exporter.build_quiz_pdf(topic, questions, summary, include_answers)
        safe = re.sub(r"[^a-zA-Z0-9_\-]", "_", topic)[:40]
        out_filename = f"quiz_{safe}.pdf"
        return pdf_buf, out_filename


export_service = ExportService()

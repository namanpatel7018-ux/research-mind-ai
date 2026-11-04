"""
ResearchMind AI — Research Application Service
==============================================
Orchestrates AI Summarization, Cross-Document Comparisons, Literature Reviews,
Saved Answers, Activity Feed, and User Preferences.
"""

from typing import List, Dict, Any, Optional

from app.core.exceptions import ValidationError, EntityNotFoundError
from app.domain.entities.research import (
    Summary,
    Comparison,
    LiteratureReview,
    SavedAnswer,
    Activity,
    UserSettings,
)
from app.domain.interfaces.repositories import (
    ISummaryRepository,
    IComparisonRepository,
    ILiteratureRepository,
    ISavedAnswerRepository,
    IActivityRepository,
    ISettingsRepository,
)
from app.infrastructure.database.repositories.sqlite_research_repository import (
    SQLiteSummaryRepository,
    SQLiteComparisonRepository,
    SQLiteLiteratureRepository,
    SQLiteSavedAnswerRepository,
    SQLiteActivityRepository,
    SQLiteSettingsRepository,
)
from app.application.services.document_service import DocumentService, document_service
from app.services import ai_service, TaskType


class ResearchService:
    def __init__(
        self,
        summary_repo: Optional[ISummaryRepository] = None,
        comparison_repo: Optional[IComparisonRepository] = None,
        literature_repo: Optional[ILiteratureRepository] = None,
        saved_answer_repo: Optional[ISavedAnswerRepository] = None,
        activity_repo: Optional[IActivityRepository] = None,
        settings_repo: Optional[ISettingsRepository] = None,
        doc_service: Optional[DocumentService] = None,
    ):
        self.summary_repo = summary_repo or SQLiteSummaryRepository()
        self.comparison_repo = comparison_repo or SQLiteComparisonRepository()
        self.literature_repo = literature_repo or SQLiteLiteratureRepository()
        self.saved_answer_repo = saved_answer_repo or SQLiteSavedAnswerRepository()
        self.activity_repo = activity_repo or SQLiteActivityRepository()
        self.settings_repo = settings_repo or SQLiteSettingsRepository()
        self.doc_service = doc_service or document_service

    def summarize_document(
        self,
        filename: str,
        user_id: str,
        focus: str = "general",
        custom_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        text = self.doc_service.get_document_text(filename, user_id)
        if not text:
            raise EntityNotFoundError(f"Document '{filename}' not found.")

        f = (focus or "general").lower()
        if f == "research_paper":
            system_prompt = (
                "You are ResearchMind AI. Provide a rigorous, academic research paper summary. "
                "Never invent information. If a section is not present in the document, explicitly write 'Not specified in the provided material.' "
                "Follow this exact markdown structure:\n"
                "# Research Summary\n"
                "## 1. Overview\n"
                "## 2. Research Problem\n"
                "## 3. Objectives\n"
                "## 4. Methodology\n"
                "## 5. Dataset / Data\n"
                "## 6. Proposed Approach\n"
                "## 7. Experimental Setup\n"
                "## 8. Results\n"
                "## 9. Key Findings\n"
                "## 10. Limitations\n"
                "## 11. Conclusion\n"
                "## Sources\n"
                "Do not disclose underlying provider or model names."
            )
        elif f == "methodology":
            system_prompt = (
                "You are ResearchMind AI. Provide a deep, methodology-focused summary. "
                "Never invent details. If not mentioned, state 'Not specified in the provided material.' "
                "Follow this exact markdown structure:\n"
                "# Methodology Summary\n"
                "## Research Design & Approach\n"
                "## Proposed Architecture / Framework\n"
                "## Dataset, Preprocessing & Sampling\n"
                "## Algorithmic Workflow & Steps\n"
                "## Evaluation Metrics & Benchmarks\n"
                "## Methodological Strengths & Limitations\n"
                "Do not disclose underlying provider or model names."
            )
        elif f == "exam_notes":
            system_prompt = (
                "You are ResearchMind AI. Provide comprehensive study notes and exam preparation highlights. "
                "Follow this exact markdown structure:\n"
                "# Study Notes & Exam Highlights\n"
                "## Topic Overview\n"
                "## Important Concepts & Theories\n"
                "## Essential Definitions (Interview & Exam Ready)\n"
                "## Core Formulas / System Workflows\n"
                "## Important Exam Points (High Probability Questions)\n"
                "## Quick Revision Flashcard Points\n"
                "Do not disclose underlying provider or model names."
            )
        elif f == "quick_revision":
            system_prompt = (
                "You are ResearchMind AI. Provide ultra-concise, high-yield quick revision notes for fast review. "
                "Follow this exact markdown structure:\n"
                "# Quick Revision Notes\n"
                "## Core Takeaways (At a Glance)\n"
                "## High-Yield Points & Distinctions\n"
                "## Crucial Terminology & Definitions\n"
                "## Key Formulas / Algorithms\n"
                "## Must-Remember Summary Checklist\n"
                "Do not disclose underlying provider or model names."
            )
        elif f == "findings":
            system_prompt = (
                "You are ResearchMind AI. Focus strictly on key empirical findings, experimental outcomes, and conclusions. "
                "Follow this exact markdown structure:\n"
                "# Key Findings & Results\n"
                "## Executive Summary of Findings\n"
                "## Experimental Outcomes & Quantitative Metrics\n"
                "## Comparative Performance & Insights\n"
                "## Practical Implications & Significance\n"
                "## Constraints & Identified Limitations\n"
                "Do not disclose underlying provider or model names."
            )
        else:
            system_prompt = (
                "You are ResearchMind AI. Provide a clear, professional document summary with excellent information hierarchy. "
                "Only include sections supported by the material. "
                "Follow this markdown structure:\n"
                "# Document Summary\n"
                "## Overview\n"
                "## Main Points\n"
                "## Important Details\n"
                "## Key Findings / Insights\n"
                "## Action Items & Conclusion\n"
                "Do not disclose underlying provider or model names."
            )

        user_prompt = f"Provide a structured summary of document '{filename}':\n\n{text[:14000]}"
        if custom_prompt:
            user_prompt = f"User Request: {custom_prompt}\n\n" + user_prompt

        ai_resp = ai_service.generate(
            task_type=TaskType.SIMPLE_SUMMARY,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            context_size=len(text)
        )

        saved = self.summary_repo.create(
            user_id=user_id,
            document_id=filename,
            document_name=filename,
            summary=ai_resp.content
        )
        self.activity_repo.log(user_id, "SUMMARY", f"Generated summary for {filename}", saved.id)

        return {
            "id": saved.id,
            "filename": filename,
            "summary": ai_resp.content,
            "focus": f,
            "provider": "ResearchMind AI",
            "fallback_used": False
        }

    def compare_documents(self, filenames: List[str], user_id: str) -> Dict[str, Any]:
        if len(filenames) < 2:
            raise ValidationError("Provide at least 2 filenames to compare.")

        parts = []
        total_len = 0
        for name in filenames:
            text = self.doc_service.get_document_text(name, user_id)
            if not text:
                raise EntityNotFoundError(f"Document '{name}' not found.")
            snippet = f"[{name}]\n{text[:5000]}"
            parts.append(snippet)
            total_len += len(snippet)

        system_prompt = (
            "You are ResearchMind AI. Compare academic documents objectively.\n"
            "Use Markdown format including a clear comparison table:\n"
            "# Cross-Document Comparison\n"
            "## Executive Summary\n"
            "## Side-by-Side Comparison\n"
            "| Feature / Dimension | " + " | ".join(filenames) + " |\n"
            "|---| " + " | ".join(["---"] * len(filenames)) + " |\n"
            "## Core Methodological Differences\n"
            "## Findings & Performance Analysis\n"
            "## Trade-offs & Recommendations\n"
            "Do not mention underlying AI models or providers."
        )

        user_prompt = "Compare these documents objectively:\n\n" + "\n\n---\n\n".join(parts)

        ai_resp = ai_service.generate(
            task_type=TaskType.COMPARE,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            context_size=total_len
        )

        saved = self.comparison_repo.create(
            user_id=user_id,
            document_names=filenames,
            comparison=ai_resp.content
        )
        title = f"Compared {', '.join(filenames[:2])}{'...' if len(filenames) > 2 else ''}"
        self.activity_repo.log(user_id, "COMPARE", title, saved.id)

        return {
            "id": saved.id,
            "filenames": filenames,
            "comparison": ai_resp.content,
            "provider": "ResearchMind AI",
            "fallback_used": False
        }

    def generate_literature_review(
        self,
        user_id: str,
        filenames: Optional[List[str]] = None,
        topic: Optional[str] = None
    ) -> Dict[str, Any]:
        doc_names = filenames
        if not doc_names:
            user_docs = self.doc_service.list_documents(user_id)
            doc_names = [d["filename"] for d in user_docs if d.get("indexed")]

        if not doc_names:
            raise ValidationError("Upload at least one document before generating a literature review.")

        papers = []
        total_len = 0
        for name in doc_names:
            text = self.doc_service.get_document_text(name, user_id)
            if not text:
                continue
            snippet = f"[Paper: {name}]\n{text[:5000]}"
            papers.append(snippet)
            total_len += len(snippet)

        if not papers:
            raise EntityNotFoundError("No readable content found in selected documents.")

        topic_title = topic or "Multi-Study Literature Review"

        system_prompt = (
            "You are ResearchMind AI, a senior academic research intelligence engine. "
            "Create an evidence-grounded, comprehensive literature review strictly from the provided papers. "
            "Do NOT invent citations, authors, publication years, methods, or findings. If any detail is absent from the text, state 'Not specified in provided material.'\n\n"
            f"Follow this EXACT Markdown structure:\n# Literature Review: {topic_title}\n\n"
            "## Research Topic\n[Concise statement of the central research domain and core inquiry]\n\n"
            "## Research Overview\n[2-3 paragraphs synthesizing the current state of knowledge from the provided papers]\n\n"
            "## Existing Studies\nFor each paper provided, generate a detailed study breakdown:\n"
            "### Study 1: [Filename / Paper Title]\n- **Author / Year:** [Extracted or 'Not specified in provided material']\n"
            "- **Title:** [Extracted title]\n- **Objective:** [Core goal/hypothesis]\n"
            "- **Methodology:** [Algorithm, architecture, experimental framework]\n- **Dataset:** [Data source, size, metrics]\n"
            "- **Key Findings:** [Primary conclusions and quantitative outcomes]\n- **Limitations:** [Identified shortcomings or constraints]\n\n"
            "## Comparative Analysis\nProvide a markdown table comparing all papers:\n"
            "| Study | Method | Dataset | Main Finding | Limitation |\n|---|---|---|---|---|\n\n"
            "## Research Trends\n[Emerging patterns, common technological paradigms, and consensus across studies]\n\n"
            "## Research Gaps\n[Unaddressed problems, evaluation shortcomings, or unexplored scenarios in the reviewed works]\n\n"
            "## Future Research Opportunities\n[High-value directions for future researchers]\n\n"
            "## Conclusion\n[Final synthesis and critical evaluation]\n\n"
            "## References\n[List of filenames and extracted publication information only - NO hallucinated citations]\n\n"
            "Do not disclose underlying provider or model names."
        )

        user_prompt = "Create a comprehensive, academic literature review from these documents:\n\n" + "\n\n---\n\n".join(papers)

        ai_resp = ai_service.generate(
            task_type=TaskType.LITERATURE_REVIEW,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            context_size=total_len
        )

        saved = self.literature_repo.create(
            user_id=user_id,
            document_names=doc_names,
            review=ai_resp.content
        )
        self.activity_repo.log(user_id, "LITERATURE", f"Generated literature review across {len(doc_names)} papers", saved.id)

        return {
            "id": saved.id,
            "filenames": doc_names,
            "review": ai_resp.content,
            "provider": "ResearchMind AI",
            "fallback_used": False
        }

    # ── History Queries ──
    def list_summaries(self, user_id: str) -> List[Summary]:
        return self.summary_repo.list_by_user(user_id)

    def list_comparisons(self, user_id: str) -> List[Comparison]:
        return self.comparison_repo.list_by_user(user_id)

    def list_literature_reviews(self, user_id: str) -> List[LiteratureReview]:
        return self.literature_repo.list_by_user(user_id)

    def list_activities(self, user_id: str, limit: int = 30) -> List[Activity]:
        return self.activity_repo.list_by_user(user_id, limit=limit)

    # ── Saved Answers ──
    def save_answer(self, user_id: str, title: str, content: str, conversation_id: Optional[str] = None, message_id: Optional[str] = None, sources: Optional[List[Any]] = None) -> SavedAnswer:
        ans = self.saved_answer_repo.create(
            user_id=user_id,
            title=title,
            content=content,
            conversation_id=conversation_id,
            message_id=message_id,
            sources=sources
        )
        self.activity_repo.log(user_id, "SAVE_ANSWER", f"Saved answer: {title[:40]}", ans.id)
        return ans

    def list_saved_answers(self, user_id: str) -> List[SavedAnswer]:
        return self.saved_answer_repo.list_by_user(user_id)

    def delete_saved_answer(self, saved_id: str, user_id: str) -> bool:
        return self.saved_answer_repo.delete(saved_id, user_id)

    # ── Settings ──
    def get_user_settings(self, user_id: str) -> UserSettings:
        return self.settings_repo.get_by_user(user_id)

    def update_user_settings(self, user_id: str, updates: Dict[str, Any]) -> UserSettings:
        return self.settings_repo.update(user_id, updates)


research_service = ResearchService()

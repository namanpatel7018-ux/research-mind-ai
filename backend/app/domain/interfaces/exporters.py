"""
ResearchMind AI — Exporter Domain Interfaces
============================================
Defines contracts for Presentation (PPTX) and Document (PDF) exporters.
"""

from abc import ABC, abstractmethod
import io
from typing import Optional, List, Dict, Any


class IPresentationExporter(ABC):
    @abstractmethod
    def build_presentation(
        self,
        topic: str,
        slides_data: List[Dict[str, Any]],
        num_slides: int = 8
    ) -> io.BytesIO:
        pass


class IPDFExporter(ABC):
    @abstractmethod
    def build_pdf_report(
        self,
        topic: str,
        content: str,
        doc_type: str = "report"
    ) -> io.BytesIO:
        pass

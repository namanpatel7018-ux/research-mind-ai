"""
Production-grade Document Parser and Structure Extractor for ResearchMind AI.
Supports PDF (with x), DOCX, TXT, and Markdown.
Preserves page numbers, structural headings/sections, tables, and bounding boxes.
"""

import os
import re
import io
import time
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import pymupdf  # PyMuPDF

from app.rag.models import Chunk, DocumentStats

# Standard academic research sections regex
ACADEMIC_SECTIONS_PATTERN = re.compile(
    r"^(abstract|introduction|background|related\s+work|literature\s+review|"
    r"methodology|methods|proposed\s+(approach|system|architecture)|materials\s+and\s+methods|"
    r"system\s+(architecture|overview|model)|dataset|data\s+collection|"
    r"experiments?|experimental\s+(setup|results|evaluation)|results|evaluation|"
    r"discussion|ablation\s+study|limitations|conclusion|conclusions|future\s+work|references)\b",
    re.IGNORECASE
)


def approximate_tokens(text: str) -> int:
    """Fast and accurate token approximation (average 1.3 tokens per word for academic text)."""
    words = text.split()
    return max(1, int(len(words) * 1.3))


from app.rag.config import get_config_section


class DocumentParser:
    """Extracts pages, text blocks, bounding boxes, tables, and sections from documents."""

    def __init__(
        self,
        target_chunk_tokens: Optional[int] = None,
        max_chunk_tokens: Optional[int] = None,
        chunk_overlap_tokens: Optional[int] = None
    ):
        cfg = get_config_section("chunking")
        cfg_target = cfg.get("target_tokens", 600)
        cfg_max = cfg.get("max_tokens", 800)
        cfg_overlap_ratio = cfg.get("overlap_percentage", 0.12)
        default_overlap = int(cfg_target * cfg_overlap_ratio)

        self.target_chunk_tokens = int(os.getenv("TARGET_CHUNK_TOKENS", str(target_chunk_tokens or cfg_target)))
        self.max_chunk_tokens = int(os.getenv("MAX_CHUNK_TOKENS", str(max_chunk_tokens or cfg_max)))
        self.chunk_overlap_tokens = int(os.getenv("CHUNK_OVERLAP_TOKENS", str(chunk_overlap_tokens or default_overlap)))
        self.prefix_context = cfg.get("prefix_context", True)


    def parse_file(
        self,
        file_path: Path,
        document_id: str,
        document_name: str,
        user_id: str
    ) -> Tuple[List[Chunk], DocumentStats]:
        """
        Parses a document file and returns structure-aware chunks and processing statistics.
        """
        start_time = time.time()
        ext = file_path.suffix.lower()

        if ext == ".pdf":
            chunks, page_count = self._parse_pdf(file_path, document_id, document_name, user_id)
        elif ext == ".docx":
            chunks, page_count = self._parse_docx(file_path, document_id, document_name, user_id)
        elif ext in [".txt", ".md"]:
            chunks, page_count = self._parse_text(file_path, document_id, document_name, user_id)
        else:
            raise ValueError(f"Unsupported file format: {ext}. Allowed: PDF, DOCX, TXT, MD.")

        total_chars = sum(len(c.text) for c in chunks)
        total_tokens = sum(c.token_count for c in chunks)
        elapsed_ms = (time.time() - start_time) * 1000

        stats = DocumentStats(
            document_id=document_id,
            document_name=document_name,
            page_count=page_count,
            chunk_count=len(chunks),
            character_count=total_chars,
            token_count=total_tokens,
            processing_time_ms=round(elapsed_ms, 2),
            indexed_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        )
        return chunks, stats

    def _parse_pdf(
        self,
        file_path: Path,
        document_id: str,
        document_name: str,
        user_id: str
    ) -> Tuple[List[Chunk], int]:
        """
        Parses a PDF using PyMuPDF.
        Preserves page numbers, block coordinates, extracts tables, and creates structured chunks.
        """
        doc = pymupdf.open(str(file_path))
        page_count = len(doc)
        all_chunks: List[Chunk] = []
        global_chunk_idx = 0
        current_section = "Introduction"

        for page_idx in range(page_count):
            page_number = page_idx + 1
            page = doc[page_idx]

            # 1. Check for tables on this page
            tables_text = []
            try:
                tabs = page.find_tables()
                if tabs and tabs.tables:
                    for t in tabs.tables:
                        df = t.extract()
                        if df and len(df) > 1:
                            # Convert table to clean Markdown format
                            header = [str(col).strip() if col is not None else "" for col in df[0]]
                            rows = []
                            for row in df[1:]:
                                rows.append([str(col).strip() if col is not None else "" for col in row])
                            
                            md_table_lines = [
                                "| " + " | ".join(header) + " |",
                                "| " + " | ".join(["---"] * len(header)) + " |"
                            ]
                            for r in rows:
                                md_table_lines.append("| " + " | ".join(r) + " |")
                            tables_text.append("\n".join(md_table_lines))
            except Exception:
                pass  # Fall back to text extraction if table finder fails

            # 2. Extract text blocks with bounding boxes
            # block format: (x0, y0, x1, y1, text, block_no, block_type)
            blocks = page.get_text("blocks")
            page_items: List[Dict[str, Any]] = []

            for b in blocks:
                if len(b) >= 5 and b[6] == 0:  # block_type == 0 is text
                    text = b[4].strip()
                    if not text:
                        continue
                    
                    bbox = [round(b[0], 2), round(b[1], 2), round(b[2], 2), round(b[3], 2)]
                    
                    # Detect if this block is a section heading
                    is_heading = False
                    cleaned_line = text.split("\n")[0].strip()
                    first_line = re.sub(r"^(\d+(\.\d+)*\s*|[IVXLCDM]+\.?\s*)", "", cleaned_line).strip()
                    
                    if ACADEMIC_SECTIONS_PATTERN.match(first_line):
                        current_section = first_line.title()
                        is_heading = True
                    elif len(cleaned_line) < 60 and cleaned_line.isupper() and len(cleaned_line.split()) < 7:
                        current_section = cleaned_line.title()
                        is_heading = True
                    elif len(cleaned_line) < 50 and not cleaned_line.endswith((".", ",", ";", ":")):
                        if len(cleaned_line.split()) < 6 and any(w[0].isupper() for w in cleaned_line.split()):
                            current_section = cleaned_line
                            is_heading = True

                    page_items.append({
                        "text": text,
                        "bbox": bbox,
                        "section": current_section,
                        "is_heading": is_heading
                    })

            # If page text was empty (e.g. scanned), handle fallback
            if not page_items and not tables_text:
                raw_text = page.get_text().strip()
                if raw_text:
                    page_items.append({
                        "text": raw_text,
                        "bbox": [0.0, 0.0, float(page.rect.width), float(page.rect.height)],
                        "section": current_section,
                        "is_heading": False
                    })

            # 3. Create structure-aware chunks for this page
            page_chunks = self._chunk_page_items(
                page_items=page_items,
                tables=tables_text,
                page_number=page_number,
                document_id=document_id,
                document_name=document_name,
                user_id=user_id,
                start_chunk_idx=global_chunk_idx
            )
            all_chunks.extend(page_chunks)
            global_chunk_idx += len(page_chunks)

        doc.close()
        return all_chunks, page_count

    def _parse_docx(
        self,
        file_path: Path,
        document_id: str,
        document_name: str,
        user_id: str
    ) -> Tuple[List[Chunk], int]:
        """Parses a Word (.docx) document preserving headings and structure."""
        import docx
        doc = docx.Document(str(file_path))
        
        all_chunks: List[Chunk] = []
        current_section = "Introduction"
        current_page = 1
        page_items: List[Dict[str, Any]] = []
        global_chunk_idx = 0
        words_on_page = 0

        for p in doc.paragraphs:
            text = p.text.strip()
            if not text:
                continue

            style_name = (p.style.name or "").lower()
            if "heading" in style_name or "title" in style_name:
                current_section = text
                is_heading = True
            else:
                is_heading = False
                if ACADEMIC_SECTIONS_PATTERN.match(text):
                    current_section = text.title()
                    is_heading = True

            page_items.append({
                "text": text,
                "bbox": None,
                "section": current_section,
                "is_heading": is_heading
            })

            words_on_page += len(text.split())
            # Approximate page break every ~450 words in docx
            if words_on_page > 450:
                p_chunks = self._chunk_page_items(
                    page_items, [], current_page, document_id, document_name, user_id, global_chunk_idx
                )
                all_chunks.extend(p_chunks)
                global_chunk_idx += len(p_chunks)
                page_items = []
                words_on_page = 0
                current_page += 1

        if page_items:
            p_chunks = self._chunk_page_items(
                page_items, [], current_page, document_id, document_name, user_id, global_chunk_idx
            )
            all_chunks.extend(p_chunks)

        return all_chunks, max(1, current_page)

    def _parse_text(
        self,
        file_path: Path,
        document_id: str,
        document_name: str,
        user_id: str
    ) -> Tuple[List[Chunk], int]:
        """Parses a plain text or Markdown file preserving sections."""
        content = file_path.read_text(encoding="utf-8", errors="ignore")
        lines = content.splitlines()

        all_chunks: List[Chunk] = []
        current_section = "General"
        current_page = 1
        page_items: List[Dict[str, Any]] = []
        global_chunk_idx = 0
        words_on_page = 0

        current_para = []

        for line in lines:
            stripped = line.strip()
            if not stripped:
                if current_para:
                    p_text = "\n".join(current_para)
                    page_items.append({
                        "text": p_text,
                        "bbox": None,
                        "section": current_section,
                        "is_heading": False
                    })
                    words_on_page += len(p_text.split())
                    current_para = []
                continue

            if stripped.startswith("#"):
                if current_para:
                    page_items.append({
                        "text": "\n".join(current_para),
                        "bbox": None,
                        "section": current_section,
                        "is_heading": False
                    })
                    words_on_page += len(current_para)
                    current_para = []
                current_section = stripped.lstrip("#").strip()
                page_items.append({
                    "text": stripped,
                    "bbox": None,
                    "section": current_section,
                    "is_heading": True
                })
            else:
                current_para.append(stripped)

            if words_on_page >= 450:
                p_chunks = self._chunk_page_items(
                    page_items, [], current_page, document_id, document_name, user_id, global_chunk_idx
                )
                all_chunks.extend(p_chunks)
                global_chunk_idx += len(p_chunks)
                page_items = []
                words_on_page = 0
                current_page += 1

        if current_para:
            page_items.append({
                "text": "\n".join(current_para),
                "bbox": None,
                "section": current_section,
                "is_heading": False
            })

        if page_items:
            p_chunks = self._chunk_page_items(
                page_items, [], current_page, document_id, document_name, user_id, global_chunk_idx
            )
            all_chunks.extend(p_chunks)

        return all_chunks, max(1, current_page)

    def _format_chunk_payload_text(self, document_name: str, section: str, page_number: int, body: str) -> str:
        """Prefixes chunk with document title, section title, and page number for semantic grounding."""
        if not self.prefix_context:
            return body.strip()
        header = f"[Document: {document_name} | Section: {section} | Page: {page_number}]\n\n"
        if body.strip().startswith(f"[Document: {document_name}"):
            return body.strip()
        return f"{header}{body.strip()}"

    def _chunk_page_items(
        self,
        page_items: List[Dict[str, Any]],
        tables: List[str],
        page_number: int,
        document_id: str,
        document_name: str,
        user_id: str,
        start_chunk_idx: int
    ) -> List[Chunk]:
        """
        Assembles page items into structure-aware chunks without crossing page boundaries.
        Target: 500-800 tokens, 10-15% overlap. Splits on headings and paragraphs.
        Prefixes each chunk with doc title and section for rich contextual embedding and retrieval.
        """
        chunks: List[Chunk] = []
        chunk_idx = start_chunk_idx

        # 1. Add standalone tables
        for t_text in tables:
            formatted_table = self._format_chunk_payload_text(document_name, "Table", page_number, t_text)
            t_tokens = approximate_tokens(formatted_table)
            chunks.append(Chunk(
                chunk_id=f"{document_id}_p{page_number}_c{chunk_idx:03d}",
                document_id=document_id,
                document_name=document_name,
                user_id=user_id,
                page_number=page_number,
                section="Table",
                chunk_index=chunk_idx,
                text=formatted_table,
                token_count=t_tokens,
                bbox=None,
                chunk_type="content"
            ))
            chunk_idx += 1

        if not page_items:
            return chunks

        # Decompose multi-paragraph items into atomic structural units
        atomic_items: List[Dict[str, Any]] = []
        for item in page_items:
            raw_text = item.get("text", "").strip()
            if not raw_text:
                continue
            is_head = item.get("is_heading", False)
            sec = item.get("section", "General")
            bbox = item.get("bbox")

            if is_head or "\n\n" not in raw_text:
                atomic_items.append(item)
            else:
                # Split multi-paragraph text
                paras = [p.strip() for p in re.split(r"\n\s*\n+", raw_text) if p.strip()]
                for p in paras:
                    atomic_items.append({
                        "text": p,
                        "bbox": bbox,
                        "section": sec,
                        "is_heading": False
                    })

        accumulated_text: List[str] = []
        accumulated_bboxes: List[List[float]] = []
        current_tokens = 0
        current_section = atomic_items[0].get("section", "General")

        for item in atomic_items:
            item_text = item["text"]
            item_tokens = approximate_tokens(item_text)
            item_bbox = item.get("bbox")
            item_section = item.get("section", current_section)

            # Split on headings: when a new heading appears, flush previous section's content
            if item.get("is_heading") and accumulated_text:
                combined_body = "\n\n".join(accumulated_text).strip()
                if combined_body:
                    formatted_text = self._format_chunk_payload_text(
                        document_name, current_section, page_number, combined_body
                    )
                    merged_bbox = self._merge_bboxes(accumulated_bboxes)
                    chunks.append(Chunk(
                        chunk_id=f"{document_id}_p{page_number}_c{chunk_idx:03d}",
                        document_id=document_id,
                        document_name=document_name,
                        user_id=user_id,
                        page_number=page_number,
                        section=current_section,
                        chunk_index=chunk_idx,
                        text=formatted_text,
                        token_count=approximate_tokens(formatted_text),
                        bbox=merged_bbox,
                        chunk_type="content"
                    ))
                    chunk_idx += 1

                accumulated_text = []
                accumulated_bboxes = []
                current_tokens = 0
                current_section = item_section


            # If single paragraph exceeds max tokens, recursively split on sentences
            if item_tokens > self.max_chunk_tokens:
                sentences = re.split(r"(?<=[.!?])\s+", item_text)
                for sentence in sentences:
                    s_tokens = approximate_tokens(sentence)
                    if current_tokens + s_tokens > self.max_chunk_tokens and accumulated_text:
                        combined_body = " ".join(accumulated_text).strip()
                        formatted_text = self._format_chunk_payload_text(
                            document_name, current_section, page_number, combined_body
                        )
                        merged_bbox = self._merge_bboxes(accumulated_bboxes)
                        chunks.append(Chunk(
                            chunk_id=f"{document_id}_p{page_number}_c{chunk_idx:03d}",
                            document_id=document_id,
                            document_name=document_name,
                            user_id=user_id,
                            page_number=page_number,
                            section=current_section,
                            chunk_index=chunk_idx,
                            text=formatted_text,
                            token_count=approximate_tokens(formatted_text),
                            bbox=merged_bbox,
                            chunk_type="content"
                        ))
                        chunk_idx += 1

                        # Overlap: preserve last sentence if overlap configured
                        if self.chunk_overlap_tokens > 0 and len(accumulated_text) > 1:
                            accumulated_text = [accumulated_text[-1]]
                            current_tokens = approximate_tokens(accumulated_text[0])
                        else:
                            accumulated_text = []
                            accumulated_bboxes = []
                            current_tokens = 0

                    accumulated_text.append(sentence)
                    if item_bbox:
                        accumulated_bboxes.append(item_bbox)
                    current_tokens += s_tokens
            else:
                # Normal paragraph accumulation
                if current_tokens + item_tokens > self.max_chunk_tokens and accumulated_text:
                    combined_body = "\n\n".join(accumulated_text).strip()
                    formatted_text = self._format_chunk_payload_text(
                        document_name, current_section, page_number, combined_body
                    )
                    merged_bbox = self._merge_bboxes(accumulated_bboxes)
                    chunks.append(Chunk(
                        chunk_id=f"{document_id}_p{page_number}_c{chunk_idx:03d}",
                        document_id=document_id,
                        document_name=document_name,
                        user_id=user_id,
                        page_number=page_number,
                        section=current_section,
                        chunk_index=chunk_idx,
                        text=formatted_text,
                        token_count=approximate_tokens(formatted_text),
                        bbox=merged_bbox,
                        chunk_type="content"
                    ))
                    chunk_idx += 1

                    # Retain last element for 10-15% overlap
                    if self.chunk_overlap_tokens > 0 and len(accumulated_text) > 1 and item_tokens <= self.chunk_overlap_tokens * 2:
                        accumulated_text = [accumulated_text[-1]]
                        accumulated_bboxes = [accumulated_bboxes[-1]] if accumulated_bboxes else []
                        current_tokens = approximate_tokens(accumulated_text[0])
                    else:
                        accumulated_text = []
                        accumulated_bboxes = []
                        current_tokens = 0

                accumulated_text.append(item_text)
                if item_bbox:
                    accumulated_bboxes.append(item_bbox)
                current_tokens += item_tokens
                current_section = item_section

        # Final residual chunk on this page
        if accumulated_text:
            combined_body = "\n\n".join(accumulated_text).strip()
            if combined_body:
                formatted_text = self._format_chunk_payload_text(
                    document_name, current_section, page_number, combined_body
                )
                merged_bbox = self._merge_bboxes(accumulated_bboxes)
                chunks.append(Chunk(
                    chunk_id=f"{document_id}_p{page_number}_c{chunk_idx:03d}",
                    document_id=document_id,
                    document_name=document_name,
                    user_id=user_id,
                    page_number=page_number,
                    section=current_section,
                    chunk_index=chunk_idx,
                    text=formatted_text,
                    token_count=approximate_tokens(formatted_text),
                    bbox=merged_bbox,
                    chunk_type="content"
                ))

        return chunks


    def _merge_bboxes(self, bboxes: List[List[float]]) -> Optional[List[float]]:
        if not bboxes:
            return None
        min_x = min(b[0] for b in bboxes)
        min_y = min(b[1] for b in bboxes)
        max_x = max(b[2] for b in bboxes)
        max_y = max(b[3] for b in bboxes)
        return [round(min_x, 2), round(min_y, 2), round(max_x, 2), round(max_y, 2)]

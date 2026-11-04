"""
ResearchMind AI — Document Application Service
==============================================
Orchestrates document upload, validation, parsing, indexing, text extraction,
and file lifecycle operations with multi-tenant user isolation.
"""

import io
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from pypdf import PdfReader
import pymupdf

from app.core.exceptions import ValidationError, EntityNotFoundError
from app.domain.interfaces.storage import IFileStorage
from app.infrastructure.storage.local_file_storage import LocalFileStorage, local_storage
from app.rag.rag_service import RAGService, rag_service


class DocumentService:
    def __init__(
        self,
        storage: Optional[IFileStorage] = None,
        rag: Optional[RAGService] = None,
    ):
        self.storage = storage or local_storage
        self.rag = rag or rag_service
        self._doc_cache: Dict[Tuple[str, str], str] = {}

    def extract_text(self, data: bytes, filename: str) -> str:
        """Extracts plaintext from file bytes."""
        if filename.lower().endswith(".pdf"):
            reader = PdfReader(io.BytesIO(data))
            return "\n".join(p.extract_text() or "" for p in reader.pages)
        return data.decode("utf-8", errors="ignore")

    def get_document_text(self, filename: str, user_id: str) -> Optional[str]:
        """Returns document text from cache or disk."""
        key = (user_id, filename)
        if key in self._doc_cache:
            return self._doc_cache[key]

        data = self.storage.read_file_bytes(user_id, filename)
        if not data:
            return None

        try:
            text = self.extract_text(data, filename)
            self._doc_cache[key] = text
            return text
        except Exception:
            return None

    def upload_and_index(self, filename: str, data: bytes, user_id: str) -> Dict[str, Any]:
        """Validates, stores, parses, and indexes document into RAG vector store."""
        if not filename.lower().endswith((".pdf", ".docx", ".txt", ".md")):
            raise ValidationError("Only PDF, DOCX, TXT, and MD files are supported.")

        saved_path = self.storage.save_file(user_id, filename, data)
        stats = self.rag.process_and_index_document(
            file_path=saved_path,
            document_id=filename,
            document_name=filename,
            user_id=user_id
        )
        self._doc_cache[(user_id, filename)] = self.extract_text(data, filename)

        return {
            "filename": filename,
            "status": "indexed",
            "page_count": stats.page_count,
            "chunk_count": stats.chunk_count,
            "character_count": stats.character_count,
            "token_count": stats.token_count,
            "processing_time_ms": stats.processing_time_ms,
        }

    def list_documents(self, user_id: str) -> List[Dict[str, Any]]:
        """Returns list of documents owned by user with indexing status."""
        user_docs = {d["document_id"]: d for d in self.rag.list_documents(user_id)}
        disk_files = self.storage.list_files(user_id)

        files = []
        seen = set()

        for f in disk_files:
            fname = f["filename"]
            stat_info = user_docs.get(fname, {})
            files.append({
                "filename": fname,
                "size": f["size"],
                "page_count": stat_info.get("page_count", 0),
                "chunk_count": stat_info.get("chunk_count", 0),
                "indexed": bool(stat_info),
            })
            seen.add(fname)

        for doc_id, stat_info in user_docs.items():
            if doc_id not in seen:
                p = self.storage.get_file_path(user_id, doc_id)
                sz = p.stat().st_size if p and p.exists() else 0
                files.append({
                    "filename": doc_id,
                    "size": sz,
                    "page_count": stat_info.get("page_count", 0),
                    "chunk_count": stat_info.get("chunk_count", 0),
                    "indexed": True,
                })
                seen.add(doc_id)

        return files

    def delete_document(self, filename: str, user_id: str) -> bool:
        """Deletes document from disk, vector store, and cache."""
        self._doc_cache.pop((user_id, filename), None)
        self.rag.delete_document(filename, user_id)
        return self.storage.delete_file(user_id, filename)

    def get_page_details(self, filename: str, page_number: int, user_id: str) -> Dict[str, Any]:
        """Extracts text and layout bounding blocks for a specific document page."""
        path = self.storage.get_file_path(user_id, filename)
        if not path or not path.exists():
            raise EntityNotFoundError(f"File '{filename}' not found.")

        if not filename.lower().endswith(".pdf"):
            text = self.get_document_text(filename, user_id) or ""
            return {"page_number": 1, "text": text, "blocks": []}

        doc = pymupdf.open(str(path))
        if page_number < 1 or page_number > len(doc):
            raise ValidationError(f"Page {page_number} is out of range (1-{len(doc)}).")

        page = doc[page_number - 1]
        raw_blocks = page.get_text("blocks")
        blocks = []
        for b in raw_blocks:
            if len(b) >= 5 and b[4].strip():
                blocks.append({
                    "bbox": [round(coord, 1) for coord in b[:4]],
                    "text": b[4].strip(),
                    "type": "text" if b[5] == 0 else "image"
                })

        return {
            "page_number": page_number,
            "text": page.get_text("text").strip(),
            "blocks": blocks,
        }


document_service = DocumentService()

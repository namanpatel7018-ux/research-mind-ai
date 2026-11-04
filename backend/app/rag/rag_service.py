"""
Central Orchestration Service for Production RAG in ResearchMind AI.
Connects DocumentParser, QdrantVectorStore, HybridRetriever, GroundedGenerator,
Terminology Indexer, and Document/Section Summarizers.
"""

import os
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

from app.rag.models import (
    Chunk,
    DocumentStats,
    RAGQueryResponse,
    CitationSource,
)
from app.rag.parser import DocumentParser, approximate_tokens
from app.rag.embeddings import get_embedder
from app.rag.vector_store import QdrantVectorStore
from app.rag.reranker import Reranker
from app.rag.retriever import HybridRetriever
from app.rag.generator import GroundedGenerator
from app.rag.terminology import extract_document_terminology, create_glossary_chunk
from app.rag.summarizer import generate_document_summary, generate_section_summaries

logger = logging.getLogger("researchmind.rag.service")


class RAGService:
    def __init__(self):
        self.parser = DocumentParser()
        self.embedder = get_embedder()
        self.vector_store = QdrantVectorStore(embedder=self.embedder)
        self.reranker = Reranker()
        self.retriever = HybridRetriever(
            vector_store=self.vector_store,
            reranker=self.reranker
        )
        self.generator = GroundedGenerator()

    def process_and_index_document(
        self,
        file_path: Path,
        document_id: str,
        document_name: str,
        user_id: str
    ) -> DocumentStats:
        """
        Parses document with structure and page preservation, creates chunks,
        generates document-level & section-level summaries, indexes acronym glossary,
        embeds with dense vectors, and stores all items in Qdrant with user isolation.
        """
        chunks, stats = self.parser.parse_file(
            file_path=file_path,
            document_id=document_id,
            document_name=document_name,
            user_id=user_id
        )

        # 1. Extract and persist document-grounded terminology (glossary.json)
        try:
            terms = extract_document_terminology(chunks=chunks, document_id=document_id, user_id=user_id)
            if terms:
                glossary_chunk = create_glossary_chunk(
                    terms=terms,
                    document_id=document_id,
                    document_name=document_name,
                    user_id=user_id,
                    chunk_index=len(chunks)
                )
                if glossary_chunk:
                    chunks.append(glossary_chunk)
        except Exception as exc:
            logger.warning(f"Terminology extraction error for {document_id}: {exc}")

        # 2. Generate and index Document Summary chunk (STEP 2.F)
        try:
            doc_summary_text = generate_document_summary(chunks=chunks, document_name=document_name)
            doc_summary_chunk = Chunk(
                chunk_id=f"{document_id}_summary_doc",
                document_id=document_id,
                document_name=document_name,
                user_id=user_id,
                page_number=1,
                section="Document Summary",
                chunk_index=len(chunks),
                text=f"[Document: {document_name} | Section: Document Summary | Page: 1]\n\nExecutive Overview of {document_name}:\n{doc_summary_text}",
                token_count=approximate_tokens(doc_summary_text),
                bbox=None,
                chunk_type="document_summary"
            )
            chunks.append(doc_summary_chunk)
        except Exception as exc:
            logger.warning(f"Document summary generation error for {document_id}: {exc}")

        # 3. Generate and index Section Summary chunks (STEP 2.F)
        try:
            sec_summaries = generate_section_summaries(chunks=chunks, document_name=document_name)
            for s_idx, (sec_name, first_page, sec_text) in enumerate(sec_summaries):
                sec_chunk = Chunk(
                    chunk_id=f"{document_id}_summary_sec_{s_idx:02d}",
                    document_id=document_id,
                    document_name=document_name,
                    user_id=user_id,
                    page_number=first_page,
                    section=f"Section Summary: {sec_name}",
                    chunk_index=len(chunks),
                    text=f"[Document: {document_name} | Section: Section Summary: {sec_name} | Page: {first_page}]\n\n{sec_text}",
                    token_count=approximate_tokens(sec_text),
                    bbox=None,
                    chunk_type="section_summary"
                )
                chunks.append(sec_chunk)
        except Exception as exc:
            logger.warning(f"Section summaries generation error for {document_id}: {exc}")

        # 4. Upsert all chunks into Qdrant & metadata
        self.vector_store.index_document(
            chunks=chunks,
            stats=stats,
            user_id=user_id
        )

        return stats

    def query_rag(
        self,
        query: str,
        user_id: str,
        document_ids: Optional[List[str]] = None,
        recent_history: Optional[List[Dict[str, str]]] = None,
        mode: str = "strict"
    ) -> RAGQueryResponse:
        """
        Executes grounded RAG query pipeline:
          1. Contextual Query Analysis, History Rewriting & Acronym Expansion
          2. Document-Level Routing for vague/summary queries
          3. Multi-Query Hybrid Retrieval (Dense Qdrant + BM25 Lexical + RRF)
          4. Cross-Encoder Relevance Reranking & Page Diversity Enforcement (max 2/page)
          5. Grounded Generation using PROMPT.md
          6. Verified Citation Extraction (doc name + page for used chunks)
        """
        retrieved_chunks, retrieval_meta = self.retriever.retrieve(
            query=query,
            user_id=user_id,
            document_ids=document_ids,
            recent_history=recent_history
        )

        # Logging rewritten query, retrieved chunks and scores (required by Rules)
        logger.info("=" * 60)
        logger.info(f"[RAG Execution] Query: {query}")
        logger.info(f"[RAG Execution] Resolved: {retrieval_meta.get('resolved_query')}")
        logger.info(f"[RAG Execution] Mode: {mode} | Query Type: {retrieval_meta.get('query_type')}")
        for idx, (chunk, score) in enumerate(retrieved_chunks, 1):
            logger.info(f"   [Chunk #{idx}] Doc: '{chunk.get('document_name')}' | Page: {chunk.get('page_number')} | Section: '{chunk.get('section')}' | Score: {score:.4f}")
        logger.info("=" * 60)

        response = self.generator.generate_answer(
            query=query,
            retrieved_chunks=retrieved_chunks,
            retrieval_meta=retrieval_meta,
            mode=mode,
            recent_history=recent_history
        )

        return response

    def list_documents(self, user_id: str) -> List[Dict[str, Any]]:
        return self.vector_store.list_user_documents(user_id=user_id)

    def delete_document(self, document_id: str, user_id: str) -> bool:
        return self.vector_store.delete_document(document_id=document_id, user_id=user_id)

    def get_document_stats(self, document_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        return self.vector_store.get_document_stats(document_id=document_id, user_id=user_id)


# Global singleton instance
rag_service = RAGService()

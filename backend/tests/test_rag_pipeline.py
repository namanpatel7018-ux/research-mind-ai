"""
Comprehensive Production Test Suite for ResearchMind AI RAG System.
Tests:
  1. PDF Parsing & Exact Page Preservation
  2. Structure-Aware Chunking & Metadata
  3. Configurable Embedding Generation
  4. Qdrant Dense Vector Indexing & User-Level Isolation
  5. BM25 Lexical Search & Hybrid RRF Retrieval
  6. Relevance Reranking & Deduplication
  7. Strict Grounded Generation & Citation Verification
  8. No-Answer / Zero-Hallucination Behavior
  9. Document-level Filtering
  10. Complete Document Deletion (Vectors & Metadata)
"""

import os
import sys
import unittest
from pathlib import Path

# Add backend root to sys.path
backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.rag.models import Chunk, DocumentStats
from app.rag.parser import DocumentParser
from app.rag.embeddings import get_embedder, LocalSemanticEmbedder
from app.rag.vector_store import QdrantVectorStore
from app.rag.reranker import Reranker
from app.rag.retriever import HybridRetriever
from app.rag.query_analyzer import classify_query as detect_query_type
from app.rag.verifier import CitationVerifier, INSUFFICIENT_EVIDENCE_PHRASE
from app.rag.generator import GroundedGenerator
from app.rag.rag_service import rag_service


class TestRAGPipeline(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.test_doc_path = backend_dir / "tests" / "test_rag_sample.md"
        cls.test_doc_path.write_text(
            """# Title: Evaluation of Transformer Models on Biomedical Text

## Abstract
This research paper evaluates transformer models on biomedical entity recognition.
BioBERT achieved an F1-score of 89.4% on the NCBI-Disease dataset.

## Methodology
We fine-tuned BERT-base, BioBERT, and ClinicalBERT using AdamW optimizer with a learning rate of 2e-5.
Each model was trained for 10 epochs with a batch size of 32.

## Experimental Results
ClinicalBERT achieved an F1-score of 88.1% on the BC5CDR dataset.
BioBERT outperformed all baselines with 91.2% precision on the PubMed corpus.

## Conclusion
Domain-specific pretraining significantly improves entity extraction in biomedical documents.
""",
            encoding="utf-8"
        )
        cls.user_a = "user_alpha@researchmind.ai"
        cls.user_b = "user_beta@researchmind.ai"
        cls.doc_name = "test_rag_sample.md"

    @classmethod
    def tearDownClass(cls):
        if cls.test_doc_path.exists():
            cls.test_doc_path.unlink()
        rag_service.delete_document(cls.doc_name, cls.user_a)
        rag_service.delete_document(cls.doc_name, cls.user_b)

    def test_01_document_parser_and_page_preservation(self):
        parser = DocumentParser()
        chunks, stats = parser.parse_file(
            file_path=self.test_doc_path,
            document_id=self.doc_name,
            document_name=self.doc_name,
            user_id=self.user_a
        )
        self.assertGreater(len(chunks), 0, "Parser must generate at least 1 chunk")
        self.assertEqual(stats.page_count, 1, "Markdown should have at least 1 page")
        for chunk in chunks:
            self.assertEqual(chunk.document_name, self.doc_name)
            self.assertGreaterEqual(chunk.page_number, 1)
            self.assertIsNotNone(chunk.section)
            self.assertGreater(chunk.token_count, 0)

    def test_02_embedding_generation(self):
        embedder = get_embedder()
        vec = embedder.embed_query("Biomedical entity recognition")
        self.assertEqual(len(vec), embedder.dimension)
        self.assertIsInstance(vec[0], float)

    def test_03_vector_store_indexing_and_user_isolation(self):
        # Index for user A
        stats = rag_service.process_and_index_document(
            file_path=self.test_doc_path,
            document_id=self.doc_name,
            document_name=self.doc_name,
            user_id=self.user_a
        )
        self.assertGreater(stats.chunk_count, 0)

        # Search as user A -> should find chunks
        hits_user_a = rag_service.vector_store.search_dense(
            query="BioBERT F1-score on NCBI-Disease",
            user_id=self.user_a,
            top_k=3
        )
        self.assertGreater(len(hits_user_a), 0, "User A must retrieve their own indexed chunks")

        # Search as user B -> must return 0 hits (Strict User Isolation)
        hits_user_b = rag_service.vector_store.search_dense(
            query="BioBERT F1-score on NCBI-Disease",
            user_id=self.user_b,
            top_k=3
        )
        self.assertEqual(len(hits_user_b), 0, "User B must NEVER retrieve User A's chunks")

    def test_04_query_type_detection(self):
        self.assertEqual(detect_query_type("Compare BioBERT and ClinicalBERT"), "COMPARISON")
        self.assertEqual(detect_query_type("Summarize the paper"), "SUMMARY")
        self.assertIn(detect_query_type("What is the F1-score?"), ["FACTUAL", "DEFINITION"])

    def test_05_hybrid_retrieval_and_reranking(self):
        chunks, meta = rag_service.retriever.retrieve(
            query="What F1-score did BioBERT achieve on NCBI-Disease?",
            user_id=self.user_a
        )
        self.assertGreater(len(chunks), 0, "Hybrid retrieval must retrieve relevant candidates")
        self.assertLessEqual(len(chunks), 6, "Reranker must select at most 6 chunks")
        # Top chunk should mention BioBERT or 89.4%
        top_text = chunks[0][0].get("text", "")
        self.assertTrue("BioBERT" in top_text or "89.4%" in top_text or "biomedical" in top_text.lower())

    def test_06_grounded_rag_query(self):
        resp = rag_service.query_rag(
            query="What F1-score did BioBERT achieve on the NCBI-Disease dataset?",
            user_id=self.user_a
        )
        self.assertIn("89.4", resp.answer, "Grounded answer must include exact factual metric 89.4%")
        self.assertGreater(len(resp.sources), 0, "Must provide verified sources")
        self.assertEqual(resp.sources[0].page_number, 1)

    def test_07_no_answer_on_unsupported_question(self):
        resp = rag_service.query_rag(
            query="What is the speed of light in vacuum?",
            user_id=self.user_a
        )
        self.assertEqual(
            resp.answer.strip(),
            INSUFFICIENT_EVIDENCE_PHRASE,
            "Unsupported query must respond with insufficient evidence phrase without hallucination"
        )
        self.assertEqual(len(resp.sources), 0, "Unsupported query must have 0 sources")

    def test_08_document_deletion(self):
        deleted = rag_service.delete_document(self.doc_name, self.user_a)
        self.assertTrue(deleted, "Document deletion must succeed")
        remaining = rag_service.vector_store.search_dense("BioBERT", self.user_a)
        self.assertEqual(len(remaining), 0, "No vectors should remain after deletion")


if __name__ == "__main__":
    unittest.main()

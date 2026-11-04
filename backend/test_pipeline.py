import os
import sys
import traceback

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    print("Testing imports...")
    try:
        import app.api.main as main
        import app.api.ai as ai
        import app.api.auth as auth
        import app.services.ai_service as ai_service
        from app.rag.rag_service import rag_service
        from app.rag.embeddings import get_embedder
        from app.rag.vector_store import QdrantVectorStore
        from app.rag.parser import DocumentParser
        from app.rag.reranker import Reranker
        from app.rag.retriever import HybridRetriever
        from app.rag.generator import GroundedGenerator
        print("All imports SUCCESSFUL!")
    except Exception as e:
        print(f"Import ERROR: {e}")
        traceback.print_exc()

def test_ai_generation():
    print("\nTesting AI generation...")
    from app.services import ai_service, TaskType
    try:
        resp = ai_service.generate(
            task_type=TaskType.QUICK_QA,
            system_prompt="You are a helpful assistant.",
            user_prompt="Say 'ResearchMind AI RAG is ready' in 5 words.",
            max_tokens=50
        )
        print(f"AI response provider: {resp.provider}, fallback: {resp.fallback_used}")
        print(f"AI response: {resp.content}")
    except Exception as e:
        print(f"AI generation ERROR: {e}")
        traceback.print_exc()

def test_rag_flow():
    print("\nTesting RAG pipeline indexing and querying...")
    from app.rag.rag_service import rag_service
    from pathlib import Path
    
    # Create sample research doc
    test_doc_path = Path(__file__).parent / "test_paper.txt"
    test_doc_path.write_text("""
Title: Graph Neural Networks in Computational Biology
Abstract:
We present BioGraph, a novel neural architecture for protein folding prediction.
BioGraph achieves a 94.2% accuracy on the CASP14 benchmark dataset.
Section 1: Introduction
Recent advancements in deep learning have revolutionized structural bioinformatics.
Section 2: Results
Our model outperformed AlphaFold baseline on 18 out of 20 target proteins, with an average inference latency of 42 milliseconds.
Section 3: Conclusion
BioGraph demonstrates superior efficiency and accuracy for molecular graph modeling.
""", encoding="utf-8")

    try:
        user_id = "test_user@example.com"
        stats = rag_service.process_and_index_document(
            file_path=test_doc_path,
            document_id="test_paper.txt",
            document_name="test_paper.txt",
            user_id=user_id
        )
        print(f"Document indexed: {stats.chunk_count} chunks, {stats.token_count} tokens")
        
        # Test Query
        query = "What accuracy did BioGraph achieve on CASP14?"
        rag_resp = rag_service.query_rag(
            query=query,
            user_id=user_id,
            document_ids=["test_paper.txt"]
        )
        print(f"Query: {query}")
        # Safe string encoding for Windows console
        safe_answer = rag_resp.answer.encode('ascii', errors='replace').decode('ascii')
        print(f"Answer: {safe_answer}")
        print(f"Sources: {len(rag_resp.sources)} sources found")
        for s in rag_resp.sources:
            safe_ev = s.evidence[:80].encode('ascii', errors='replace').decode('ascii')
            print(f"  - [{s.document_name} Page {s.page_number} ({s.section})]: {safe_ev}")
        print(f"Retrieval: {rag_resp.retrieval.methods}, total retrieved: {rag_resp.retrieval.retrieved_chunks}")
        print("RAG pipeline SUCCESSFUL!")
    except Exception as e:
        print(f"RAG ERROR: {e}")
        traceback.print_exc()
    finally:
        if test_doc_path.exists():
            test_doc_path.unlink()
        rag_service.delete_document("test_paper.txt", "test_user@example.com")

if __name__ == "__main__":
    test_imports()
    test_ai_generation()
    test_rag_flow()

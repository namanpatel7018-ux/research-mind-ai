"""
Live End-to-End RAG Test on Actual User Uploaded Document
"""

import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app.rag.rag_service import rag_service
from app.rag.verifier import INSUFFICIENT_EVIDENCE_PHRASE

def run_live_tests():
    user_id = "researcher@example.com"
    doc_id = "Research_Paper_On_Artificial_Intelligence_And_Its.pdf"
    
    print("\n--- 1. Testing 'What is AI?' on actual document ---")
    resp_ai = rag_service.query_rag(
        query="What is AI?",
        user_id=user_id,
        document_ids=[doc_id],
        mode="strict"
    )
    print(f"Query: {resp_ai.query}")
    print(f"Retrieved Chunks: {resp_ai.retrieval.retrieved_chunks}, Used: {resp_ai.retrieval.used_chunks}")
    print(f"Sources: {[f'{s.document_name} P.{s.page_number}' for s in resp_ai.sources]}")
    print(f"Answer snippet: {resp_ai.answer[:200]}...")
    assert resp_ai.answer.strip() != INSUFFICIENT_EVIDENCE_PHRASE, "Failed: Returned insufficient evidence for 'What is AI?'"
    assert len(resp_ai.sources) > 0, "Failed: No sources cited for 'What is AI?'"
    assert any(s.page_number in [1, 2, 3] for s in resp_ai.sources), "Page citation incorrect"
    print("[PASS] 'What is AI?' retrieved definition and accurate page citations successfully!")

    print("\n--- 2. Testing Unmentioned Query (Negative Test): 'What is the author's mother's name?' ---")
    resp_neg = rag_service.query_rag(
        query="What is the author's mother's name?",
        user_id=user_id,
        document_ids=[doc_id],
        mode="strict"
    )
    print(f"Answer: '{resp_neg.answer}'")
    assert resp_neg.answer.strip() == INSUFFICIENT_EVIDENCE_PHRASE, f"Strict mode failed to fallback! Got: {resp_neg.answer}"
    assert len(resp_neg.sources) == 0, "Strict mode hallucinated sources on negative test!"
    print("[PASS] Strict mode correctly returned insufficient evidence fallback with 0 hallucinations!")

    print("\n--- 3. Testing DeepThink Mode on AI and quantum computing ---")
    resp_dt = rag_service.query_rag(
        query="How does AI compare to quantum computing according to the paper and in modern technology?",
        user_id=user_id,
        document_ids=[doc_id],
        mode="deepthink"
    )
    print(f"DeepThink Provider: {resp_dt.provider}")
    print(f"DeepThink Answer snippet: {resp_dt.answer[:250]}...")
    assert resp_dt.provider == "DeepThink"
    assert "GROQ" not in resp_dt.answer
    assert "Gemini" not in resp_dt.answer
    assert "Claude" not in resp_dt.answer
    print("[PASS] DeepThink mode correctly executed without leaking provider/model names!")

    print("\n==================================================================")
    print("ALL LIVE RAG END-TO-END VERIFICATIONS PASSED 100%!")
    print("==================================================================")

if __name__ == "__main__":
    run_live_tests()

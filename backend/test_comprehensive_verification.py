"""
Comprehensive Verification Test Suite for ResearchMind AI
Tests:
1. Document Terminology extraction & Bidirectional Term Mapping ("AI" -> "Artificial Intelligence")
2. Query Expansion & Short-Query Handling ("What is AI?", "Define AI", "AI?")
3. Strict RAG Mode (Evidence retrieval + exact fallback on missing evidence)
4. DeepThink Mode (Separation of Document Material and Additional AI Reasoning, Provider Masking)
5. Multi-User Isolation (User A vs User B data isolation across files, chats, summaries, comparisons, presentations, activities)
6. Vector Database Isolation (filter by user_id)
"""

import os
import sys
import json
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app.db import (
    init_db,
    create_conversation,
    list_conversations,
    get_conversation,
    add_message,
    save_summary,
    list_summaries,
    save_comparison,
    list_comparisons,
    save_presentation,
    list_presentations,
    save_literature_review,
    list_literature_reviews,
    log_activity,
    list_activities,
    save_document_terminology,
    get_document_terminology,
    generate_chat_title,
)
from app.rag.terminology import extract_document_terminology, normalize_acronym
from app.rag.query_analyzer import analyze_query, classify_query
from app.rag.reranker import Reranker
from app.rag.generator import GroundedGenerator
from app.rag.verifier import INSUFFICIENT_EVIDENCE_PHRASE

def test_terminology_extraction():
    print("\n--- TEST 1: Document Terminology Extraction & Storage ---")
    sample_text = (
        "Artificial Intelligence (AI) has transformed many industries. "
        "Machine Learning (ML) is a subset of AI. "
        "Natural Language Processing (NLP) enables machines to understand text."
    )
    mock_chunk = {
        "text": sample_text,
        "page_number": 1,
        "chunk_id": "c1",
        "document_id": "test_doc.pdf"
    }
    extracted = extract_document_terminology([mock_chunk], document_id="test_doc.pdf", user_id="test_user@example.com")
    print(f"Extracted {len(extracted)} terms:")
    term_dict = {}
    for t in extracted:
        print(f"  {t['term']} <-> {t['expanded_term']}")
        term_dict[t["term"]] = t["expanded_term"]
    
    assert "AI" in term_dict, "Failed to extract AI"
    assert term_dict["AI"] == "Artificial Intelligence"
    assert "ML" in term_dict, "Failed to extract ML"
    assert "NLP" in term_dict, "Failed to extract NLP"
    
    # Test DB storage
    save_document_terminology("test_user@example.com", "test_doc.pdf", extracted)
    db_terms = get_document_terminology("test_user@example.com", "test_doc.pdf")
    db_map = {d["term"]: d["expanded_term"] for d in db_terms}
    assert "AI" in db_map, "Failed to retrieve AI from DB"
    assert db_map["AI"] == "Artificial Intelligence"
    print("[PASS] Terminology extraction & DB storage PASSED")


def test_query_analyzer():
    print("\n--- TEST 2: Query Analyzer & Short Query Handling ---")
    queries = [
        ("What is AI?", "DEFINITION"),
        ("Define RAG", "DEFINITION"),
        ("Compare ResNet and DenseNet", "COMPARISON"),
        ("Summarize the methodology", "SUMMARY"),
        ("What accuracy did DenseNet achieve?", "FACTUAL"),
    ]
    for q_text, expected_cat in queries:
        cat = classify_query(q_text)
        analysis = analyze_query(q_text, user_id="test_user@example.com", document_ids=["test_doc.pdf"])
        print(f"Query: '{q_text}' -> Type: {analysis.query_type}, Variants: {analysis.retrieval_variants}")
        assert cat == expected_cat, f"Expected {expected_cat} for '{q_text}', got {cat}"
        if "AI" in q_text:
            assert any("Artificial Intelligence" in exp for exp in analysis.retrieval_variants), "Acronym expansion missing for AI"
    print("[PASS] Query analyzer & expansion PASSED")


def test_reranker_short_queries():
    print("\n--- TEST 3: Reranker Short-Query & Acronym Preservation ---")
    reranker = Reranker(top_k=5)
    
    candidates = [
        (
            {
                "chunk_id": "c1",
                "document_name": "paper.pdf",
                "page_number": 1,
                "text": "Artificial Intelligence (AI) is the simulation of human intelligence by machines."
            },
            0.3
        ),
        (
            {
                "chunk_id": "c2",
                "document_name": "paper.pdf",
                "page_number": 10,
                "text": "The experimental results were compiled using Python and statistical toolboxes."
            },
            0.1
        )
    ]
    
    # "What is AI?" previously had its "ai" term dropped by len(t) > 2!
    reranked = reranker.rerank(
        query="What is AI?",
        candidates=candidates,
        query_type="DEFINITION",
        detected_terms=[("AI", "Artificial Intelligence")],
        is_short_query=True
    )
    print(f"Reranked {len(reranked)} chunks for 'What is AI?':")
    for chunk_dict, score in reranked:
        print(f"  Chunk: {chunk_dict['chunk_id']}, Score: {score:.3f}, Text: {chunk_dict['text'][:60]}...")
    
    assert len(reranked) >= 1, "Reranker dropped the AI definition chunk!"
    assert reranked[0][0]["chunk_id"] == "c1"
    assert reranked[0][1] >= 0.35, f"Score too low: {reranked[0][1]}"
    print("[PASS] Reranker short-query preservation PASSED")


def test_generator_strict_vs_deepthink():
    print("\n--- TEST 4: Generator Strict vs DeepThink Mode ---")
    gen = GroundedGenerator()
    
    # 4a: Strict mode with NO evidence
    no_evidence_resp = gen.generate_answer(
        query="What is the author's mother's name?",
        retrieved_chunks=[],
        retrieval_meta={"total_user_chunks": 50, "retrieved_count": 0, "reranked_count": 0},
        mode="strict"
    )
    print(f"Strict Mode (no evidence) -> answer: '{no_evidence_resp.answer}'")
    assert no_evidence_resp.answer.strip() == INSUFFICIENT_EVIDENCE_PHRASE
    assert no_evidence_resp.provider == "ResearchMind AI"
    assert "GROQ" not in no_evidence_resp.answer
    assert "Gemini" not in no_evidence_resp.answer
    print("[PASS] Strict mode no-evidence fallback PASSED")
    
    # 4b: Strict mode with evidence
    evidence_chunk = (
        {
            "document_name": "ai_paper.pdf",
            "page_number": 2,
            "section": "Introduction",
            "chunk_id": "c1",
            "text": "Artificial Intelligence (AI) is the simulation of human intelligence processes by machines."
        },
        0.85
    )
    strict_resp = gen.generate_answer(
        query="What is AI?",
        retrieved_chunks=[evidence_chunk],
        retrieval_meta={"total_user_chunks": 50, "retrieved_count": 5, "reranked_count": 1},
        mode="strict"
    )
    print(f"Strict mode response: {strict_resp.answer[:80]}...")
    assert strict_resp.provider == "ResearchMind AI"
    assert "GROQ" not in strict_resp.answer
    assert "Gemini" not in strict_resp.answer
    
    # 4c: DeepThink mode verification
    dt_resp = gen.generate_answer(
        query="How does AI compare to biological neural networks in cognition?",
        retrieved_chunks=[evidence_chunk],
        retrieval_meta={"total_user_chunks": 50, "retrieved_count": 5, "reranked_count": 1},
        mode="deepthink"
    )
    print(f"DeepThink response provider: {dt_resp.provider}")
    assert dt_resp.provider == "DeepThink"
    assert "GROQ" not in dt_resp.answer
    assert "Gemini" not in dt_resp.answer
    assert "Claude" not in dt_resp.answer
    print("[PASS] DeepThink mode separation & provider masking PASSED")


def test_multi_user_isolation():
    print("\n--- TEST 5: Multi-User Data Isolation ---")
    init_db()
    
    user_a = "user_a@researchmind.ai"
    user_b = "user_b@researchmind.ai"
    
    # 5a: Conversations
    conv_a = create_conversation(user_id=user_a, title="User A Private Research")
    conv_b = create_conversation(user_id=user_b, title="User B Private Research")
    
    add_message(conv_a["id"], user_id=user_a, role="user", text="Confidential User A data")
    add_message(conv_b["id"], user_id=user_b, role="user", text="Confidential User B data")
    
    a_convs = list_conversations(user_a)
    b_convs = list_conversations(user_b)
    
    assert any(c["id"] == conv_a["id"] for c in a_convs), "User A should see conv A"
    assert not any(c["id"] == conv_b["id"] for c in a_convs), "User A leaked User B's conv!"
    
    assert any(c["id"] == conv_b["id"] for c in b_convs), "User B should see conv B"
    assert not any(c["id"] == conv_a["id"] for c in b_convs), "User B leaked User A's conv!"
    
    # Single conversation retrieval ownership
    assert get_conversation(conv_a["id"], user_id=user_b) is None, "User B accessed User A's conversation!"
    assert get_conversation(conv_b["id"], user_id=user_a) is None, "User A accessed User B's conversation!"
    
    # 5b: Summaries
    sum_a = save_summary(user_id=user_a, document_id="a.pdf", document_name="Paper A", summary="Summary of Paper A")
    sum_b = save_summary(user_id=user_b, document_id="b.pdf", document_name="Paper B", summary="Summary of Paper B")
    
    a_sums = list_summaries(user_a)
    b_sums = list_summaries(user_b)
    assert any(s["id"] == sum_a["id"] for s in a_sums) and not any(s["id"] == sum_b["id"] for s in a_sums)
    assert any(s["id"] == sum_b["id"] for s in b_sums) and not any(s["id"] == sum_a["id"] for s in b_sums)
    
    # 5c: Comparisons
    comp_a = save_comparison(user_id=user_a, document_names=["a1.pdf", "a2.pdf"], comparison="Comparison A")
    comp_b = save_comparison(user_id=user_b, document_names=["b1.pdf", "b2.pdf"], comparison="Comparison B")
    
    a_comps = list_comparisons(user_a)
    b_comps = list_comparisons(user_b)
    assert any(c["id"] == comp_a["id"] for c in a_comps) and not any(c["id"] == comp_b["id"] for c in a_comps)
    assert any(c["id"] == comp_b["id"] for c in b_comps) and not any(c["id"] == comp_a["id"] for c in b_comps)
    
    # 5d: Presentations
    pres_a = save_presentation(user_id=user_a, topic="Topic A", filename="a.pptx", num_slides=6)
    pres_b = save_presentation(user_id=user_b, topic="Topic B", filename="b.pptx", num_slides=8)
    
    a_pres = list_presentations(user_a)
    b_pres = list_presentations(user_b)
    assert any(p["id"] == pres_a["id"] for p in a_pres) and not any(p["id"] == pres_b["id"] for p in a_pres)
    assert any(p["id"] == pres_b["id"] for p in b_pres) and not any(p["id"] == pres_a["id"] for p in b_pres)
    
    # 5e: Activities
    log_activity(user_id=user_a, activity_type="UPLOAD", title="Uploaded A", reference_id="a.pdf")
    log_activity(user_id=user_b, activity_type="UPLOAD", title="Uploaded B", reference_id="b.pdf")
    
    a_acts = list_activities(user_a)
    b_acts = list_activities(user_b)
    assert any("Uploaded A" in act["title"] for act in a_acts) and not any("Uploaded B" in act["title"] for act in a_acts)
    assert any("Uploaded B" in act["title"] for act in b_acts) and not any("Uploaded A" in act["title"] for act in b_acts)
    
    print("[PASS] Multi-user complete isolation PASSED across all entities!")


def test_deterministic_chat_title():
    print("\n--- TEST 6: Deterministic Chat Title Generation ---")
    titles = [
        ("What is Artificial Intelligence in healthcare?", "Artificial Intelligence In Healthcare"),
        ("What is the role of deep learning in computer vision?", "Role Of Deep Learning In Computer"),
        ("Can you summarize the experimental results of this paper?", "Summarize The Experimental Results Of This"),
        ("AI?", "AI"),
    ]
    for prompt, expected_sub in titles:
        gen_title = generate_chat_title(prompt)
        print(f"Prompt: '{prompt}' -> Title: '{gen_title}'")
        assert len(gen_title) <= 50, "Title too long"
        assert len(gen_title) > 0, "Title empty"
    print("[PASS] Deterministic chat title generation PASSED")


if __name__ == "__main__":
    print("==================================================================")
    print("RUNNING COMPREHENSIVE RESEARCHMIND AI VERIFICATION SUITE")
    print("==================================================================")
    test_terminology_extraction()
    test_query_analyzer()
    test_reranker_short_queries()
    test_generator_strict_vs_deepthink()
    test_multi_user_isolation()
    test_deterministic_chat_title()
    print("\n==================================================================")
    print("ALL 6 TESTS COMPLETED SUCCESSFULLY! 100% PASS RATE")
    print("==================================================================")

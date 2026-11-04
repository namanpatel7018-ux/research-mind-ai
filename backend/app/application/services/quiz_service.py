"""
ResearchMind AI — Quiz Application Service
==========================================
Manages interactive exam question retrieval, AI question generation,
quiz submission evaluation, scoring, and history tracking.
"""

import re
import json
from typing import List, Dict, Any, Optional

from app.core.exceptions import ValidationError
from app.domain.entities.quiz import QuizSubmission, QuizQuestion
from app.domain.interfaces.repositories import IQuizRepository, IUserRepository, IActivityRepository
from app.infrastructure.database.repositories.sqlite_quiz_repository import SQLiteQuizRepository
from app.infrastructure.database.repositories.sqlite_user_repository import JsonUserRepository
from app.infrastructure.database.repositories.sqlite_research_repository import SQLiteActivityRepository
from app.application.services.document_service import DocumentService, document_service
from app.services import ai_service, TaskType

SAMPLE_QUIZ_QUESTIONS = [
    {
        "id": 1,
        "subtitle": "Attention Mechanisms & Transformers",
        "question": "In the standard Transformer architecture (Vaswani et al., 2017), what is the computational complexity of the scaled dot-product self-attention mechanism with respect to sequence length n?",
        "options": [
            "O(n) linear complexity",
            "O(n²) quadratic complexity",
            "O(n log n) quasilinear complexity",
            "O(1) constant complexity"
        ],
        "correctAnswerIndex": 1,
        "marks": 1,
        "explanation": "Standard self-attention computes an n × n attention matrix comparing every token against every other token, resulting in O(n²) time and memory complexity with sequence length n."
    },
    {
        "id": 2,
        "subtitle": "RAG & Neural Reranking",
        "question": "Why are Cross-Encoder rerankers typically used as a second stage after Bi-Encoder vector retrieval rather than replacing the initial retrieval stage entirely?",
        "options": [
            "Cross-Encoders cannot compute semantic similarity scores",
            "Bi-Encoders produce superior quality rankings but require pre-filtering",
            "Cross-Encoders attend across query and candidate tokens jointly, yielding higher precision but too computationally expensive for million-scale searches",
            "Bi-Encoders require GPU hardware while Cross-Encoders can only execute on CPU"
        ],
        "correctAnswerIndex": 2,
        "marks": 1,
        "explanation": "Bi-encoders encode queries and documents independently for fast ANN vector search via pre-computed embeddings. Cross-encoders process query and candidate jointly with full cross-attention, which provides superior scoring precision but is computationally prohibitive across millions of documents."
    },
    {
        "id": 3,
        "subtitle": "Neural Network Regularization",
        "question": "Which regularization technique randomly sets a fraction of neuron activations to 0 at each training step to prevent complex co-adaptation of feature detectors?",
        "options": [
            "Batch Normalization",
            "Gradient Clipping",
            "Dropout",
            "Label Smoothing"
        ],
        "correctAnswerIndex": 2,
        "marks": 1,
        "explanation": "Dropout randomly zeroes out activations during forward training passes with probability p, preventing interdependent co-adaptations and behaving like an ensemble of thinned sub-networks."
    },
    {
        "id": 4,
        "subtitle": "Vector Semantics & Distance Metrics",
        "question": "When dense vector embeddings are normalized to unit Euclidean length (L2 norm = 1), cosine similarity between vectors u and v is algebraically identical to which operation?",
        "options": [
            "Euclidean distance divided by 2",
            "The standard dot product (u · v)",
            "The Manhattan L1 norm (|u - v|)",
            "The Jaccard index of their token sets"
        ],
        "correctAnswerIndex": 1,
        "marks": 1,
        "explanation": "Cosine similarity is defined as (u · v) / (||u|| * ||v||). When vectors are unit-normalized (||u|| = ||v|| = 1), the denominator equals 1, making cosine similarity directly equal to the dot product."
    },
    {
        "id": 5,
        "subtitle": "Domain-Specific Foundation Models",
        "question": "How was BioBERT (Lee et al.) initialized and trained compared to the original general-domain BERT model?",
        "options": [
            "Trained from scratch purely on Wikipedia and BookCorpus",
            "Initialized from general BERT weights and continuously pre-trained on PubMed biomedical abstracts and PMC full-text articles",
            "Trained exclusively using rule-based medical ontologies without neural weights",
            "Trained with recurrent LSTM memory cells on clinical notes"
        ],
        "correctAnswerIndex": 1,
        "marks": 1,
        "explanation": "BioBERT takes pre-trained general BERT checkpoints and performs domain-specific continuous masked language model pre-training on PubMed biomedical abstracts and PMC full-text articles."
    },
    {
        "id": 6,
        "subtitle": "Autoregressive LLM Decoding",
        "question": "What effect does setting temperature T close to 0 have on the softmax probability distribution during LLM next-token generation?",
        "options": [
            "It flattens the distribution toward equal uniform probabilities for all vocabulary tokens",
            "It causes the model to sample tokens purely at random",
            "It sharpens the distribution, collapsing it toward greedy deterministic argmax token selection",
            "It disables the attention layers and halts token generation"
        ],
        "correctAnswerIndex": 2,
        "marks": 1,
        "explanation": "Dividing logits by temperature T scales differences; as T approaches 0, the logit for the top token exponentially dominates the softmax distribution, yielding deterministic greedy decoding."
    },
    {
        "id": 7,
        "subtitle": "Deep Learning Optimization",
        "question": "Why did deep neural networks using standard Sigmoid activation functions frequently suffer from the vanishing gradient problem during backpropagation?",
        "options": [
            "The derivative of the standard Sigmoid function peaks at only 0.25, causing error signals to exponentially diminish across successive layers",
            "Sigmoid outputs are unbounded, leading to arithmetic overflow",
            "Sigmoid derivatives equal zero for all non-negative inputs",
            "Sigmoid prevents weights from being updated by using non-differentiable step functions"
        ],
        "correctAnswerIndex": 0,
        "marks": 1,
        "explanation": "The derivative of the logistic sigmoid σ(z) is σ(z)(1 - σ(z)), which has a maximum value of 0.25. Repeatedly multiplying gradients by values ≤ 0.25 across many layers causes the error gradient to vanish toward zero."
    },
    {
        "id": 8,
        "subtitle": "RAG Document Ingestion & Chunking",
        "question": "Why is semantic chunking with overlapping boundaries (e.g., 500 tokens with 50-token overlap) widely preferred over naive fixed-character splitting without overlap?",
        "options": [
            "Overlap guarantees that vector indexes require zero memory",
            "Overlap prevents critical contextual meaning and entity references from being severed across arbitrary boundary splits",
            "Overlap forces the retriever to return only duplicate passages",
            "Overlap eliminates the need for tokenizers or embeddings"
        ],
        "correctAnswerIndex": 1,
        "marks": 1,
        "explanation": "Boundary overlap preserves sentence coherence and relational context across adjacent segments, ensuring that facts or entity mentions split near a boundary still retain complete context in at least one retrieved chunk."
    },
    {
        "id": 9,
        "subtitle": "Hybrid Search & Rank Fusion",
        "question": "In hybrid retrieval systems combining sparse BM25 keyword search with dense vector search, what is the primary advantage of Reciprocal Rank Fusion (RRF)?",
        "options": [
            "It compresses 1536-dimensional vectors into binary hashes",
            "It combines rank positions from multiple distinct retrieval algorithms into a unified score without requiring calibrated raw score normalization",
            "It translates foreign language documents into English",
            "It replaces the vector database with an SQL database"
        ],
        "correctAnswerIndex": 1,
        "marks": 1,
        "explanation": "RRF calculates a unified rank score based on 1 / (k + rank_i) across different retrieval algorithms (dense vector + sparse BM25), providing a robust combination that does not suffer from incompatible raw score distributions."
    },
    {
        "id": 10,
        "subtitle": "LLM Faithfulness & Grounding",
        "question": "Which architectural constraint in modern RAG systems most effectively minimizes parametric hallucination in scientific question answering?",
        "options": [
            "Increasing the generation temperature to 1.5",
            "Omitting source document citations from the prompt to avoid bias",
            "Constraining the generation prompt to strict evidence extraction with verbatim source attribution and explicit 'not found' refusal thresholds",
            "Using smaller 100M parameter models without fine-tuning"
        ],
        "correctAnswerIndex": 2,
        "marks": 1,
        "explanation": "System instructions that strictly ground the generation within retrieved context snippets, enforce verbatim citation attribution, and set a relevance cutoff threshold prevent the model from relying on noisy internal parametric priors when evidence is missing."
    }
]


class QuizService:
    def __init__(
        self,
        quiz_repo: Optional[IQuizRepository] = None,
        user_repo: Optional[IUserRepository] = None,
        activity_repo: Optional[IActivityRepository] = None,
        doc_service: Optional[DocumentService] = None,
    ):
        self.quiz_repo = quiz_repo or SQLiteQuizRepository()
        self.user_repo = user_repo or JsonUserRepository()
        self.activity_repo = activity_repo or SQLiteActivityRepository()
        self.doc_service = doc_service or document_service

    def get_sample_questions(self) -> Dict[str, Any]:
        return {
            "title": "Artificial Intelligence & Research Systems Examination",
            "total": len(SAMPLE_QUIZ_QUESTIONS),
            "questions": SAMPLE_QUIZ_QUESTIONS
        }

    def submit_quiz_result(
        self,
        user_id: str,
        score: int,
        total: int,
        answers: Optional[List[Any]] = None,
        percentage: Optional[float] = None,
        passed: Optional[bool] = None,
        topic: Optional[str] = None,
        time_spent_seconds: Optional[int] = None
    ) -> Dict[str, Any]:
        tot = max(1, total)
        sc = max(0, min(score, tot))
        pct = percentage if percentage is not None else round((sc / tot) * 100, 1)
        pass_status = passed if passed is not None else (pct >= 40.0)
        t_topic = topic or "General Assessment"
        t_seconds = time_spent_seconds or 0

        record = self.quiz_repo.create_submission(
            user_id=user_id,
            score=sc,
            total=tot,
            percentage=pct,
            passed=pass_status,
            topic=t_topic,
            time_spent_seconds=t_seconds,
            answers=answers or []
        )

        self.activity_repo.log(
            user_id=user_id,
            activity_type="QUIZ_COMPLETED",
            title=f"Completed Quiz ({sc}/{tot} - {pct:.0f}%)",
            reference_id=record.id,
            metadata={"score": sc, "total": tot, "passed": pass_status, "topic": t_topic}
        )

        # Update user profile if JsonUserRepository supports it
        if hasattr(self.user_repo, "add_quiz_record"):
            self.user_repo.add_quiz_record(user_id, {
                "id": record.id,
                "score": sc,
                "total": tot,
                "percentage": pct,
                "passed": pass_status,
                "topic": t_topic,
                "created_at": record.created_at
            })

        return {
            "status": "success",
            "message": "Quiz result saved successfully",
            "submissionId": record.id,
            "userId": user_id,
            "score": sc,
            "total": tot,
            "percentage": pct,
            "passed": pass_status,
            "topic": record.topic,
            "timeSpentSeconds": record.time_spent_seconds,
            "createdAt": record.created_at
        }

    def get_quiz_history(self, user_id: str, limit: int = 20) -> List[QuizSubmission]:
        return self.quiz_repo.list_submissions(user_id, limit=limit)

    def generate_quiz_json(
        self,
        topic: str,
        user_id: str,
        filename: Optional[str] = None,
        num_questions: int = 10
    ) -> Dict[str, Any]:
        n = max(3, min(num_questions, 50))
        source_block = ""
        if filename:
            text = self.doc_service.get_document_text(filename, user_id)
            if text:
                source_block = f"\n\nSource document ({filename}):\n{text[:10000]}"

        system = (
            "You are an expert academic exam setter. "
            "Output ONLY a valid JSON object — no prose, no markdown fences. "
            "Return: {\"title\": \"short quiz title\", \"questions\": [...]} "
            "Each question object: "
            "{\"subtitle\": \"topic label\", \"question\": \"full question text\", "
            "\"options\": [\"option text\", \"option text\", \"option text\", \"option text\"], "
            "\"correct\": \"A\", "
            "\"explanation\": \"2-3 sentence AI analysis explaining why the correct answer is right and why others are wrong\"} "
            "options must be exactly 4 strings (no A/B/C/D labels inside). "
            "correct is the letter A, B, C, or D. "
            "Questions must be interview-ready, diverse, and clear."
        )
        user_msg = f"Create exactly {n} MCQ questions on: \"{topic}\".{source_block}\n\nReturn ONLY the JSON object."

        data, ai_resp = ai_service.generate_json(
            task_type=TaskType.QUIZ,
            system_prompt=system,
            user_prompt=user_msg,
            expected_type=dict,
            context_size=len(source_block)
        )
        return data


quiz_service = QuizService()

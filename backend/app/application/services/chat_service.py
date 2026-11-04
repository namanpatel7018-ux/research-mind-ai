"""
ResearchMind AI — Chat Application Service
==========================================
Coordinates conversations, messages, deterministic title generation,
and execution of strict RAG / DeepThink queries.
"""

import re
from typing import Optional, List, Dict, Any

from app.domain.entities.conversation import Conversation, Message
from app.domain.interfaces.repositories import IConversationRepository, IActivityRepository
from app.infrastructure.database.repositories.sqlite_conversation_repository import SQLiteConversationRepository
from app.infrastructure.database.repositories.sqlite_research_repository import SQLiteActivityRepository
from app.rag.rag_service import RAGService, rag_service


class ChatService:
    def __init__(
        self,
        conversation_repo: Optional[IConversationRepository] = None,
        activity_repo: Optional[IActivityRepository] = None,
        rag: Optional[RAGService] = None,
    ):
        self.conversation_repo = conversation_repo or SQLiteConversationRepository()
        self.activity_repo = activity_repo or SQLiteActivityRepository()
        self.rag = rag or rag_service

    @staticmethod
    def generate_chat_title(first_prompt: str) -> str:
        """Deterministic title extraction without unnecessary LLM calls."""
        cleaned = first_prompt.strip()
        cleaned = re.sub(
            r"^(what\s+is|what\s+are|explain|define|tell\s+me\s+about|summarize|can\s+you\s+explain|how\s+does|how\s+do)\s+",
            "",
            cleaned,
            flags=re.IGNORECASE
        ).strip(" ?.,!;:")
        if not cleaned:
            cleaned = first_prompt.strip(" ?.,!;:")
        words = cleaned.split()
        if len(words) > 6:
            words = words[:6]
        title = " ".join(words).strip()
        return title.capitalize() if title else "Research Chat"

    def list_conversations(self, user_id: str) -> List[Conversation]:
        return self.conversation_repo.list_by_user(user_id)

    def create_conversation(self, user_id: str, title: Optional[str] = None, active_file: Optional[str] = None, mode: str = "strict") -> Conversation:
        t = title or "New Research Chat"
        return self.conversation_repo.create(user_id=user_id, title=t, active_file=active_file, mode=mode)

    def get_conversation(self, conv_id: str, user_id: str) -> Optional[Conversation]:
        return self.conversation_repo.get_by_id(conv_id, user_id)

    def update_title(self, conv_id: str, user_id: str, title: str) -> bool:
        return self.conversation_repo.update_title(conv_id, user_id, title)

    def delete_conversation(self, conv_id: str, user_id: str) -> bool:
        return self.conversation_repo.delete(conv_id, user_id)

    def execute_chat(
        self,
        prompt: str,
        user_id: str,
        conversation_id: Optional[str] = None,
        filename: Optional[str] = None,
        filenames: Optional[List[str]] = None,
        recent_history: Optional[List[Dict[str, str]]] = None,
        mode: str = "strict"
    ) -> Dict[str, Any]:
        """
        Processes a chat query: resolves conversation, stores user prompt,
        runs RAG pipeline, stores AI answer, logs activity, and returns payload.
        """
        conv_id = conversation_id
        if conv_id:
            existing = self.conversation_repo.get_by_id(conv_id, user_id)
            if not existing:
                conv_id = None

        if not conv_id:
            title = self.generate_chat_title(prompt)
            new_conv = self.conversation_repo.create(user_id, title=title, active_file=filename, mode=mode)
            conv_id = new_conv.id

        # Persist user message
        self.conversation_repo.add_message(
            conversation_id=conv_id,
            user_id=user_id,
            role="user",
            text=prompt,
            mode=mode
        )

        doc_ids = None
        if filename:
            doc_ids = [filename]
        elif filenames:
            doc_ids = filenames

        # Check if user has any documents indexed
        user_docs = self.rag.list_documents(user_id=user_id)
        if not user_docs and mode != "deepthink":
            ans = "Please upload a document to your library first. ResearchMind AI answers questions strictly grounded in your provided documents and research material."
            self.conversation_repo.add_message(
                conversation_id=conv_id,
                user_id=user_id,
                role="ai",
                text=ans,
                mode=mode,
                provider="ResearchMind AI"
            )
            return {
                "query": prompt,
                "answer": ans,
                "sources": [],
                "retrieval": {
                    "total_chunks": 0,
                    "retrieved_chunks": 0,
                    "reranked_chunks": 0,
                    "used_chunks": 0,
                    "query_type": "DOCUMENT_SEARCH",
                    "methods": ["User Document Verification"]
                },
                "usage": {"input_tokens": 0, "output_tokens": 20, "total_tokens": 20, "latency_ms": 0.0},
                "used_chunks_detail": [],
                "provider": "ResearchMind AI",
                "conversation_id": conv_id,
            }

        # Execute grounded RAG pipeline
        rag_resp = self.rag.query_rag(
            query=prompt,
            user_id=user_id,
            document_ids=doc_ids,
            recent_history=recent_history,
            mode=mode
        )

        sources_payload = [s.model_dump() for s in rag_resp.sources]
        retrieval_payload = rag_resp.retrieval.model_dump()
        usage_payload = rag_resp.usage.model_dump()
        used_chunks_payload = [c.model_dump() for c in rag_resp.used_chunks_detail]

        # Persist AI response
        self.conversation_repo.add_message(
            conversation_id=conv_id,
            user_id=user_id,
            role="ai",
            text=rag_resp.answer,
            mode=mode,
            provider=rag_resp.provider,
            sources=sources_payload,
            retrieval=retrieval_payload,
            usage=usage_payload,
            used_chunks_detail=used_chunks_payload
        )

        self.activity_repo.log(user_id, "CHAT", f"Asked: {prompt[:45]}", conv_id)

        return {
            "query": rag_resp.query,
            "answer": rag_resp.answer,
            "sources": sources_payload,
            "retrieval": retrieval_payload,
            "usage": usage_payload,
            "used_chunks_detail": used_chunks_payload,
            "provider": rag_resp.provider,
            "fallback_used": False,
            "conversation_id": conv_id,
        }


chat_service = ChatService()

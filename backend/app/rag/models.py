from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class Chunk(BaseModel):
    chunk_id: str
    document_id: str
    document_name: str
    user_id: str
    page_number: int
    section: str = "General"
    chunk_index: int
    text: str
    token_count: int
    bbox: Optional[List[float]] = None
    chunk_type: str = "content"  # "content", "document_summary", "section_summary", "glossary"

    @property
    def section_title(self) -> str:
        return self.section

    def to_payload(self) -> Dict[str, Any]:
        return {
            "chunk_id": self.chunk_id,
            "document_id": self.document_id,
            "document_name": self.document_name,
            "user_id": self.user_id,
            "page_number": self.page_number,
            "section": self.section,
            "section_title": self.section,
            "chunk_index": self.chunk_index,
            "text": self.text,
            "token_count": self.token_count,
            "bbox": self.bbox,
            "chunk_type": self.chunk_type,
        }



class DocumentStats(BaseModel):
    document_id: str
    document_name: str
    page_count: int
    chunk_count: int
    character_count: int
    token_count: int
    processing_time_ms: float
    indexed_at: str


class CitationSource(BaseModel):
    document_id: str
    document_name: str
    page_number: int
    section: str = "General"
    chunk_id: str
    evidence: str
    bbox: Optional[List[float]] = None


class RetrievalStats(BaseModel):
    total_chunks: int = 0
    retrieved_chunks: int = 0
    reranked_chunks: int = 0
    used_chunks: int = 0
    query_type: str = "FACTUAL"
    methods: List[str] = Field(default_factory=lambda: [
        "Dense Semantic Search",
        "BM25 Lexical Search",
        "Hybrid RRF Fusion",
        "Relevance Reranking"
    ])


class UsageStats(BaseModel):
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    latency_ms: float = 0.0


class UsedChunkDetail(BaseModel):
    chunk_id: str
    document_name: str
    page_number: int
    section: str
    score: float
    text_snippet: str
    bbox: Optional[List[float]] = None


class RAGQueryResponse(BaseModel):
    query: str
    answer: str
    sources: List[CitationSource] = Field(default_factory=list)
    retrieval: RetrievalStats = Field(default_factory=RetrievalStats)
    usage: UsageStats = Field(default_factory=UsageStats)
    used_chunks_detail: List[UsedChunkDetail] = Field(default_factory=list)
    provider: Optional[str] = None
    fallback_used: Optional[bool] = None

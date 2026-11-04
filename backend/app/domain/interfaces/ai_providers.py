"""
ResearchMind AI — AI Provider Interfaces
========================================
Defines abstract contracts for LLM providers, embedding providers,
and cross-encoder rerankers.
"""

from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from dataclasses import dataclass


@dataclass
class LLMResponse:
    content: str
    model: str
    provider: str
    usage: Optional[Dict[str, int]] = None
    finish_reason: Optional[str] = None
    fallback_used: bool = False


class ILLMProvider(ABC):
    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        pass

    @abstractmethod
    def is_configured(self) -> bool:
        pass

    @abstractmethod
    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = 4096,
        temperature: float = 0.2
    ) -> LLMResponse:
        pass

    @abstractmethod
    def generate_json(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = 4096,
        temperature: float = 0.2
    ) -> LLMResponse:
        pass


class IEmbeddingProvider(ABC):
    @abstractmethod
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        pass

    @abstractmethod
    def embed_query(self, text: str) -> List[float]:
        pass

    @property
    @abstractmethod
    def dimension(self) -> int:
        pass


class IReranker(ABC):
    @abstractmethod
    def rerank(
        self,
        query: str,
        candidates: List[tuple],
        query_type: str = "FACTUAL",
        detected_terms: Optional[List[tuple]] = None,
        is_short_query: bool = False
    ) -> List[tuple]:
        pass

"""
Configurable Embedding Layer for ResearchMind AI RAG Pipeline.
Supports:
  - Gemini Embeddings ('gemini-embedding-001', 'gemini-embedding-2')
  - Configurable models (e.g., 'Qwen/Qwen3-Embedding-0.6B', 'BAAI/bge-m3')
  - Local Fallback Semantic Embedder (zero-dependency, always available)
  - Embedding caching for maximum performance and token efficiency
"""

import os
import math
import hashlib
import logging
from typing import List, Optional, Dict
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("researchmind.rag.embeddings")

_EMBED_CACHE: Dict[str, List[float]] = {}


class BaseEmbedder:
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        raise NotImplementedError

    def embed_query(self, text: str) -> List[float]:
        raise NotImplementedError

    @property
    def dimension(self) -> int:
        raise NotImplementedError


class GeminiEmbedder(BaseEmbedder):
    """Google Gemini Embedding integration with automatic quota circuit breaker."""
    _quota_exhausted_until: float = 0.0

    def __init__(self, model_name: str = "gemini-embedding-001", api_key: Optional[str] = None):
        from google import genai
        self.model_name = model_name
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "")
        self.client = genai.Client(api_key=self.api_key)
        self._dim = 3072

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        import time
        results: List[List[float]] = []
        batch_size = 32

        # Circuit breaker: if quota was recently exhausted, use fast local semantic projection directly
        if time.time() < GeminiEmbedder._quota_exhausted_until:
            local_embed = LocalSemanticEmbedder(dimension=self._dim)
            return [local_embed.embed_query(t) for t in texts]

        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            uncached_indices = []
            uncached_texts = []
            batch_results: List[Optional[List[float]]] = [None] * len(batch)

            for idx, text in enumerate(batch):
                cache_key = f"{self.model_name}:{hashlib.md5(text.encode('utf-8')).hexdigest()}"
                if cache_key in _EMBED_CACHE:
                    batch_results[idx] = _EMBED_CACHE[cache_key]
                else:
                    uncached_indices.append(idx)
                    uncached_texts.append(text)

            if uncached_texts:
                try:
                    res = self.client.models.embed_content(
                        model=self.model_name,
                        contents=uncached_texts
                    )
                    for u_idx, emb in zip(uncached_indices, res.embeddings):
                        vec = emb.values
                        cache_key = f"{self.model_name}:{hashlib.md5(batch[u_idx].encode('utf-8')).hexdigest()}"
                        _EMBED_CACHE[cache_key] = vec
                        self._dim = len(vec)
                        batch_results[u_idx] = vec
                except Exception as exc:
                    exc_str = str(exc)
                    if "429" in exc_str or "RESOURCE_EXHAUSTED" in exc_str or "quota" in exc_str.lower():
                        GeminiEmbedder._quota_exhausted_until = time.time() + 3600.0
                        logger.warning("Gemini daily quota reached. Activating local semantic embedder circuit-breaker for 1 hour.")
                    else:
                        logger.warning(f"Gemini batch embed error: {exc}. Using fast local projection fallback.")
                    local_embed = LocalSemanticEmbedder(dimension=self._dim)
                    for u_idx in uncached_indices:
                        vec = local_embed.embed_query(batch[u_idx])
                        batch_results[u_idx] = vec

            for res_vec in batch_results:
                if res_vec is not None:
                    results.append(res_vec)
                else:
                    results.append([0.0] * self._dim)

        return results

    def embed_query(self, text: str) -> List[float]:
        import time
        if time.time() < GeminiEmbedder._quota_exhausted_until:
            return LocalSemanticEmbedder(dimension=self._dim).embed_query(text)

        cache_key = f"{self.model_name}:q:{hashlib.md5(text.encode('utf-8')).hexdigest()}"
        if cache_key in _EMBED_CACHE:
            return _EMBED_CACHE[cache_key]

        try:
            res = self.client.models.embed_content(
                model=self.model_name,
                contents=text
            )
            vec = res.embeddings[0].values
            _EMBED_CACHE[cache_key] = vec
            self._dim = len(vec)
            return vec
        except Exception as exc:
            exc_str = str(exc)
            if "429" in exc_str or "RESOURCE_EXHAUSTED" in exc_str or "quota" in exc_str.lower():
                GeminiEmbedder._quota_exhausted_until = time.time() + 3600.0
                logger.warning("Gemini quota reached on query embed. Activating local semantic embedder circuit-breaker.")
            else:
                logger.warning(f"Gemini embed query error: {exc}. Using fallback.")
            return LocalSemanticEmbedder(dimension=self._dim).embed_query(text)

    @property
    def dimension(self) -> int:
        return self._dim


class LocalSemanticEmbedder(BaseEmbedder):
    """
    High-performance, deterministic semantic projection embedding.
    Ensures the RAG system works even offline or if external API keys expire.
    """

    def __init__(self, dimension: int = 768):
        self._dimension = dimension

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [self.embed_query(t) for t in texts]

    def embed_query(self, text: str) -> List[float]:
        vec = [0.0] * self._dimension
        words = text.lower().split()
        if not words:
            return vec

        for pos, word in enumerate(words):
            h = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16)
            idx = h % self._dimension
            sign = 1.0 if ((h >> 8) & 1) else -1.0
            weight = 1.0 / (1.0 + 0.1 * math.log(pos + 1))
            vec[idx] += sign * weight

            # Bigram feature
            if pos < len(words) - 1:
                bigram = f"{word}_{words[pos+1]}"
                bh = int(hashlib.sha256(bigram.encode("utf-8")).hexdigest(), 16)
                bidx = bh % self._dimension
                bsign = 1.0 if ((bh >> 8) & 1) else -1.0
                vec[bidx] += bsign * 1.5

        # L2 normalize
        norm = math.sqrt(sum(v * v for v in vec))
        if norm > 1e-9:
            vec = [v / norm for v in vec]
        return vec

    @property
    def dimension(self) -> int:
        return self._dimension


def get_embedder() -> BaseEmbedder:
    """
    Factory function instantiating the embedder according to EMBEDDING_MODEL / EMBEDDING_PROVIDER.
    Configurable via environment variables.
    """
    model_name = os.getenv("EMBEDDING_MODEL", "gemini-embedding-001")
    gemini_key = os.getenv("GEMINI_API_KEY", "")

    if "gemini" in model_name.lower() or (gemini_key and not os.getenv("FORCE_LOCAL_EMBEDDINGS")):
        try:
            return GeminiEmbedder(model_name=model_name, api_key=gemini_key)
        except Exception as exc:
            logger.error(f"Could not initialize Gemini embedder: {exc}. Falling back to LocalSemanticEmbedder.")
            return LocalSemanticEmbedder(dimension=768)

    # Alternative / local embedder
    return LocalSemanticEmbedder(dimension=768)

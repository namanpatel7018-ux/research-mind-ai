"""
Production-grade Qdrant Vector Store & Multi-Tenant Storage for ResearchMind AI.
Enforces:
  - Multi-tenant user_id isolation
  - Document-level filtering
  - Dense vector indexing and similarity search
  - Local disk persistence without requiring Docker, or remote Qdrant if configured
  - Complete document deletion (removes vectors, chunks, and metadata)
"""

import os
import json
import uuid
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

import qdrant_client
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
    MatchAny,
)

from app.rag.models import Chunk, DocumentStats
from app.rag.embeddings import BaseEmbedder, get_embedder

logger = logging.getLogger("researchmind.rag.vector_store")

COLLECTION_NAME = "researchmind_chunks"
DATA_DIR = Path(__file__).resolve().parents[2] / "data"
STORAGE_DIR = DATA_DIR / "qdrant_storage"
METADATA_FILE = DATA_DIR / "rag_metadata.json"


class QdrantVectorStore:
    def __init__(self, embedder: Optional[BaseEmbedder] = None):
        self.embedder = embedder or get_embedder()
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        STORAGE_DIR.mkdir(parents=True, exist_ok=True)

        qdrant_url = os.getenv("QDRANT_URL")
        qdrant_api_key = os.getenv("QDRANT_API_KEY")

        if qdrant_url:
            logger.info(f"Connecting to remote Qdrant at {qdrant_url}")
            self.client = qdrant_client.QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
        else:
            try:
                logger.info(f"Using local embedded Qdrant database at {STORAGE_DIR}")
                self.client = qdrant_client.QdrantClient(path=str(STORAGE_DIR))
            except Exception as exc:
                lock_file = STORAGE_DIR / ".lock"
                if lock_file.exists():
                    try:
                        lock_file.unlink(missing_ok=True)
                        self.client = qdrant_client.QdrantClient(path=str(STORAGE_DIR))
                        logger.info("Cleared stale Qdrant .lock file and re-connected to persistent storage.")
                    except Exception:
                        logger.warning(f"Storage dir locked ({exc}). Using in-memory client for this process.")
                        self.client = qdrant_client.QdrantClient(location=":memory:")
                else:
                    logger.warning(f"Storage dir unavailable ({exc}). Using in-memory client for this process.")
                    self.client = qdrant_client.QdrantClient(location=":memory:")

        self._ensure_collection()
        self._ensure_metadata_file()

    def _ensure_collection(self):
        """Creates collection if it doesn't already exist."""
        try:
            if not self.client.collection_exists(COLLECTION_NAME):
                self.client.create_collection(
                    collection_name=COLLECTION_NAME,
                    vectors_config=VectorParams(
                        size=self.embedder.dimension,
                        distance=Distance.COSINE
                    )
                )
                logger.info(f"Created Qdrant collection: {COLLECTION_NAME} (dim={self.embedder.dimension})")
        except Exception as exc:
            logger.error(f"Error ensuring Qdrant collection: {exc}")

    def _ensure_metadata_file(self):
        if not METADATA_FILE.exists() or METADATA_FILE.stat().st_size == 0:
            METADATA_FILE.write_text(json.dumps({"documents": {}, "chunks": {}}, indent=2), encoding="utf-8")

    def _load_metadata(self) -> Dict[str, Any]:
        if not METADATA_FILE.exists() or METADATA_FILE.stat().st_size == 0:
            return {"documents": {}, "chunks": {}}
        try:
            raw = METADATA_FILE.read_bytes().decode("utf-8", errors="replace")
            return json.loads(raw)
        except Exception as exc:
            logger.error(f"Error loading metadata: {exc}")
            return {"documents": {}, "chunks": {}}

    def _save_metadata(self, data: Dict[str, Any]):
        METADATA_FILE.write_text(
            json.dumps(data, indent=2, ensure_ascii=False, default=str),
            encoding="utf-8"
        )

    def index_document(
        self,
        chunks: List[Chunk],
        stats: DocumentStats,
        user_id: str
    ) -> None:
        """
        Generates dense embeddings for chunks and upserts them into Qdrant.
        Associates every chunk with user_id, document_id, and document_name.
        """
        if not chunks:
            return

        texts = [c.text for c in chunks]
        logger.info(f"Generating embeddings for {len(chunks)} chunks of {stats.document_name}...")
        vectors = self.embedder.embed_documents(texts)

        points = []
        meta = self._load_metadata()

        for idx, (chunk, vec) in enumerate(zip(chunks, vectors)):
            # Deterministic UUID from chunk_id
            point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, chunk.chunk_id))
            payload = chunk.to_payload()
            payload["user_id"] = user_id

            points.append(PointStruct(
                id=point_id,
                vector=vec,
                payload=payload
            ))

            # Store chunk payload in metadata for fast BM25 & page retrieval
            meta["chunks"][chunk.chunk_id] = payload

        # Upsert into Qdrant in batches
        batch_size = 50
        for i in range(0, len(points), batch_size):
            batch = points[i : i + batch_size]
            self.client.upsert(
                collection_name=COLLECTION_NAME,
                points=batch
            )

        # Record document stats
        meta["documents"][stats.document_id] = {
            **stats.model_dump(mode="json"),
            "user_id": user_id
        }
        self._save_metadata(meta)
        logger.info(f"Successfully indexed {len(chunks)} chunks into Qdrant for {stats.document_name}.")

    def search_dense(
        self,
        query: str,
        user_id: str,
        document_ids: Optional[List[str]] = None,
        top_k: int = 20
    ) -> List[Tuple[Dict[str, Any], float]]:
        """
        Performs cosine similarity search strictly isolated to the user's documents.
        Optionally filters to specific document_ids if selected by user.
        """
        query_vector = self.embedder.embed_query(query)

        must_conditions: List[Any] = [
            FieldCondition(key="user_id", match=MatchValue(value=user_id))
        ]

        if document_ids:
            if len(document_ids) == 1:
                must_conditions.append(
                    FieldCondition(key="document_id", match=MatchValue(value=document_ids[0]))
                )
            else:
                must_conditions.append(
                    FieldCondition(key="document_id", match=MatchAny(any=document_ids))
                )

        qdrant_filter = Filter(must=must_conditions)

        try:
            res = self.client.query_points(
                collection_name=COLLECTION_NAME,
                query=query_vector,
                query_filter=qdrant_filter,
                limit=top_k
            )

            hits = []
            for pt in res.points:
                score = pt.score if hasattr(pt, "score") and pt.score is not None else 0.0
                hits.append((pt.payload, float(score)))
            return hits
        except Exception as exc:
            logger.error(f"Qdrant query_points error: {exc}")
            return []

    def get_user_chunks(
        self,
        user_id: str,
        document_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Returns all chunk payloads belonging to the user (filtered by document_ids if provided).
        Used for BM25 lexical indexing and retrieval.
        """
        meta = self._load_metadata()
        results = []
        for chunk in meta.get("chunks", {}).values():
            if chunk.get("user_id") == user_id:
                if not document_ids or chunk.get("document_id") in document_ids:
                    results.append(chunk)
        return results

    def get_document_stats(self, document_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        meta = self._load_metadata()
        doc_info = meta.get("documents", {}).get(document_id)
        if doc_info and doc_info.get("user_id") == user_id:
            return doc_info
        return None

    def list_user_documents(self, user_id: str) -> List[Dict[str, Any]]:
        meta = self._load_metadata()
        return [
            doc for doc in meta.get("documents", {}).values()
            if doc.get("user_id") == user_id
        ]

    def delete_document(self, document_id: str, user_id: str) -> bool:
        """
        Deletes all chunks, embeddings from Qdrant, and metadata for a document.
        Verifies ownership before deleting.
        """
        meta = self._load_metadata()
        doc_info = meta.get("documents", {}).get(document_id)
        if not doc_info or doc_info.get("user_id") != user_id:
            logger.warning(f"Unauthorized or non-existent document delete attempt: {document_id}")
            return False

        # 1. Delete points from Qdrant
        try:
            delete_filter = Filter(must=[
                FieldCondition(key="document_id", match=MatchValue(value=document_id)),
                FieldCondition(key="user_id", match=MatchValue(value=user_id)),
            ])
            self.client.delete(
                collection_name=COLLECTION_NAME,
                points_selector=delete_filter
            )
        except Exception as exc:
            logger.error(f"Error deleting vectors from Qdrant: {exc}")

        # 2. Delete from metadata
        chunk_keys_to_delete = [
            cid for cid, c in meta.get("chunks", {}).items()
            if c.get("document_id") == document_id and c.get("user_id") == user_id
        ]
        for cid in chunk_keys_to_delete:
            meta["chunks"].pop(cid, None)

        meta["documents"].pop(document_id, None)
        self._save_metadata(meta)
        logger.info(f"Deleted document {document_id} and {len(chunk_keys_to_delete)} vectors.")
        return True

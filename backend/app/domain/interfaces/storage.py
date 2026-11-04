"""
ResearchMind AI — Storage Domain Interfaces
===========================================
Defines contracts for file storage and vector index backends.
"""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import List, Optional, Dict, Any, BinaryIO


class IFileStorage(ABC):
    @abstractmethod
    def save_file(self, user_id: str, filename: str, content: bytes) -> Path:
        pass

    @abstractmethod
    def get_file_path(self, user_id: str, filename: str) -> Optional[Path]:
        pass

    @abstractmethod
    def read_file_bytes(self, user_id: str, filename: str) -> Optional[bytes]:
        pass

    @abstractmethod
    def delete_file(self, user_id: str, filename: str) -> bool:
        pass

    @abstractmethod
    def list_files(self, user_id: str) -> List[Dict[str, Any]]:
        pass


class IVectorStore(ABC):
    @abstractmethod
    def index_document(self, chunks: List[Any], stats: Any, user_id: str) -> None:
        pass

    @abstractmethod
    def similarity_search(self, query_vector: List[float], user_id: str, document_ids: Optional[List[str]] = None, top_k: int = 25) -> List[tuple]:
        pass

    @abstractmethod
    def delete_document(self, document_id: str, user_id: str) -> bool:
        pass

    @abstractmethod
    def list_user_documents(self, user_id: str) -> List[Dict[str, Any]]:
        pass

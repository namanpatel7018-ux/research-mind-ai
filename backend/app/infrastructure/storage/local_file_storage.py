"""
ResearchMind AI — Local Disk File Storage
=========================================
Implements IFileStorage with user directory isolation and path security.
"""

import os
from pathlib import Path
from typing import List, Optional, Dict, Any

from app.core.config import settings
from app.domain.interfaces.storage import IFileStorage


class LocalFileStorage(IFileStorage):
    def __init__(self, upload_dir: Optional[Path] = None):
        self.upload_dir = upload_dir or settings.UPLOAD_DIR
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    def _sanitize(self, val: str) -> str:
        """Sanitizes user input to prevent directory traversal."""
        cleaned = os.path.basename(val.replace("\\", "/")).strip()
        if not cleaned or cleaned in (".", ".."):
            raise ValueError("Invalid filename or user identifier.")
        return cleaned

    def save_file(self, user_id: str, filename: str, content: bytes) -> Path:
        safe_user = self._sanitize(user_id)
        safe_file = self._sanitize(filename)
        user_dir = (self.upload_dir / safe_user).resolve()
        user_dir.mkdir(parents=True, exist_ok=True)
        dest = (user_dir / safe_file).resolve()
        if not str(dest).startswith(str(self.upload_dir.resolve())):
            raise ValueError("Path traversal attempt detected.")
        dest.write_bytes(content)
        return dest

    def get_file_path(self, user_id: str, filename: str) -> Optional[Path]:
        safe_file = self._sanitize(filename)
        # 1. User-isolated folder
        try:
            safe_user = self._sanitize(user_id)
            user_p = (self.upload_dir / safe_user / safe_file).resolve()
            if str(user_p).startswith(str(self.upload_dir.resolve())) and user_p.exists():
                return user_p
        except ValueError:
            pass

        # 2. Legacy root folder
        root_p = (self.upload_dir / safe_file).resolve()
        if str(root_p).startswith(str(self.upload_dir.resolve())) and root_p.exists():
            return root_p

        return None

    def read_file_bytes(self, user_id: str, filename: str) -> Optional[bytes]:
        try:
            path = self.get_file_path(user_id, filename)
            if path and path.exists():
                return path.read_bytes()
        except ValueError:
            return None
        return None

    def delete_file(self, user_id: str, filename: str) -> bool:
        try:
            path = self.get_file_path(user_id, filename)
            if path and path.exists():
                path.unlink()
                return True
        except (ValueError, OSError):
            return False
        return False

    def list_files(self, user_id: str) -> List[Dict[str, Any]]:
        try:
            safe_user = self._sanitize(user_id)
            user_dir = (self.upload_dir / safe_user).resolve()
        except ValueError:
            return []
        files = []
        if user_dir.exists() and str(user_dir).startswith(str(self.upload_dir.resolve())):
            for p in sorted(user_dir.iterdir()):
                if p.is_file():
                    files.append({
                        "filename": p.name,
                        "size": p.stat().st_size,
                    })
        return files


# Default singleton instance
local_storage = LocalFileStorage()

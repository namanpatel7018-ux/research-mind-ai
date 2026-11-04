"""
ResearchMind AI — Centralized Configuration Management
======================================================
Loads environment variables and YAML settings with strong type safety,
default values, validation, and safe representation without secret leaks.
"""

import os
import secrets
from pathlib import Path
from typing import List, Optional, Dict, Any
import yaml
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Application-wide settings container."""

    def __init__(self):
        # Base paths
        self.BASE_DIR = Path(__file__).resolve().parents[3]
        self.BACKEND_DIR = Path(__file__).resolve().parents[2]

        # Configurable persistent data directory
        data_env = os.getenv("DATA_DIR")
        if data_env:
            self.DATA_DIR = Path(data_env)
        elif (self.BACKEND_DIR / "data" / "researchmind.db").exists():
            self.DATA_DIR = self.BACKEND_DIR / "data"
        elif (self.BASE_DIR / "data").exists():
            self.DATA_DIR = self.BASE_DIR / "data"
        else:
            self.DATA_DIR = self.BACKEND_DIR / "data"
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)

        # Configurable uploads directory
        upload_env = os.getenv("UPLOAD_DIR")
        if upload_env:
            self.UPLOAD_DIR = Path(upload_env)
        elif (self.BACKEND_DIR / "uploads").exists():
            self.UPLOAD_DIR = self.BACKEND_DIR / "uploads"
        elif (self.BASE_DIR / "uploads").exists():
            self.UPLOAD_DIR = self.BASE_DIR / "uploads"
        else:
            self.UPLOAD_DIR = self.BACKEND_DIR / "uploads"
        self.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

        # Server
        self.HOST: str = os.getenv("HOST", "0.0.0.0")
        self.PORT: int = int(os.getenv("PORT", "8000"))
        self.ENV: str = os.getenv("ENV", "development").strip().lower()
        self.IS_PRODUCTION: bool = self.ENV == "production"

        # Security & JWT
        raw_secret = os.getenv("SECRET_KEY")
        if not raw_secret:
            if self.IS_PRODUCTION:
                self.SECRET_KEY = ""  # Will trigger validation error in validate_production_config
            else:
                self.SECRET_KEY = "dev-insecure-secret-key-change-in-production-" + secrets.token_hex(16)
        else:
            self.SECRET_KEY = raw_secret

        self.ALGORITHM: str = "HS256"
        self.ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
        self.AUTH_STORE_PATH: str = os.getenv("AUTH_STORE_PATH", str(self.DATA_DIR / "auth_store.json"))

        # CORS & Frontend
        self.FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173" if not self.IS_PRODUCTION else "")
        self.BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:8000" if not self.IS_PRODUCTION else "")
        self.CORS_ORIGINS: List[str] = self._parse_cors_origins()

        # Security & API Docs Control
        default_docs = "false" if self.IS_PRODUCTION else "true"
        self.ENABLE_DOCS: bool = os.getenv("ENABLE_DOCS", default_docs).lower() in ("true", "1", "yes")
        self.RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "120"))
        self.AUTH_RATE_LIMIT_PER_MINUTE: int = int(os.getenv("AUTH_RATE_LIMIT_PER_MINUTE", "10"))

        # Google OAuth
        self.GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
        self.GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
        self.GOOGLE_REDIRECT_URI: str = f"{self.BACKEND_URL}/api/auth/google/callback" if self.BACKEND_URL else ""

        # SMTP Email Config
        self.SMTP_HOST: str = os.getenv("SMTP_HOST", "")
        self.SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
        self.SMTP_USER: str = os.getenv("SMTP_USER", "")
        self.SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
        self.EMAIL_FROM: str = os.getenv("EMAIL_FROM", "ResearchMind AI <noreply@researchmind.ai>")
        self.SMTP_ENABLED: bool = bool(self.SMTP_HOST and self.SMTP_USER and self.SMTP_PASSWORD)

        # AI Provider Keys
        self.GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
        self.GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")

        # Qdrant Vector Store
        self.QDRANT_URL: Optional[str] = os.getenv("QDRANT_URL")
        self.QDRANT_API_KEY: Optional[str] = os.getenv("QDRANT_API_KEY")

        # Database
        self.DB_PATH: Path = self.DATA_DIR / "researchmind.db"

    def _parse_cors_origins(self) -> List[str]:
        origins = set()
        if not self.IS_PRODUCTION:
            defaults = [
                "http://localhost:5173",
                "http://localhost:4173",
                "http://localhost:4174",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:4173",
                "http://127.0.0.1:4174",
            ]
            origins.update(defaults)

        env_origins = os.getenv("CORS_ORIGINS", "")
        if env_origins:
            origins.update([o.strip() for o in env_origins.split(",") if o.strip()])
        if self.FRONTEND_URL:
            origins.add(self.FRONTEND_URL.strip())
        return [o for o in origins if o]

    def validate_production_config(self) -> None:
        """Enforces security requirements during production startup."""
        if not self.IS_PRODUCTION:
            return

        errors = []
        if not self.SECRET_KEY or len(self.SECRET_KEY) < 32 or self.SECRET_KEY.startswith("dev-") or "please_change" in self.SECRET_KEY:
            errors.append("SECRET_KEY must be configured with at least 32 high-entropy characters in production.")

        if not self.GEMINI_API_KEY and not self.GROQ_API_KEY:
            errors.append("At least one AI provider (GEMINI_API_KEY or GROQ_API_KEY) must be configured.")

        if not self.CORS_ORIGINS:
            errors.append("CORS_ORIGINS or FRONTEND_URL must be explicitly configured in production.")

        if errors:
            raise RuntimeError("Production security validation failed:\n - " + "\n - ".join(errors))


# Singleton settings instance
settings = Settings()


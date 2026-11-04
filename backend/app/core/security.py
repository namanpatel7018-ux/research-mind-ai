"""
ResearchMind AI — Security & Authentication Utilities
=====================================================
Handles password hashing with pbkdf2_sha256, JWT token encoding/decoding,
token blacklisting, and cryptographic OTP generation.
"""

import re
import secrets
import random
import string
from datetime import datetime, timedelta, timezone
from typing import Set, Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.core.exceptions import AuthenticationError, ValidationError

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
_EMAIL_RE = re.compile(r"^[a-zA-Z0-9_.+\-]+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$")
_PASSWORD_MIN = 8
_PASSWORD_MAX = 128

_token_blacklist: Set[str] = set()


class SecurityService:
    """Encapsulates authentication cryptography, JWT lifecycle, and validation rules."""

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verifies a plaintext password against pbkdf2_sha256 hash."""
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def hash_password(password: str) -> str:
        """Hashes password with pbkdf2_sha256."""
        return pwd_context.hash(password)

    @staticmethod
    def validate_email(email: str) -> str:
        """Validates email format and normalizes to lowercase."""
        cleaned = email.strip().lower()
        if not _EMAIL_RE.match(cleaned):
            raise ValidationError("Invalid email address format.")
        return cleaned

    @staticmethod
    def validate_password_strength(password: str) -> None:
        """Validates password length — must be between 8 and 128 characters."""
        if len(password) < _PASSWORD_MIN or len(password) > _PASSWORD_MAX:
            raise ValidationError(f"Password must be between {_PASSWORD_MIN} and {_PASSWORD_MAX} characters long.")

    @staticmethod
    def create_access_token(
        subject: str,
        name: str = "",
        expires_delta_minutes: Optional[int] = None
    ) -> str:
        """Generates a signed JWT access token."""
        minutes = expires_delta_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES
        expire = datetime.now(timezone.utc) + timedelta(minutes=minutes)
        jti = secrets.token_hex(16)
        payload = {
            "sub": subject,
            "name": name,
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "jti": jti,
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    @staticmethod
    def decode_token(token: str) -> Dict[str, Any]:
        """Decodes and validates a JWT access token."""
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            if not payload.get("sub"):
                raise AuthenticationError("Token missing subject claim.")
            jti = payload.get("jti")
            if jti and jti in _token_blacklist:
                raise AuthenticationError("Session has been invalidated. Please log in again.")
            return payload
        except JWTError as exc:
            raise AuthenticationError(f"Token is invalid or has expired: {exc}")

    @staticmethod
    def blacklist_token(token: str) -> bool:
        """Blacklists a token's JTI."""
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            jti = payload.get("jti")
            if jti:
                _token_blacklist.add(jti)
                return True
        except Exception:
            pass
        return False

    @staticmethod
    def generate_otp(length: int = 6) -> str:
        """Generates a cryptographically secure numeric OTP."""
        return "".join(secrets.choice(string.digits) for _ in range(length))

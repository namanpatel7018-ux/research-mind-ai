"""
ResearchMind AI — Auth State & Store Persistence
================================================
Manages in-memory and file-based state for users, pending signups, OTP sessions, and token blacklists.
"""

import os
import json
from datetime import datetime, timezone
from typing import Dict, Set, Any
from passlib.context import CryptContext

# Crypto context
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

AUTH_STORE_PATH = os.getenv(
    "AUTH_STORE_PATH",
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "auth_store.json"),
)

# In-memory stores
_users: Dict[str, dict] = {
    "researcher@example.com": {
        "email": "researcher@example.com",
        "full_name": "Researcher",
        "hashed_password": pwd_context.hash("Rsrch123"),
        "picture": None,
        "is_verified": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
}

_pending: Dict[str, dict] = {}
_token_blacklist: Set[str] = set()
_login_otp: Dict[str, dict] = {}
_forgot_otp: Dict[str, dict] = {}


def _save_store() -> None:
    os.makedirs(os.path.dirname(AUTH_STORE_PATH) or ".", exist_ok=True)
    payload = {"users": _users}
    with open(AUTH_STORE_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def _load_store() -> None:
    if not os.path.exists(AUTH_STORE_PATH):
        return

    try:
        with open(AUTH_STORE_PATH, "r", encoding="utf-8") as f:
            payload = json.load(f)
    except (json.JSONDecodeError, OSError):
        return

    users = payload.get("users") if isinstance(payload, dict) else None
    if not isinstance(users, dict):
        return

    for email, user in users.items():
        if not isinstance(user, dict):
            continue
        user.setdefault("email", email)
        user.setdefault("is_verified", True)
        user.setdefault("created_at", datetime.now(timezone.utc).isoformat())
        _users[email] = user


_load_store()

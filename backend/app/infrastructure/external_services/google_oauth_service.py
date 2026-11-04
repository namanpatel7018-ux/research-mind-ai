"""
ResearchMind AI — Google OAuth Service
======================================
Handles OAuth 2.0 PKCE flow, state JWT encoding, token exchange, and user verification.
"""

import base64
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Tuple
from urllib.parse import urlencode
from jose import jwt

from app.core.config import settings
from app.core.exceptions import AuthenticationError
from app.core.logging import get_logger

logger = get_logger("researchmind.infrastructure.google_oauth")


class GoogleOAuthService:
    def __init__(self):
        self.client_id = settings.GOOGLE_CLIENT_ID
        self.client_secret = settings.GOOGLE_CLIENT_SECRET
        self.redirect_uri = settings.GOOGLE_REDIRECT_URI

    def is_configured(self) -> bool:
        return bool(self.client_id and self.client_secret)

    def generate_auth_url(self) -> str:
        """Generates PKCE authorization URL with state token."""
        code_verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).rstrip(b"=").decode("ascii")
        code_challenge = base64.urlsafe_b64encode(
            hashlib.sha256(code_verifier.encode("ascii")).digest()
        ).rstrip(b"=").decode("ascii")

        state_payload = {
            "cv": code_verifier,
            "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
            "nonce": secrets.token_hex(8),
        }
        state = jwt.encode(state_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
            "prompt": "select_account",
            "access_type": "offline",
        }
        return f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"

    def exchange_code_for_user(self, code: str, state: Optional[str] = None) -> Dict[str, Any]:
        """Exchanges authorization code for Google profile information."""
        code_verifier = None
        if state:
            try:
                decoded = jwt.decode(state, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
                code_verifier = decoded.get("cv")
            except Exception:
                pass

        import requests as http_requests

        token_payload = {
            "code": code,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "redirect_uri": self.redirect_uri,
            "grant_type": "authorization_code",
        }
        if code_verifier:
            token_payload["code_verifier"] = code_verifier

        resp = http_requests.post(
            "https://oauth2.googleapis.com/token",
            data=token_payload,
            headers={"Accept": "application/json"},
            timeout=15,
        )

        resp_data = resp.json() if resp.text else {}
        if resp.status_code != 200:
            err = resp_data.get("error_description") or resp_data.get("error") or resp.text
            raise AuthenticationError(f"Google token exchange failed: {err}")

        access_token = resp_data.get("access_token")
        id_token_jwt = resp_data.get("id_token")

        user_info = None
        if access_token:
            try:
                ui_resp = http_requests.get(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    headers={"Authorization": f"Bearer {access_token}"},
                    timeout=10,
                )
                if ui_resp.status_code == 200:
                    user_info = ui_resp.json()
            except Exception:
                pass

        if not user_info and id_token_jwt:
            from google.oauth2 import id_token
            from google.auth.transport import requests as google_requests
            user_info = id_token.verify_oauth2_token(
                id_token_jwt,
                google_requests.Request(),
                self.client_id,
            )

        if not user_info or "email" not in user_info:
            raise AuthenticationError("Failed to retrieve user profile from Google.")

        return user_info


google_oauth_service = GoogleOAuthService()

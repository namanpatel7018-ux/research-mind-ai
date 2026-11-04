"""
ResearchMind AI — Google OAuth Routes
=====================================
Google OAuth URL initiation with PKCE security, state encoding, and callback handler.
"""

import os
import base64
import hashlib
import secrets
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import quote, urlencode

from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from jose import jwt

from app.core.config import settings
import app.api.auth_handlers.state as auth_state
from app.api.auth_handlers.security import _create_access_token, SECRET_KEY, ALGORITHM

logger = logging.getLogger("researchmind.auth.oauth")

router = APIRouter()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:4173")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
REDIRECT_URI = f"{BACKEND_URL}/api/auth/google/callback"


@router.get("/google/url", summary="Get Google OAuth redirect URL")
def get_google_auth_url():
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        demo_email = "researcher@example.com"
        token = _create_access_token(demo_email)
        return {"url": f"{FRONTEND_URL}/auth/callback?token={token}"}

    try:
        code_verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).rstrip(b"=").decode("ascii")
        code_challenge = base64.urlsafe_b64encode(
            hashlib.sha256(code_verifier.encode("ascii")).digest()
        ).rstrip(b"=").decode("ascii")

        state_payload = {
            "cv": code_verifier,
            "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
            "nonce": secrets.token_hex(8),
        }
        state = jwt.encode(state_payload, SECRET_KEY, algorithm=ALGORITHM)

        params = {
            "client_id": GOOGLE_CLIENT_ID,
            "redirect_uri": REDIRECT_URI,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
            "prompt": "select_account",
            "access_type": "offline",
        }
        auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
        return {"url": auth_url}
    except Exception as exc:
        logger.error(f"Google OAuth URL generation error: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Google OAuth error: {exc}")


@router.get("/google/callback", summary="Handle Google OAuth callback")
def google_callback(
    code: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None,
    state: Optional[str] = None,
):
    if error:
        err_msg = error_description or error or "Google sign-in was cancelled."
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error={quote(err_msg)}")

    if not code:
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error={quote('Authorization code missing from Google.')}")

    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error={quote('Google OAuth is not configured on server.')}")

    code_verifier = None
    if state:
        try:
            decoded = jwt.decode(state, SECRET_KEY, algorithms=[ALGORITHM])
            code_verifier = decoded.get("cv")
        except Exception as e:
            logger.warning(f"Could not decode code_verifier from state: {e}")

    try:
        import requests as http_requests

        token_payload = {
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": REDIRECT_URI,
            "grant_type": "authorization_code",
        }
        if code_verifier:
            token_payload["code_verifier"] = code_verifier

        token_resp = http_requests.post(
            "https://oauth2.googleapis.com/token",
            data=token_payload,
            headers={"Accept": "application/json"},
            timeout=15,
        )

        resp_data = token_resp.json() if token_resp.text else {}
        if token_resp.status_code != 200:
            err_msg = resp_data.get("error_description") or resp_data.get("error") or token_resp.text
            logger.error(f"Google token exchange failed ({token_resp.status_code}): {err_msg}")
            return RedirectResponse(url=f"{FRONTEND_URL}/login?error={quote(f'Google authentication failed: {err_msg}')}")

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
            except Exception as e:
                logger.warning(f"Failed to fetch userinfo with access token: {e}")

        if not user_info and id_token_jwt:
            from google.oauth2 import id_token
            from google.auth.transport import requests as google_requests
            user_info = id_token.verify_oauth2_token(
                id_token_jwt,
                google_requests.Request(),
                GOOGLE_CLIENT_ID,
            )

        if not user_info or "email" not in user_info:
            raise ValueError("Failed to retrieve user profile from Google.")

    except Exception as exc:
        logger.error(f"Google OAuth callback error: {exc}", exc_info=True)
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error={quote(f'Google authentication failed: {exc}')}")

    email = user_info["email"].lower().strip()
    full_name = user_info.get("name", email.split("@")[0])
    picture = user_info.get("picture")

    if email not in auth_state._users:
        auth_state._users[email] = {
            "email": email,
            "full_name": full_name,
            "picture": picture,
            "is_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    else:
        if picture:
            auth_state._users[email]["picture"] = picture
        if full_name and not auth_state._users[email].get("full_name"):
            auth_state._users[email]["full_name"] = full_name
        auth_state._users[email]["is_verified"] = True

    auth_state._save_store()

    token = _create_access_token(email)
    return RedirectResponse(url=f"{FRONTEND_URL}/auth/callback?token={token}")

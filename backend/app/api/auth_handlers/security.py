"""
ResearchMind AI — Auth Security & Token Helpers
===============================================
JWT issuance, decoding, token blacklisting, and FastAPI OAuth2 dependencies.
"""

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from app.core.config import settings
from app.schemas.auth_schemas import UserOut
import app.api.auth_handlers.state as auth_state

SECRET_KEY = os.getenv("SECRET_KEY") or settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token", auto_error=False)


def _create_access_token(email: str) -> str:
    jti = secrets.token_hex(16)
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    user = auth_state._users.get(email, {})
    payload = {
        "sub": email,
        "name": user.get("full_name", ""),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "jti": jti,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# Backward-compatible alias
create_access_token = _create_access_token


def _decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if not payload.get("sub"):
            raise ValueError("Missing subject.")
        return payload
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid or has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def get_current_user(token: str = Depends(oauth2_scheme)) -> UserOut:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = _decode_token(token)

    # Check blacklist
    jti = payload.get("jti", "")
    if jti in auth_state._token_blacklist:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been invalidated. Please log in again.",
        )

    email = payload["sub"]
    user = auth_state._users.get(email)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")
    if not user.get("is_verified", False):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email not verified.")

    full_name = user.get("full_name") or payload.get("name", "")
    return UserOut(
        email=user["email"],
        full_name=full_name if full_name else email.split("@")[0].capitalize(),
        picture=user.get("picture"),
        is_verified=user.get("is_verified", False),
    )


def get_optional_current_user(token: str = Depends(oauth2_scheme)) -> Optional[UserOut]:
    if not token:
        return None
    try:
        payload = _decode_token(token)
        jti = payload.get("jti", "")
        if jti in auth_state._token_blacklist:
            return None
        email = payload.get("sub")
        if not email:
            return None
        user = auth_state._users.get(email)
        if not user:
            return None
        full_name = user.get("full_name") or payload.get("name", "")
        return UserOut(
            email=user["email"],
            full_name=full_name if full_name else email.split("@")[0].capitalize(),
            picture=user.get("picture"),
            is_verified=user.get("is_verified", False),
        )
    except Exception:
        return None

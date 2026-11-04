"""
ResearchMind AI — Auth Session Routes
=====================================
Password login (/token) and session invalidation (/logout).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.schemas.auth_schemas import Token, LogoutBody
import app.api.auth_handlers.state as auth_state
from app.api.auth_handlers.security import (
    _create_access_token,
    _decode_token,
    oauth2_scheme,
)

router = APIRouter()


@router.post("/token", response_model=Token, summary="Email/password login")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Standard OAuth2 password flow.
    Returns a JWT access token on success.
    """
    email = form_data.username.strip().lower()

    _err = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect email or password.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    user = auth_state._users.get(email)
    if not user or "hashed_password" not in user:
        raise _err

    # Check primary and alternate password hashes
    is_valid_pw = auth_state.pwd_context.verify(form_data.password, user["hashed_password"])
    if not is_valid_pw and user.get("alt_hashed_password"):
        is_valid_pw = auth_state.pwd_context.verify(form_data.password, user["alt_hashed_password"])

    if not is_valid_pw:
        raise _err
    if not user.get("is_verified", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in.",
        )

    return {"access_token": _create_access_token(email), "token_type": "bearer"}


@router.post("/logout", summary="Invalidate JWT token")
def logout(body: LogoutBody = LogoutBody(), token: str = Depends(oauth2_scheme)):
    """
    Blacklists the current JWT so it cannot be reused even before expiry.
    """
    tok = body.token or token
    if tok:
        try:
            payload = _decode_token(tok)
            jti = payload.get("jti")
            if jti:
                auth_state._token_blacklist.add(jti)
        except HTTPException:
            pass

    return {"message": "Logged out successfully."}

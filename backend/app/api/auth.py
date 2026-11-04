"""
ResearchMind AI — Authentication Module (Modular Facade)
========================================================
Production-ready modular authentication architecture preserving 100% backward
compatibility for all route signatures, dependencies, mock patches, and test fixtures.
"""

import sys
import logging
from typing import Optional, Set, Dict, Any

from fastapi import APIRouter, Depends, Request

import app.api.auth_handlers.state as _state
from app.api.auth_handlers.security import (
    SECRET_KEY,
    ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    oauth2_scheme,
    _create_access_token,
    create_access_token,
    _decode_token,
    get_current_user,
    get_optional_current_user,
)
from app.services.email_service import (
    email_service,
    OTP_EXPIRE_MINUTES,
    OTP_MAX_ATTEMPTS,
)
from app.schemas.auth_schemas import (
    Token,
    UserOut,
    SignupRequestOTPBody,
    SignupVerifyOTPBody,
    LoginRequestOTPBody,
    LoginVerifyOTPBody,
    UpdateProfileBody,
    ChangePasswordBody,
    ForgotPasswordRequestOTPBody,
    ForgotPasswordVerifyOTPBody,
    ForgotPasswordResetBody,
    LogoutBody,
    _validate_email,
    _validate_password,
    _EMAIL_RE,
    _PASSWORD_MIN,
    _PASSWORD_MAX,
)
from app.api.auth_handlers.session_routes import (
    router as session_router,
    login_for_access_token,
    logout,
)
from app.api.auth_handlers.passwordless_routes import (
    router as passwordless_router,
    login_request_otp,
    login_verify_otp,
)
from app.api.auth_handlers.signup_routes import (
    router as signup_router,
    signup_request_otp,
    signup_verify_otp,
)
from app.api.auth_handlers.recovery_routes import (
    router as recovery_router,
    forgot_password_request_otp,
    forgot_password_verify_otp,
    forgot_password_reset,
)
from app.api.auth_handlers.oauth_routes import (
    router as oauth_router,
    get_google_auth_url,
    google_callback,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    FRONTEND_URL,
    BACKEND_URL,
    REDIRECT_URI,
)
from app.api.auth_handlers.profile_routes import (
    router as profile_router,
    read_users_me,
    update_profile,
    change_password,
    delete_account,
)
from app.api.auth_handlers.settings_routes import (
    router as settings_router,
    get_settings,
    update_settings,
)

logger = logging.getLogger("auth")

# ── Re-exported Shared State References ───────────────────────────────────────
_users: Dict[str, dict] = _state._users
_pending: Dict[str, dict] = _state._pending
_token_blacklist: Set[str] = _state._token_blacklist
_login_otp: Dict[str, dict] = _state._login_otp
_forgot_otp: Dict[str, dict] = _state._forgot_otp
AUTH_STORE_PATH: str = _state.AUTH_STORE_PATH
pwd_context = _state.pwd_context


def _save_store() -> None:
    # Always read current AUTH_STORE_PATH in case test suites dynamically modify it
    current_path = getattr(sys.modules[__name__], "AUTH_STORE_PATH", _state.AUTH_STORE_PATH)
    _state.AUTH_STORE_PATH = current_path
    _state._save_store()


def _load_store() -> None:
    current_path = getattr(sys.modules[__name__], "AUTH_STORE_PATH", _state.AUTH_STORE_PATH)
    _state.AUTH_STORE_PATH = current_path
    _state._load_store()


# ── Re-exported Email and OTP Helpers ─────────────────────────────────────────
def _generate_otp(length: int = 6) -> str:
    return email_service.generate_otp(length)


def _smtp_login_safe(server, user: str, password: str):
    return email_service._smtp_login_safe(server, user, password)


def _send_otp_email(to_email: str, otp: str, purpose: str = "login"):
    return email_service.send_otp_email(to_email=to_email, otp=otp, purpose=purpose)


# ── Unified Router Aggregating All Modular Sub-Routers ────────────────────────
router = APIRouter()
router.include_router(session_router)
router.include_router(passwordless_router)
router.include_router(signup_router)
router.include_router(recovery_router)
router.include_router(oauth_router)
router.include_router(profile_router)
router.include_router(settings_router)

__all__ = [
    "router",
    "_users",
    "_pending",
    "_token_blacklist",
    "_login_otp",
    "_forgot_otp",
    "AUTH_STORE_PATH",
    "_save_store",
    "_load_store",
    "pwd_context",
    "oauth2_scheme",
    "SECRET_KEY",
    "ALGORITHM",
    "ACCESS_TOKEN_EXPIRE_MINUTES",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "FRONTEND_URL",
    "BACKEND_URL",
    "REDIRECT_URI",
    "OTP_EXPIRE_MINUTES",
    "OTP_MAX_ATTEMPTS",
    "_create_access_token",
    "create_access_token",
    "_decode_token",
    "get_current_user",
    "get_optional_current_user",
    "_generate_otp",
    "_smtp_login_safe",
    "_send_otp_email",
    "login_for_access_token",
    "logout",
    "login_request_otp",
    "login_verify_otp",
    "signup_request_otp",
    "signup_verify_otp",
    "forgot_password_request_otp",
    "forgot_password_verify_otp",
    "forgot_password_reset",
    "get_google_auth_url",
    "google_callback",
    "read_users_me",
    "update_profile",
    "change_password",
    "delete_account",
    "get_settings",
    "update_settings",
    "Token",
    "UserOut",
    "SignupRequestOTPBody",
    "SignupVerifyOTPBody",
    "LoginRequestOTPBody",
    "LoginVerifyOTPBody",
    "UpdateProfileBody",
    "ChangePasswordBody",
    "ForgotPasswordRequestOTPBody",
    "ForgotPasswordVerifyOTPBody",
    "ForgotPasswordResetBody",
    "LogoutBody",
]

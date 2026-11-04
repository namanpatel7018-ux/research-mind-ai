"""
ResearchMind AI — Schemas Package
=================================
Central re-exports of domain and API validation schemas.
"""

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
)
from app.schemas.quiz_schemas import (
    QuizAnswerItem,
    QuizSubmitRequest,
)

__all__ = [
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
    "QuizAnswerItem",
    "QuizSubmitRequest",
]

"""
ResearchMind AI — Authentication Schemas & DTOs
================================================
Pydantic models for authentication, registration, OTP validation, and profile management.
"""

import re
from typing import Optional
from pydantic import BaseModel, field_validator

_EMAIL_RE = re.compile(r"^[a-zA-Z0-9_.+\-]+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$")
_PASSWORD_MIN = 8
_PASSWORD_MAX = 128


def _validate_email(email: str) -> str:
    from fastapi import HTTPException
    e = email.strip().lower()
    if not _EMAIL_RE.match(e):
        raise HTTPException(status_code=422, detail="Invalid email address format.")
    return e


def _validate_password(password: str) -> None:
    from fastapi import HTTPException
    if len(password) < _PASSWORD_MIN or len(password) > _PASSWORD_MAX:
        raise HTTPException(
            status_code=422,
            detail=f"Password must be between {_PASSWORD_MIN} and {_PASSWORD_MAX} characters.",
        )



class Token(BaseModel):
    access_token: str
    token_type: str


class UserOut(BaseModel):
    email: str
    full_name: Optional[str] = None
    picture: Optional[str] = None
    is_verified: bool = True


class SignupRequestOTPBody(BaseModel):
    email: str
    full_name: str
    password: Optional[str] = None

    @field_validator("email")
    @classmethod
    def email_fmt(cls, v: str) -> str:
        v = v.strip().lower()
        if not _EMAIL_RE.match(v):
            raise ValueError("Invalid email address format.")
        return v

    @field_validator("full_name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Full name must be at least 2 characters.")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if len(v) < _PASSWORD_MIN:
            raise ValueError(f"Password must be at least {_PASSWORD_MIN} characters.")
        if len(v) > _PASSWORD_MAX:
            raise ValueError(f"Password must not exceed {_PASSWORD_MAX} characters.")
        return v


class SignupVerifyOTPBody(BaseModel):
    email: str
    otp: str

    @field_validator("otp")
    @classmethod
    def otp_digits(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) != 6:
            raise ValueError("OTP must be exactly 6 digits.")
        return v


class LoginRequestOTPBody(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def email_fmt(cls, v: str) -> str:
        v = v.strip().lower()
        if not _EMAIL_RE.match(v):
            raise ValueError("Invalid email address format.")
        return v


class LoginVerifyOTPBody(BaseModel):
    email: str
    otp: str

    @field_validator("otp")
    @classmethod
    def otp_digits(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) != 6:
            raise ValueError("OTP must be exactly 6 digits.")
        return v


class UpdateProfileBody(BaseModel):
    full_name: str


class ChangePasswordBody(BaseModel):
    current_password: str
    new_password: str


class ForgotPasswordRequestOTPBody(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def email_fmt(cls, v: str) -> str:
        v = v.strip().lower()
        if not _EMAIL_RE.match(v):
            raise ValueError("Invalid email address format.")
        return v


class ForgotPasswordVerifyOTPBody(BaseModel):
    email: str
    otp: str

    @field_validator("otp")
    @classmethod
    def otp_digits(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) != 6:
            raise ValueError("OTP must be exactly 6 digits.")
        return v


class ForgotPasswordResetBody(BaseModel):
    email: str
    otp: str
    new_password: str

    @field_validator("email")
    @classmethod
    def email_fmt(cls, v: str) -> str:
        v = v.strip().lower()
        if not _EMAIL_RE.match(v):
            raise ValueError("Invalid email address format.")
        return v

    @field_validator("otp")
    @classmethod
    def otp_digits(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) != 6:
            raise ValueError("OTP must be exactly 6 digits.")
        return v

    @field_validator("new_password")
    @classmethod
    def password_len(cls, v: str) -> str:
        if len(v) < _PASSWORD_MIN:
            raise ValueError(f"Password must be at least {_PASSWORD_MIN} characters.")
        if len(v) > _PASSWORD_MAX:
            raise ValueError(f"Password must not exceed {_PASSWORD_MAX} characters.")
        return v


class LogoutBody(BaseModel):
    token: Optional[str] = None

"""
ResearchMind AI — Auth DTOs
===========================
"""

from typing import Optional
from pydantic import BaseModel, field_validator
import re

_EMAIL_RE = re.compile(r"^[a-zA-Z0-9_.+\-]+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$")
_PASSWORD_MIN = 6


class TokenDTO(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOutDTO(BaseModel):
    email: str
    full_name: Optional[str] = None
    picture: Optional[str] = None
    is_verified: bool = True


class SignupRequestOTPDTO(BaseModel):
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


class SignupVerifyOTPDTO(BaseModel):
    email: str
    otp: str

    @field_validator("otp")
    @classmethod
    def otp_digits(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) != 6:
            raise ValueError("OTP must be exactly 6 digits.")
        return v


class LoginRequestOTPDTO(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def email_fmt(cls, v: str) -> str:
        v = v.strip().lower()
        if not _EMAIL_RE.match(v):
            raise ValueError("Invalid email address format.")
        return v


class LoginVerifyOTPDTO(BaseModel):
    email: str
    otp: str

    @field_validator("otp")
    @classmethod
    def otp_digits(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) != 6:
            raise ValueError("OTP must be exactly 6 digits.")
        return v


class UpdateProfileDTO(BaseModel):
    full_name: str


class ChangePasswordDTO(BaseModel):
    current_password: str
    new_password: str


class LogoutDTO(BaseModel):
    token: Optional[str] = None

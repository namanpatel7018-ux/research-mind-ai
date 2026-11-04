"""
ResearchMind AI — Forgot Password & Recovery Routes
===================================================
Three-step secure password recovery: request OTP, verify OTP, and reset password.
"""

from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, status

from app.schemas.auth_schemas import (
    Token,
    ForgotPasswordRequestOTPBody,
    ForgotPasswordVerifyOTPBody,
    ForgotPasswordResetBody,
)
import app.api.auth_handlers.state as auth_state
from app.api.auth_handlers.security import _create_access_token
from app.services.email_service import email_service, OTP_EXPIRE_MINUTES, OTP_MAX_ATTEMPTS

router = APIRouter()


@router.post("/forgot-password/request-otp", summary="Forgot Password — send OTP to email")
def forgot_password_request_otp(body: ForgotPasswordRequestOTPBody):
    """
    User enters their email. We verify account existence and dispatch
    a 6-digit OTP code to their registered email address.
    """
    email = body.email

    user = auth_state._users.get(email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email. Please verify your address or create an account.",
        )

    otp = email_service.generate_otp()
    auth_state._forgot_otp[email] = {
        "otp": otp,
        "attempts": 0,
        "verified": False,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRE_MINUTES),
    }

    import app.api.auth as auth_facade
    res = auth_facade._send_otp_email(to_email=email, otp=otp, purpose="forgot_password")
    sent, err_msg = res if isinstance(res, tuple) else (bool(res), None)

    msg = (
        f"A 6-digit password reset code has been sent to {email}. It is valid for {OTP_EXPIRE_MINUTES} minutes."
        if sent
        else f"Failed to send email to {email}: {err_msg}"
    )

    return {
        "message": msg,
        "email_sent": sent,
        "email_error": err_msg if not sent else None,
    }


@router.post("/forgot-password/verify-otp", summary="Forgot Password — check OTP is correct")
def forgot_password_verify_otp(body: ForgotPasswordVerifyOTPBody):
    """
    Checks if the entered OTP is correct, unexpired (<= 5 min), and within attempt limits.
    """
    email = body.email.strip().lower()
    record = auth_state._forgot_otp.get(email)

    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No password reset request found for this email. Please request a new code.",
        )

    if datetime.now(timezone.utc) > record["expires_at"]:
        auth_state._forgot_otp.pop(email, None)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password reset code has expired. OTP is valid only for {OTP_EXPIRE_MINUTES} minutes. Please request a new code.",
        )

    if record["attempts"] >= OTP_MAX_ATTEMPTS:
        auth_state._forgot_otp.pop(email, None)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many incorrect attempts. Please request a new password reset code.",
        )

    if body.otp != record["otp"]:
        record["attempts"] += 1
        remaining = OTP_MAX_ATTEMPTS - record["attempts"]
        if remaining <= 0:
            auth_state._forgot_otp.pop(email, None)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Too many incorrect attempts. Please request a new password reset code.",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Incorrect code. {remaining} attempt{'s' if remaining != 1 else ''} remaining.",
        )

    record["verified"] = True
    return {
        "status": "ok",
        "message": "Verification code confirmed successfully.",
        "email": email,
    }


@router.post("/forgot-password/reset", response_model=Token, summary="Forgot Password — set new password")
def forgot_password_reset(body: ForgotPasswordResetBody):
    """
    Validates OTP, enforces password strength rules, updates user's hashed password,
    saves the store, and returns a valid JWT access token.
    """
    email = body.email.strip().lower()
    record = auth_state._forgot_otp.get(email)

    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No password reset request found for this email. Please request a new code.",
        )

    if not record.get("verified"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has not been verified. Please verify your OTP before resetting password.",
        )

    if datetime.now(timezone.utc) > record["expires_at"]:
        auth_state._forgot_otp.pop(email, None)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password reset session has expired. OTP is valid only for {OTP_EXPIRE_MINUTES} minutes. Please request a new code.",
        )

    if body.otp != record["otp"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code does not match. Please request a new code.",
        )

    user = auth_state._users.get(email)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found.")

    new_pw = body.new_password
    has_upper = any(c.isupper() for c in new_pw)
    has_number = any(c.isdigit() for c in new_pw)
    has_special = any(not c.isalnum() for c in new_pw)
    strength_score = sum([len(new_pw) >= 8, has_upper, has_number, has_special])

    if strength_score < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please use a strong password with uppercase letters, numbers, and special characters.",
        )

    user["hashed_password"] = auth_state.pwd_context.hash(new_pw)
    user["is_verified"] = True
    user.pop("alt_hashed_password", None)
    auth_state._save_store()
    auth_state._forgot_otp.pop(email, None)

    return {"access_token": _create_access_token(email), "token_type": "bearer"}

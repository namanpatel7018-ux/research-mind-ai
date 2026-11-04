"""
ResearchMind AI — Passwordless OTP Login Routes
===============================================
Request and verify 6-digit OTP codes for passwordless account sign-in.
"""

from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, status

from app.schemas.auth_schemas import Token, LoginRequestOTPBody, LoginVerifyOTPBody
import app.api.auth_handlers.state as auth_state
from app.api.auth_handlers.security import _create_access_token
from app.services.email_service import email_service, OTP_EXPIRE_MINUTES, OTP_MAX_ATTEMPTS

router = APIRouter()


@router.post("/login/request-otp", summary="Passwordless login — send OTP to email")
def login_request_otp(body: LoginRequestOTPBody):
    """
    User enters only their email. We send a 6-digit OTP.
    No password required — email OTP is the credential.
    """
    email = body.email

    user = auth_state._users.get(email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email. Please sign up first.",
        )
    if not user.get("is_verified", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your email is not verified. Please complete sign up.",
        )

    otp = email_service.generate_otp()
    auth_state._login_otp[email] = {
        "otp": otp,
        "attempts": 0,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRE_MINUTES),
    }

    # Reference backend auth module helper to respect unittest patches
    import app.api.auth as auth_facade
    res = auth_facade._send_otp_email(to_email=email, otp=otp, purpose="login")
    sent, err_msg = res if isinstance(res, tuple) else (bool(res), None)

    msg = (
        f"A 6-digit login code has been sent to {email}. It is valid for {OTP_EXPIRE_MINUTES} minutes."
        if sent
        else f"Failed to deliver email: {err_msg}"
    )

    return {
        "message": msg,
        "email_sent": sent,
        "email_error": err_msg if not sent else None,
    }


@router.post("/login/verify-otp", response_model=Token, summary="Passwordless login — verify OTP")
def login_verify_otp(body: LoginVerifyOTPBody):
    """
    Validates the login OTP and returns a JWT access token.
    OTP expires in 5 minutes. Maximum 3 wrong attempts.
    """
    email = body.email.strip().lower()
    record = auth_state._login_otp.get(email)

    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No login code found for this email. Please request a new one.",
        )

    if datetime.now(timezone.utc) > record["expires_at"]:
        auth_state._login_otp.pop(email, None)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Login code has expired. OTP is valid only for {OTP_EXPIRE_MINUTES} minutes. Please request a new code.",
        )

    if record["attempts"] >= OTP_MAX_ATTEMPTS:
        auth_state._login_otp.pop(email, None)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many incorrect attempts. Please request a new login code.",
        )

    if body.otp != record["otp"]:
        record["attempts"] += 1
        remaining = OTP_MAX_ATTEMPTS - record["attempts"]
        if remaining <= 0:
            auth_state._login_otp.pop(email, None)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Too many incorrect attempts. Please request a new login code.",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Incorrect code. {remaining} attempt{'s' if remaining != 1 else ''} remaining.",
        )

    auth_state._login_otp.pop(email, None)
    return {"access_token": _create_access_token(email), "token_type": "bearer"}

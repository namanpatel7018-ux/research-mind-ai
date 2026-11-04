"""
ResearchMind AI — Signup & Registration Routes
==============================================
New user registration with OTP email verification and password strength enforcement.
"""

from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, status

from app.schemas.auth_schemas import Token, SignupRequestOTPBody, SignupVerifyOTPBody
import app.api.auth_handlers.state as auth_state
from app.api.auth_handlers.security import _create_access_token
from app.services.email_service import email_service, OTP_EXPIRE_MINUTES, OTP_MAX_ATTEMPTS

router = APIRouter()


@router.post("/signup/request-otp", summary="Register — send OTP to email")
def signup_request_otp(body: SignupRequestOTPBody):
    """
    Validates input, checks for duplicate email, hashes password,
    generates a 6-digit OTP, and stores a pending signup record.
    """
    email = body.email

    if email in auth_state._users:
        if not auth_state._users[email].get("hashed_password"):
            # Account exists via Google OAuth without password yet.
            # Allow setting password via verification.
            pass
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email already exists. Please sign in.",
            )

    # Validate password strength
    if body.password:
        password = body.password
        if len(password) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 8 characters long.",
            )

        has_upper = any(c.isupper() for c in password)
        has_number = any(c.isdigit() for c in password)
        has_special = any(not c.isalnum() for c in password)

        strength_score = sum([len(password) >= 8, has_upper, has_number, has_special])

        if strength_score < 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please use a strong password. Include uppercase letters, numbers, and special characters.",
            )

    otp = email_service.generate_otp()
    auth_state._pending[email] = {
        "otp": otp,
        "attempts": 0,
        "full_name": body.full_name,
        **({"hashed_password": auth_state.pwd_context.hash(body.password)} if body.password else {}),
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRE_MINUTES),
    }

    import app.api.auth as auth_facade
    res = auth_facade._send_otp_email(to_email=email, otp=otp, purpose="signup")
    sent, err_msg = res if isinstance(res, tuple) else (bool(res), None)

    msg = (
        f"A 6-digit verification code has been sent to {email}. It is valid for {OTP_EXPIRE_MINUTES} minutes."
        if sent
        else f"Failed to deliver email: {err_msg}"
    )

    return {
        "message": msg,
        "email_sent": sent,
        "email_error": err_msg if not sent else None,
    }


@router.post("/signup/verify-otp", response_model=Token, summary="Register — verify OTP")
def signup_verify_otp(body: SignupVerifyOTPBody):
    """
    Validates the OTP, creates the verified user account,
    cleans up the pending record, and returns a JWT token.
    """
    email = body.email.strip().lower()
    pending = auth_state._pending.get(email)

    if not pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pending signup found for this email. Please sign up again.",
        )

    # Expiry check
    if datetime.now(timezone.utc) > pending["expires_at"]:
        auth_state._pending.pop(email, None)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Verification code has expired. OTP is valid only for {OTP_EXPIRE_MINUTES} minutes. Please sign up again to receive a new code.",
        )

    # Attempt limit
    if pending["attempts"] >= OTP_MAX_ATTEMPTS:
        auth_state._pending.pop(email, None)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Too many incorrect attempts. "
                "Your OTP has been invalidated. Please sign up again."
            ),
        )

    # Wrong OTP
    if body.otp != pending["otp"]:
        pending["attempts"] += 1
        remaining = OTP_MAX_ATTEMPTS - pending["attempts"]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Incorrect OTP. "
                f"{remaining} attempt{'s' if remaining != 1 else ''} remaining."
            ),
        )

    # Correct — create or update verified account
    existing_user = auth_state._users.get(email, {})
    auth_state._users[email] = {
        "email": email,
        "full_name": pending["full_name"],
        **({"hashed_password": pending["hashed_password"]} if pending.get("hashed_password") else {}),
        "picture": existing_user.get("picture"),
        "is_verified": True,
        "created_at": existing_user.get("created_at") or datetime.now(timezone.utc).isoformat(),
    }
    auth_state._pending.pop(email, None)
    auth_state._save_store()

    return {"access_token": _create_access_token(email), "token_type": "bearer"}

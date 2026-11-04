"""
ResearchMind AI — Authentication Application Service
===================================================
Coordinates user registration, OTP verification, password authentication,
JWT issuance, session blacklisting, and profile management.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Tuple

from app.core.config import settings
from app.core.exceptions import (
    AuthenticationError,
    AuthorizationError,
    ValidationError,
    DuplicateEntityError,
    EntityNotFoundError,
)
from app.core.security import SecurityService
from app.domain.entities.user import User
from app.domain.interfaces.repositories import IUserRepository
from app.infrastructure.external_services.smtp_service import SMTPService, smtp_service
from app.infrastructure.external_services.google_oauth_service import GoogleOAuthService, google_oauth_service

OTP_EXPIRE_MINUTES = 10
OTP_MAX_ATTEMPTS = 3


class AuthService:
    def __init__(
        self,
        user_repo: IUserRepository,
        smtp: Optional[SMTPService] = None,
        google_oauth: Optional[GoogleOAuthService] = None,
    ):
        self.user_repo = user_repo
        self.smtp = smtp or smtp_service
        self.google_oauth = google_oauth or google_oauth_service
        self._pending: Dict[str, Dict[str, Any]] = {}
        self._login_otp: Dict[str, Dict[str, Any]] = {}

    def authenticate_password(self, email: str, password: str) -> str:
        """Validates credentials and returns JWT access token."""
        user = self.user_repo.get_by_email(email)
        if not user or not user.hashed_password:
            raise AuthenticationError("Incorrect email or password.")
        if not SecurityService.verify_password(password, user.hashed_password):
            raise AuthenticationError("Incorrect email or password.")
        if not user.is_verified:
            raise AuthorizationError("Please verify your email before logging in.")

        return SecurityService.create_access_token(user.email, user.full_name)

    def request_signup_otp(self, email: str, full_name: str, password: Optional[str] = None) -> str:
        """Sends signup OTP email."""
        norm_email = SecurityService.validate_email(email)
        if self.user_repo.get_by_email(norm_email):
            raise DuplicateEntityError("An account with this email already exists. Please sign in.")

        if password:
            SecurityService.validate_password_strength(password)

        otp = SecurityService.generate_otp(6)
        self._pending[norm_email] = {
            "otp": otp,
            "attempts": 0,
            "full_name": full_name.strip(),
            "hashed_password": SecurityService.hash_password(password) if password else None,
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRE_MINUTES),
        }

        self.smtp.send_otp_email(to_email=norm_email, otp=otp, purpose="signup", expire_minutes=OTP_EXPIRE_MINUTES)
        return f"A 6-digit verification code has been sent to {norm_email}."

    def verify_signup_otp(self, email: str, otp: str) -> str:
        """Verifies OTP and creates user."""
        norm_email = email.strip().lower()
        pending = self._pending.get(norm_email)
        if not pending:
            raise ValidationError("No pending signup found for this email. Please sign up again.")

        if datetime.now(timezone.utc) > pending["expires_at"]:
            self._pending.pop(norm_email, None)
            raise ValidationError("OTP has expired. Please sign up again.")

        if pending["attempts"] >= OTP_MAX_ATTEMPTS:
            self._pending.pop(norm_email, None)
            raise ValidationError("Too many incorrect attempts. Please sign up again.")

        if otp.strip() != pending["otp"]:
            pending["attempts"] += 1
            remaining = OTP_MAX_ATTEMPTS - pending["attempts"]
            raise ValidationError(f"Incorrect OTP. {remaining} attempt{'s' if remaining != 1 else ''} remaining.")

        user = User(
            email=norm_email,
            full_name=pending["full_name"],
            hashed_password=pending.get("hashed_password"),
            picture=None,
            is_verified=True,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        self.user_repo.save(user)
        self._pending.pop(norm_email, None)

        return SecurityService.create_access_token(user.email, user.full_name)

    def request_login_otp(self, email: str) -> str:
        """Sends passwordless login OTP."""
        norm_email = SecurityService.validate_email(email)
        user = self.user_repo.get_by_email(norm_email)
        if not user:
            raise EntityNotFoundError("No account found with this email. Please sign up first.")
        if not user.is_verified:
            raise AuthorizationError("Your email is not verified. Please complete sign up.")

        otp = SecurityService.generate_otp(6)
        self._login_otp[norm_email] = {
            "otp": otp,
            "attempts": 0,
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRE_MINUTES),
        }

        self.smtp.send_otp_email(to_email=norm_email, otp=otp, purpose="login", expire_minutes=OTP_EXPIRE_MINUTES)
        return f"A 6-digit login code has been sent to {norm_email}."

    def verify_login_otp(self, email: str, otp: str) -> str:
        """Validates login OTP and returns token."""
        norm_email = email.strip().lower()
        record = self._login_otp.get(norm_email)
        if not record:
            raise ValidationError("No login code found for this email. Please request a new one.")

        if datetime.now(timezone.utc) > record["expires_at"]:
            self._login_otp.pop(norm_email, None)
            raise ValidationError("Login code has expired. Please request a new one.")

        if record["attempts"] >= OTP_MAX_ATTEMPTS:
            self._login_otp.pop(norm_email, None)
            raise ValidationError("Too many incorrect attempts. Please request a new login code.")

        if otp.strip() != record["otp"]:
            record["attempts"] += 1
            remaining = OTP_MAX_ATTEMPTS - record["attempts"]
            raise ValidationError(f"Incorrect code. {remaining} attempt{'s' if remaining != 1 else ''} remaining.")

        self._login_otp.pop(norm_email, None)
        user = self.user_repo.get_by_email(norm_email)
        full_name = user.full_name if user else ""
        return SecurityService.create_access_token(norm_email, full_name)

    def logout(self, token: Optional[str]) -> bool:
        """Blacklists token."""
        if token:
            return SecurityService.blacklist_token(token)
        return True

    def get_user_from_token(self, token: str) -> User:
        """Validates token and returns current user."""
        payload = SecurityService.decode_token(token)
        email = payload.get("sub", "")
        user = self.user_repo.get_by_email(email)
        if not user:
            raise AuthenticationError("User not found.")
        if not user.is_verified:
            raise AuthorizationError("Email not verified.")
        return user

    def update_profile(self, email: str, full_name: str) -> User:
        cleaned_name = full_name.strip()
        if len(cleaned_name) < 2:
            raise ValidationError("Full name must be at least 2 characters.")
        user = self.user_repo.update_profile(email, cleaned_name)
        if not user:
            raise EntityNotFoundError("User not found.")
        return user

    def change_password(self, email: str, current_password: str, new_password: str) -> bool:
        user = self.user_repo.get_by_email(email)
        if not user or not user.hashed_password or not SecurityService.verify_password(current_password, user.hashed_password):
            raise ValidationError("Current password is incorrect.")
        SecurityService.validate_password_strength(new_password)
        hashed = SecurityService.hash_password(new_password)
        return self.user_repo.update_password(email, hashed)

    def delete_account(self, email: str) -> bool:
        return self.user_repo.delete(email)

    def handle_google_callback(self, code: str, state: Optional[str] = None) -> str:
        """Processes Google OAuth callback and returns access token."""
        user_info = self.google_oauth.exchange_code_for_user(code, state)
        email = user_info["email"].lower().strip()
        full_name = user_info.get("name", email.split("@")[0])
        picture = user_info.get("picture")

        user = self.user_repo.get_by_email(email)
        if not user:
            user = User(
                email=email,
                full_name=full_name,
                picture=picture,
                is_verified=True,
                created_at=datetime.now(timezone.utc).isoformat(),
            )
            self.user_repo.save(user)
        else:
            if picture:
                user.picture = picture
            if full_name and not user.full_name:
                user.full_name = full_name
            user.is_verified = True
            self.user_repo.save(user)

        return SecurityService.create_access_token(user.email, user.full_name)

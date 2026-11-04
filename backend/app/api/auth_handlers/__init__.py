"""
ResearchMind AI — Auth Handlers Package
=======================================
Combines all modular authentication sub-routers into a unified router.
"""

from fastapi import APIRouter

from app.api.auth_handlers.session_routes import router as session_router
from app.api.auth_handlers.passwordless_routes import router as passwordless_router
from app.api.auth_handlers.signup_routes import router as signup_router
from app.api.auth_handlers.recovery_routes import router as recovery_router
from app.api.auth_handlers.oauth_routes import router as oauth_router
from app.api.auth_handlers.profile_routes import router as profile_router
from app.api.auth_handlers.settings_routes import router as settings_router

router = APIRouter()
router.include_router(session_router)
router.include_router(passwordless_router)
router.include_router(signup_router)
router.include_router(recovery_router)
router.include_router(oauth_router)
router.include_router(profile_router)
router.include_router(settings_router)

__all__ = ["router"]

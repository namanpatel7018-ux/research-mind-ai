import os
import time
import logging
from collections import defaultdict
from contextlib import asynccontextmanager
from typing import Dict, List, Tuple

from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exceptions import RequestValidationError

from app.core.config import settings
from app.api import auth, ai, quiz

logger = logging.getLogger("researchmind.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: validate production configuration
    try:
        settings.validate_production_config()
        logger.info("Application configuration successfully validated. ENV=%s", settings.ENV)
    except Exception as exc:
        logger.error("Configuration validation error: %s", exc)
        raise exc
    yield
    # Shutdown logic if any
    logger.info("Application shutting down.")


# Conditionally enable interactive docs based on environment settings
app = FastAPI(
    title="ResearchMind AI",
    version="0.1.0",
    docs_url="/docs" if settings.ENABLE_DOCS else None,
    redoc_url="/redoc" if settings.ENABLE_DOCS else None,
    openapi_url="/openapi.json" if settings.ENABLE_DOCS else None,
    lifespan=lifespan,
)

# ── CORS Middleware ───────────────────────────────────────────────────────────
configured_origins = settings.CORS_ORIGINS
if not configured_origins:
    if settings.IS_PRODUCTION:
        configured_origins = []
    else:
        configured_origins = ["http://localhost:5173", "http://localhost:4173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=configured_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)


# ── In-Memory Sliding Window Rate Limiter ─────────────────────────────────────
# Maps client IP -> list of request timestamps
_rate_limits: Dict[str, List[float]] = defaultdict(list)
_auth_rate_limits: Dict[str, List[float]] = defaultdict(list)


def _get_client_ip(request: Request) -> str:
    # Handle X-Forwarded-For if behind trusted proxy / Nginx
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@app.middleware("http")
async def security_and_rate_limit_middleware(request: Request, call_next):
    # 1. Skip rate limiting for health checks, docs, or internal test clients
    path = request.url.path
    client_ip = _get_client_ip(request)
    if (
        client_ip in ("testclient", "test")
        or os.getenv("TESTING") == "1"
        or settings.ENV == "testing"
        or path in ("/health", "/api/health", "/docs", "/openapi.json", "/redoc")
    ):
        response = await call_next(request)
        _apply_security_headers(response)
        return response
    now = time.time()
    window = 60.0  # 1 minute

    # 2. Strict rate limiting on authentication and OTP endpoints
    is_auth_route = path.startswith("/api/auth") and (
        "token" in path or "otp" in path or "reset" in path or "register" in path or "signup" in path
    )
    if is_auth_route:
        recent_auth = [t for t in _auth_rate_limits[client_ip] if now - t < window]
        _auth_rate_limits[client_ip] = recent_auth
        if len(recent_auth) >= settings.AUTH_RATE_LIMIT_PER_MINUTE:
            logger.warning("Auth rate limit exceeded for IP %s on path %s", client_ip, path)
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Too many authentication requests. Please try again in 1 minute."},
                headers={"Retry-After": "60"},
            )
        _auth_rate_limits[client_ip].append(now)

    # 3. General API rate limit per client IP
    recent_requests = [t for t in _rate_limits[client_ip] if now - t < window]
    _rate_limits[client_ip] = recent_requests
    if len(recent_requests) >= settings.RATE_LIMIT_PER_MINUTE:
        logger.warning("General rate limit exceeded for IP %s on path %s", client_ip, path)
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": "Rate limit exceeded. Please throttle your requests."},
            headers={"Retry-After": "60"},
        )
    _rate_limits[client_ip].append(now)

    # 4. Execute request
    response = await call_next(request)

    # 5. Apply security response headers
    _apply_security_headers(response)
    return response


def _apply_security_headers(response: Response) -> None:
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    if settings.IS_PRODUCTION:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"


# ── Global Safe Exception Handlers ────────────────────────────────────────────
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=getattr(exc, "headers", None),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Validation error", "errors": exc.errors()},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # Log the complete diagnostic error internally; never leak to client
    logger.exception("Unhandled server exception processing path %s: %s", request.url.path, exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error. Please try again later."},
    )


# ── Route Registrations ───────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
app.include_router(quiz.router, prefix="/api/quiz", tags=["quiz"])


@app.get("/health")
@app.get("/api/health")
async def health_check():
    """Health check endpoint with AI routing status"""
    from app.services import ai_service
    status_info = ai_service.get_status()
    return {
        "status": status_info["status"],
        "message": "ResearchMind AI is running",
        "gemini_configured": status_info["gemini_configured"],
        "groq_configured": status_info["groq_configured"],
        "gemini_model": status_info["gemini_model"],
        "groq_model": status_info["groq_model"],
        "primary_chat_provider": status_info["primary_chat_provider"],
        "primary_research_provider": status_info["primary_research_provider"],
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to ResearchMind AI API",
        "docs": "/docs" if settings.ENABLE_DOCS else "disabled in production",
    }

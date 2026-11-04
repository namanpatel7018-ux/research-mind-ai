"""
Google Gemini AI Provider for ResearchMind AI
Uses official google-genai SDK.
"""
import os
import logging
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

# Robustly find .env regardless of working directory
for _p in [Path(__file__).resolve().parents[3] / ".env", Path.cwd() / ".env", Path.cwd() / "backend" / ".env"]:
    if _p.exists():
        load_dotenv(_p)
        break
else:
    load_dotenv()

from google import genai
from google.genai import types
from google.genai import errors as genai_errors

from app.services.providers.base_provider import (
    AIProvider,
    AIResponse,
    AIProviderError,
    AIRateLimitError,
    AITemporaryError,
    AIAuthenticationError,
    AIModelNotFoundError,
    AIContentBlockedError,
)

logger = logging.getLogger("researchmind.ai.gemini")


class GeminiProvider(AIProvider):
    """Provider for Google Gemini models via google-genai SDK."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None
    ):
        self._api_key = os.getenv("GEMINI_API_KEY", "") if api_key is None else api_key
        self._model_name = os.getenv("GEMINI_MODEL", "gemini-3.6-flash") if model is None else model
        self._client: Optional[genai.Client] = None
        self._init_client()

    def _init_client(self) -> None:
        """Safely initialize the Gemini client without exposing secrets."""
        if not self._api_key:
            logger.info("[AI] Gemini API key: not configured")
            return

        try:
            self._client = genai.Client(api_key=self._api_key)
            logger.info(f"[AI] Gemini AI initialized successfully (model: {self._model_name})")
        except Exception as exc:
            logger.warning(f"[AI] Warning: Failed to initialize Gemini client: {exc}")
            self._client = None

    @property
    def provider_name(self) -> str:
        return "gemini"

    @property
    def model_name(self) -> str:
        return self._model_name

    def is_configured(self) -> bool:
        return bool(self._api_key and self._client is not None)

    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = 4096,
        temperature: float = 0.2
    ) -> AIResponse:
        """Execute text generation with Google Gemini."""
        if not self.is_configured():
            raise AIAuthenticationError(
                "Gemini API key not configured. Please set GEMINI_API_KEY in .env file.",
                provider=self.provider_name
            )

        try:
            config = types.GenerateContentConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
                top_p=0.95,
                system_instruction=system_prompt,
                safety_settings=[
                    types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="OFF"),
                    types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="OFF"),
                    types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="OFF"),
                    types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="OFF"),
                ]
            )

            response = self._client.models.generate_content(
                model=self._model_name,
                contents=user_prompt,
                config=config
            )

            if not response or not response.text:
                raise AITemporaryError(
                    "Gemini API returned an empty response.",
                    provider=self.provider_name
                )

            return AIResponse(
                content=response.text.strip(),
                provider=self.provider_name,
                model=self._model_name,
                raw_response=response
            )

        except (AIRateLimitError, AITemporaryError, AIAuthenticationError, AIModelNotFoundError, AIContentBlockedError):
            raise
        except Exception as exc:
            self._handle_exception(exc)

    def generate_json(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = 4096,
        temperature: float = 0.2
    ) -> AIResponse:
        """Execute structured JSON generation with Google Gemini."""
        if not self.is_configured():
            raise AIAuthenticationError(
                "Gemini API key not configured. Please set GEMINI_API_KEY in .env file.",
                provider=self.provider_name
            )

        try:
            config = types.GenerateContentConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
                response_mime_type="application/json",
                system_instruction=system_prompt,
                safety_settings=[
                    types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="OFF"),
                    types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="OFF"),
                    types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="OFF"),
                    types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="OFF"),
                ]
            )

            response = self._client.models.generate_content(
                model=self._model_name,
                contents=user_prompt,
                config=config
            )

            if not response or not response.text:
                raise AITemporaryError(
                    "Gemini API returned empty JSON response.",
                    provider=self.provider_name
                )

            return AIResponse(
                content=response.text.strip(),
                provider=self.provider_name,
                model=self._model_name,
                raw_response=response
            )

        except (AIRateLimitError, AITemporaryError, AIAuthenticationError, AIModelNotFoundError, AIContentBlockedError):
            raise
        except Exception as exc:
            self._handle_exception(exc)

    def _handle_exception(self, exc: Exception) -> None:
        """Map raw Gemini exceptions to typed AIProviderError hierarchy."""
        err_str = str(exc)
        err_lower = err_str.lower()

        # Check status codes / exception types
        if isinstance(exc, genai_errors.APIError):
            status = exc.code
            if status == 429:
                raise AIRateLimitError("Gemini rate limit exceeded.", provider=self.provider_name)
            elif status in (401, 403):
                raise AIAuthenticationError("Gemini authentication failure. Check GEMINI_API_KEY.", provider=self.provider_name)
            elif status == 404:
                raise AIModelNotFoundError(f"Gemini model '{self._model_name}' not found: {err_str}", provider=self.provider_name)
            elif status in (500, 502, 503, 504):
                raise AITemporaryError(f"Gemini service temporary error ({status}): {err_str}", provider=self.provider_name, status_code=status)

        # Fallback string pattern checks
        if "429" in err_str or "quota" in err_lower or "rate" in err_lower:
            raise AIRateLimitError(f"Gemini rate limit exceeded: {err_str}", provider=self.provider_name)
        elif "401" in err_str or "403" in err_str or "auth" in err_lower or "api_key" in err_lower:
            raise AIAuthenticationError(f"Gemini authentication failed: {err_str}", provider=self.provider_name)
        elif "404" in err_str or "not found" in err_lower:
            raise AIModelNotFoundError(f"Gemini model not found: {err_str}", provider=self.provider_name)
        elif "blocked" in err_lower or "safety" in err_lower:
            raise AIContentBlockedError(f"Gemini safety filter blocked the content: {err_str}", provider=self.provider_name)
        elif "503" in err_str or "unavailable" in err_lower or "demand" in err_lower or "timeout" in err_lower:
            raise AITemporaryError(f"Gemini temporary error: {err_str}", provider=self.provider_name, status_code=503)

        # Generic provider error
        raise AIProviderError(f"Gemini error: {err_str}", provider=self.provider_name, is_retryable=True)

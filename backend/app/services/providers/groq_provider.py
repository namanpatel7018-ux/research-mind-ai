"""
Groq AI Provider for ResearchMind AI
Uses official groq SDK.
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

from groq import Groq
import groq

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

logger = logging.getLogger("researchmind.ai.groq")


class GroqProvider(AIProvider):
    """Provider for Groq high-speed inference models."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None
    ):
        self._api_key = os.getenv("GROQ_API_KEY", "") if api_key is None else api_key
        self._model_name = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b") if model is None else model
        self._client: Optional[Groq] = None
        self._init_client()

    def _init_client(self) -> None:
        """Safely initialize the Groq client without exposing secrets."""
        if not self._api_key:
            logger.info("[AI] Groq API key: not configured")
            return

        try:
            self._client = Groq(api_key=self._api_key)
            logger.info(f"[AI] Groq AI initialized successfully (model: {self._model_name})")
        except Exception as exc:
            logger.warning(f"[AI] Warning: Failed to initialize Groq client: {exc}")
            self._client = None

    @property
    def provider_name(self) -> str:
        return "groq"

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
        """Execute text generation with Groq."""
        if not self.is_configured():
            raise AIAuthenticationError(
                "Groq API key not configured. Please set GROQ_API_KEY in .env file.",
                provider=self.provider_name
            )

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": user_prompt})

        try:
            completion = self._client.chat.completions.create(
                model=self._model_name,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature
            )

            if not completion.choices or not completion.choices[0].message:
                raise AITemporaryError(
                    "Groq API returned an empty response.",
                    provider=self.provider_name
                )

            msg = completion.choices[0].message
            content = (msg.content or getattr(msg, "reasoning", "") or "").strip()
            if not content:
                raise AITemporaryError(
                    "Groq API returned an empty response.",
                    provider=self.provider_name
                )

            tokens_used = completion.usage.total_tokens if completion.usage else None

            return AIResponse(
                content=content,
                provider=self.provider_name,
                model=self._model_name,
                tokens_used=tokens_used,
                raw_response=completion
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
        """Execute structured JSON generation with Groq."""
        if not self.is_configured():
            raise AIAuthenticationError(
                "Groq API key not configured. Please set GROQ_API_KEY in .env file.",
                provider=self.provider_name
            )

        # Ensure system prompt mentions JSON format requirement for Groq json_object mode
        json_sys_prompt = system_prompt
        if "json" not in json_sys_prompt.lower():
            json_sys_prompt = f"{system_prompt}\nYou MUST output valid JSON format."

        messages = []
        if json_sys_prompt:
            messages.append({"role": "system", "content": json_sys_prompt})
        messages.append({"role": "user", "content": user_prompt})

        try:
            # Try with native json_object response_format
            completion = self._client.chat.completions.create(
                model=self._model_name,
                messages=messages,
                response_format={"type": "json_object"},
                max_tokens=max_tokens,
                temperature=temperature
            )

            if not completion.choices or not completion.choices[0].message:
                raise AITemporaryError(
                    "Groq API returned empty JSON response.",
                    provider=self.provider_name
                )

            msg = completion.choices[0].message
            content = (msg.content or getattr(msg, "reasoning", "") or "").strip()
            if not content:
                raise AITemporaryError(
                    "Groq API returned empty JSON response.",
                    provider=self.provider_name
                )
            tokens_used = completion.usage.total_tokens if completion.usage else None

            return AIResponse(
                content=content,
                provider=self.provider_name,
                model=self._model_name,
                tokens_used=tokens_used,
                raw_response=completion
            )

        except (AIRateLimitError, AITemporaryError, AIAuthenticationError, AIModelNotFoundError, AIContentBlockedError):
            raise
        except Exception as exc:
            # If response_format json_object is not supported by a specific model, try standard generate
            err_str = str(exc).lower()
            if "response_format" in err_str or "json_object" in err_str:
                logger.info("[AI] Groq model does not support response_format json_object; falling back to prompt-guided JSON.")
                return self.generate(
                    system_prompt=f"{system_prompt}\nReturn ONLY valid JSON.",
                    user_prompt=user_prompt,
                    max_tokens=max_tokens,
                    temperature=temperature
                )
            self._handle_exception(exc)

    def _handle_exception(self, exc: Exception) -> None:
        """Map raw Groq exceptions to typed AIProviderError hierarchy."""
        err_str = str(exc)
        err_lower = err_str.lower()

        if isinstance(exc, groq.RateLimitError):
            raise AIRateLimitError(f"Groq rate limit exceeded: {err_str}", provider=self.provider_name)
        elif isinstance(exc, groq.AuthenticationError):
            raise AIAuthenticationError(f"Groq authentication failed: {err_str}", provider=self.provider_name)
        elif isinstance(exc, groq.NotFoundError):
            raise AIModelNotFoundError(f"Groq model '{self._model_name}' not found: {err_str}", provider=self.provider_name)
        elif isinstance(exc, (groq.InternalServerError, groq.APIConnectionError, groq.APITimeoutError)):
            raise AITemporaryError(f"Groq temporary service failure: {err_str}", provider=self.provider_name)

        if "429" in err_str or "rate limit" in err_lower or "quota" in err_lower:
            raise AIRateLimitError(f"Groq rate limit exceeded: {err_str}", provider=self.provider_name)
        elif "401" in err_str or "403" in err_str or "auth" in err_lower:
            raise AIAuthenticationError(f"Groq authentication failed: {err_str}", provider=self.provider_name)
        elif "404" in err_str or "model_not_found" in err_lower:
            raise AIModelNotFoundError(f"Groq model not found: {err_str}", provider=self.provider_name)
        elif "timeout" in err_lower or "connection" in err_lower or "500" in err_str or "503" in err_str:
            raise AITemporaryError(f"Groq temporary error: {err_str}", provider=self.provider_name)

        raise AIProviderError(f"Groq error: {err_str}", provider=self.provider_name, is_retryable=True)

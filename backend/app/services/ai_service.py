"""
Centralized AI Service for ResearchMind AI
Manages Gemini and Groq providers, task routing, controlled retries,
automatic fallbacks, structured JSON generation, and safe logging.
"""
import re
import json
import time
import logging
from typing import Optional, Any, Dict, List, Tuple

from fastapi import HTTPException

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
from app.services.providers.gemini_provider import GeminiProvider
from app.services.providers.groq_provider import GroqProvider
from app.services.ai_router import AIRouter, TaskType, RoutingDecision

logger = logging.getLogger("researchmind.ai.service")


class AIService:
    """
    Central AI orchestration service for ResearchMind AI.
    Handles multi-provider routing (Gemini + Groq), retries, and bidirectional fallbacks.
    """

    def __init__(
        self,
        gemini_provider: Optional[GeminiProvider] = None,
        groq_provider: Optional[GroqProvider] = None,
        router: Optional[AIRouter] = None,
    ):
        self.gemini = gemini_provider or GeminiProvider()
        self.groq = groq_provider or GroqProvider()
        self.router = router or AIRouter()

        self._providers: Dict[str, AIProvider] = {
            self.gemini.provider_name: self.gemini,
            self.groq.provider_name: self.groq,
        }

        # Safe startup log without secrets
        logger.info(
            f"[AI Service Initialized] Gemini: {'configured (' + self.gemini.model_name + ')' if self.gemini.is_configured() else 'not configured'} | "
            f"Groq: {'configured (' + self.groq.model_name + ')' if self.groq.is_configured() else 'not configured'}"
        )

    def get_provider(self, name: str) -> Optional[AIProvider]:
        """Get provider by name ('gemini' or 'groq')."""
        return self._providers.get(name)

    def get_status(self) -> Dict[str, Any]:
        """Return provider configuration status for health checks (no secrets exposed)."""
        gemini_ok = self.gemini.is_configured()
        groq_ok = self.groq.is_configured()

        return {
            "status": "healthy" if (gemini_ok or groq_ok) else "degraded",
            "gemini_configured": gemini_ok,
            "gemini_model": self.gemini.model_name,
            "groq_configured": groq_ok,
            "groq_model": self.groq.model_name,
            "primary_chat_provider": "groq",
            "primary_research_provider": "gemini",
        }

    def generate(
        self,
        task_type: TaskType,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = 4096,
        temperature: float = 0.2,
        context_size: int = 0,
        preferred_provider: Optional[str] = None
    ) -> AIResponse:
        """
        Execute generation with automatic routing and bidirectional fallback.
        
        Args:
            task_type: Classification of the task (chat, quiz, ppt, compare, etc.)
            system_prompt: System prompt / instructions
            user_prompt: User query / content
            max_tokens: Maximum completion tokens
            temperature: Sampling temperature
            context_size: Total character length of provided context (for routing threshold)
            preferred_provider: Optional manual provider override ('gemini' or 'groq')
        """
        decision = self.router.route(
            task_type=task_type,
            context_size=context_size,
            user_prompt=user_prompt
        )

        # Allow explicit override if requested and configured
        if preferred_provider and preferred_provider in self._providers:
            ordered_providers = []
            pref = self._providers[preferred_provider]
            if pref.is_configured():
                ordered_providers.append(pref)
            # Add other configured providers as fallback
            for p_name, p in self._providers.items():
                if p_name != preferred_provider and p.is_configured():
                    ordered_providers.append(p)
        else:
            ordered_providers = decision.get_execution_order(self._providers)

        if not ordered_providers:
            # Check what's missing and provide a helpful, safe message
            logger.error("[AI] Error: No configured AI providers available.")
            raise HTTPException(
                status_code=500,
                detail=(
                    "No AI providers are configured. Please set GEMINI_API_KEY or GROQ_API_KEY in your .env file."
                )
            )

        primary_provider = ordered_providers[0]
        logger.info(
            f"[AI] Task: {task_type.value} | Selected provider: {primary_provider.provider_name} | "
            f"Model: {primary_provider.model_name}"
        )

        last_error: Optional[Exception] = None

        for idx, provider in enumerate(ordered_providers):
            is_fallback_attempt = idx > 0
            if is_fallback_attempt:
                logger.info(
                    f"[AI] Attempting {provider.provider_name} fallback (Model: {provider.model_name})"
                )

            # Up to 2 attempts per provider for retryable errors (1 initial + 1 retry)
            max_attempts = 2
            for attempt in range(1, max_attempts + 1):
                try:
                    response = provider.generate(
                        system_prompt=system_prompt,
                        user_prompt=user_prompt,
                        max_tokens=max_tokens,
                        temperature=temperature
                    )

                    response.fallback_used = is_fallback_attempt
                    if is_fallback_attempt:
                        logger.info(f"[AI] {provider.provider_name} fallback succeeded")
                    else:
                        logger.info(f"[AI] Provider {provider.provider_name} completed request successfully")

                    return response

                except (AIRateLimitError, AITemporaryError) as retryable_err:
                    last_error = retryable_err
                    if attempt < max_attempts:
                        backoff = 1.0 * attempt
                        logger.warning(
                            f"[AI] {provider.provider_name} temporary error: {retryable_err}. "
                            f"Retrying in {backoff}s (attempt {attempt + 1}/{max_attempts})..."
                        )
                        time.sleep(backoff)
                        continue
                    else:
                        logger.warning(
                            f"[AI] {provider.provider_name} failed after {max_attempts} attempts: {retryable_err}"
                        )
                        break

                except AIContentBlockedError as block_err:
                    # Non-retryable safety block
                    logger.warning(f"[AI] Content blocked by {provider.provider_name}: {block_err}")
                    raise HTTPException(
                        status_code=400,
                        detail="The request was flagged by content safety filters. Please refine your prompt."
                    )

                except AIAuthenticationError as auth_err:
                    # Auth errors shouldn't retry on the same provider
                    last_error = auth_err
                    logger.error(f"[AI] Authentication failed for {provider.provider_name}: {auth_err}")
                    break

                except AIModelNotFoundError as model_err:
                    last_error = model_err
                    logger.error(f"[AI] Configured model not found for {provider.provider_name}: {model_err}")
                    break

                except Exception as unk_err:
                    last_error = unk_err
                    logger.warning(f"[AI] {provider.provider_name} encountered unexpected error: {unk_err}")
                    break

        # If we exhausted all providers
        err_msg = str(last_error) if last_error else "All AI providers failed to generate a response."
        logger.error(f"[AI] All available providers failed. Last error: {err_msg}")

        # Translate to clean HTTPException without revealing secrets
        clean_detail = f"AI service temporarily unavailable: {err_msg[:160]}"
        raise HTTPException(status_code=503, detail=clean_detail)

    def generate_json(
        self,
        task_type: TaskType,
        system_prompt: str,
        user_prompt: str,
        expected_type: type = dict,
        max_tokens: int = 4096,
        temperature: float = 0.2,
        context_size: int = 0
    ) -> Tuple[Any, AIResponse]:
        """
        Execute JSON generation with automatic parsing, validation, and provider fallback on invalid JSON.
        Returns tuple of (parsed_data, ai_response).
        """
        # Ensure system prompt requests strictly valid JSON
        if "json" not in system_prompt.lower():
            system_prompt = f"{system_prompt}\nYou MUST output valid JSON format ONLY with no commentary or markdown formatting."

        decision = self.router.route(task_type, context_size, user_prompt)
        ordered_providers = decision.get_execution_order(self._providers)

        if not ordered_providers:
            raise HTTPException(
                status_code=500,
                detail="No AI providers configured for JSON generation."
            )

        last_parse_error: Optional[str] = None

        for idx, provider in enumerate(ordered_providers):
            is_fallback = idx > 0
            try:
                raw_resp = provider.generate_json(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    max_tokens=max_tokens,
                    temperature=temperature
                )
                raw_resp.fallback_used = is_fallback

                parsed_data = self._clean_and_parse_json(raw_resp.content, expected_type)
                return parsed_data, raw_resp

            except Exception as exc:
                last_parse_error = str(exc)
                logger.warning(
                    f"[AI JSON] Failed with {provider.provider_name}: {exc}. "
                    f"{'Attempting fallback provider...' if idx + 1 < len(ordered_providers) else 'No more providers to try.'}"
                )

        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate valid structured data: {last_parse_error or 'invalid JSON output'}"
        )

    def _clean_and_parse_json(self, raw: str, expected_type: type) -> Any:
        """Robustly extract and validate JSON from model output."""
        cleaned = raw.strip()

        # Remove markdown fences
        cleaned = re.sub(r"^```(?:json)?\s*\n?", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\n?\s*```$", "", cleaned)
        cleaned = cleaned.strip()

        # If expecting list, look for outer brackets
        if expected_type is list:
            m = re.search(r"\[.*\]", cleaned, re.DOTALL)
            if m:
                cleaned = m.group(0)
        # If expecting dict, look for outer braces
        elif expected_type is dict:
            m = re.search(r"\{.*\}", cleaned, re.DOTALL)
            if m:
                cleaned = m.group(0)

        data = json.loads(cleaned)

        if not isinstance(data, expected_type):
            raise ValueError(f"Expected {expected_type.__name__}, got {type(data).__name__}")

        return data


# Global singleton instance for easy import across endpoints
ai_service = AIService()

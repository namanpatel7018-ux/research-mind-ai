"""
Base Provider Abstraction for ResearchMind AI
Provides common interface and data structures for all AI providers.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional, Any, Dict


@dataclass
class AIResponse:
    content: str
    provider: str
    model: str
    fallback_used: bool = False
    tokens_used: Optional[int] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    raw_response: Optional[Any] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "content": self.content,
            "provider": self.provider,
            "model": self.model,
            "fallback_used": self.fallback_used,
            "tokens_used": self.tokens_used,
        }


class AIProviderError(Exception):
    """Base exception for AI provider operations."""
    def __init__(
        self,
        message: str,
        provider: str = "unknown",
        status_code: Optional[int] = None,
        is_retryable: bool = True
    ):
        super().__init__(message)
        self.provider = provider
        self.status_code = status_code
        self.is_retryable = is_retryable


class AIRateLimitError(AIProviderError):
    """Rate limit exceeded (HTTP 429). Retryable with backoff."""
    def __init__(self, message: str, provider: str = "unknown"):
        super().__init__(message, provider=provider, status_code=429, is_retryable=True)


class AITemporaryError(AIProviderError):
    """Temporary server or network failure (HTTP 500, 502, 503, 504). Retryable."""
    def __init__(self, message: str, provider: str = "unknown", status_code: int = 503):
        super().__init__(message, provider=provider, status_code=status_code, is_retryable=True)


class AIAuthenticationError(AIProviderError):
    """Authentication or authorization failure (HTTP 401, 403). Non-retryable."""
    def __init__(self, message: str, provider: str = "unknown"):
        super().__init__(message, provider=provider, status_code=401, is_retryable=False)


class AIModelNotFoundError(AIProviderError):
    """Requested model is unavailable or does not exist (HTTP 404). Non-retryable."""
    def __init__(self, message: str, provider: str = "unknown"):
        super().__init__(message, provider=provider, status_code=404, is_retryable=False)


class AIContentBlockedError(AIProviderError):
    """Content blocked by safety filters. Non-retryable."""
    def __init__(self, message: str, provider: str = "unknown"):
        super().__init__(message, provider=provider, status_code=400, is_retryable=False)


class AIProvider(ABC):
    """Abstract base class for all AI providers."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Name of the provider (e.g., 'gemini', 'groq')."""
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Name of the active model."""
        pass

    @abstractmethod
    def is_configured(self) -> bool:
        """Returns True if the provider has valid configuration/API key."""
        pass

    @abstractmethod
    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = 4096,
        temperature: float = 0.2
    ) -> AIResponse:
        """
        Generate text completion.
        
        Args:
            system_prompt: Instruction/context for the system.
            user_prompt: The user query or input.
            max_tokens: Maximum tokens in completion.
            temperature: Sampling temperature.
            
        Returns:
            AIResponse containing the completion and provider metadata.
        """
        pass

    def generate_json(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = 4096,
        temperature: float = 0.2
    ) -> AIResponse:
        """
        Generate JSON completion. Default implementation delegates to generate().
        Providers may override for native JSON mode.
        """
        return self.generate(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_tokens=max_tokens,
            temperature=temperature
        )

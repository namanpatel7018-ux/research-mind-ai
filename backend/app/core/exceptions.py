"""
ResearchMind AI — Core Exception Hierarchy
============================================
Defines domain, application, and infrastructure exceptions.
"""

class ResearchMindError(Exception):
    """Base exception for all ResearchMind AI domain and application errors."""
    def __init__(self, message: str, details: dict = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


class EntityNotFoundError(ResearchMindError):
    """Raised when an entity is not found in the persistence layer."""
    pass


class AuthenticationError(ResearchMindError):
    """Raised when authentication credentials or token are invalid."""
    pass


class AuthorizationError(ResearchMindError):
    """Raised when a user lacks permissions to access a resource."""
    pass


class ValidationError(ResearchMindError):
    """Raised when business validation rules fail."""
    pass


class DuplicateEntityError(ResearchMindError):
    """Raised when an entity already exists (e.g., duplicate email)."""
    pass


class ServiceUnavailableError(ResearchMindError):
    """Raised when an external service (SMTP, AI provider) is unavailable."""
    pass


class RateLimitExceededError(ResearchMindError):
    """Raised when rate limits are exceeded."""
    pass


class StorageError(ResearchMindError):
    """Raised when file storage or vector index operations fail."""
    pass

"""
Intelligent AI Task Router for ResearchMind AI
Determines whether Groq or Gemini should be the primary provider for each task,
taking into account task type, context size, and query complexity.
"""
import os
import re
import logging
from enum import Enum
from dataclasses import dataclass
from typing import Optional, List, Dict

from app.services.providers.base_provider import AIProvider

logger = logging.getLogger("researchmind.ai.router")


class TaskType(str, Enum):
    CHAT = "chat"
    QUICK_QA = "quick_qa"
    SIMPLE_SUMMARY = "simple_summary"
    QUIZ = "quiz"
    DEEP_ANALYSIS = "deep_analysis"
    COMPARE = "compare"
    LITERATURE_REVIEW = "literature_review"
    PPT = "ppt"
    REPORT = "report"
    RESEARCH_GAPS = "research_gaps"


# Default routing table per ResearchMind specification
DEFAULT_ROUTING: Dict[TaskType, Dict[str, str]] = {
    TaskType.CHAT: {"primary": "groq", "fallback": "gemini"},
    TaskType.QUICK_QA: {"primary": "groq", "fallback": "gemini"},
    TaskType.SIMPLE_SUMMARY: {"primary": "groq", "fallback": "gemini"},
    TaskType.QUIZ: {"primary": "groq", "fallback": "gemini"},
    TaskType.DEEP_ANALYSIS: {"primary": "gemini", "fallback": "groq"},
    TaskType.COMPARE: {"primary": "gemini", "fallback": "groq"},
    TaskType.LITERATURE_REVIEW: {"primary": "gemini", "fallback": "groq"},
    TaskType.RESEARCH_GAPS: {"primary": "gemini", "fallback": "groq"},
    TaskType.PPT: {"primary": "gemini", "fallback": "groq"},
    TaskType.REPORT: {"primary": "gemini", "fallback": "groq"},
}

DEEP_RESEARCH_KEYWORDS = [
    "deep analysis",
    "detailed analysis",
    "research analysis",
    "critical analysis",
    "methodology analysis",
    "methodological comparison",
    "research gap",
    "research gaps",
    "limitations analysis",
    "academic synthesis",
    "systematic review",
    "meta-analysis",
    "statistical significance",
]


@dataclass
class RoutingDecision:
    task_type: TaskType
    primary_provider: str
    fallback_provider: str
    reason: str

    def get_execution_order(self, providers: Dict[str, AIProvider]) -> List[AIProvider]:
        """
        Return the list of available AIProvider instances in prioritized execution order.
        Handles situations where one provider is unconfigured by falling back gracefully.
        """
        primary = providers.get(self.primary_provider)
        fallback = providers.get(self.fallback_provider)

        order: List[AIProvider] = []
        if primary and primary.is_configured():
            order.append(primary)

        if fallback and fallback.is_configured() and fallback not in order:
            order.append(fallback)

        return order


class AIRouter:
    """
    Intelligent router directing tasks between Groq and Gemini.
    """

    def __init__(
        self,
        context_threshold: Optional[int] = None,
        complexity_threshold: Optional[str] = None
    ):
        # Configurable thresholds via environment
        env_ctx_thresh = os.getenv("AI_CONTEXT_THRESHOLD", "15000")
        try:
            self.context_threshold = context_threshold or int(env_ctx_thresh)
        except ValueError:
            self.context_threshold = 15000

        self.complexity_threshold = complexity_threshold or os.getenv("AI_COMPLEXITY_THRESHOLD", "standard")

    def route(
        self,
        task_type: TaskType,
        context_size: int = 0,
        user_prompt: str = ""
    ) -> RoutingDecision:
        """
        Determine the primary and fallback providers for the given request.
        """
        effective_task = task_type
        reason = f"Standard policy for {task_type.value}"

        # 1. Analyze for deep research keywords in interactive tasks
        if task_type in (TaskType.CHAT, TaskType.QUICK_QA, TaskType.SIMPLE_SUMMARY):
            prompt_lower = user_prompt.lower()
            matched_keyword = next((kw for kw in DEEP_RESEARCH_KEYWORDS if kw in prompt_lower), None)
            if matched_keyword:
                effective_task = TaskType.DEEP_ANALYSIS
                reason = f"Promoted to deep_analysis due to keyword '{matched_keyword}' in prompt"

        # 2. Context-aware routing: Large context documents route to Gemini
        if effective_task in (TaskType.CHAT, TaskType.QUICK_QA, TaskType.SIMPLE_SUMMARY):
            if context_size > self.context_threshold:
                effective_task = TaskType.DEEP_ANALYSIS
                reason = f"Promoted to deep_analysis due to large context ({context_size} chars > {self.context_threshold})"

        # 3. Look up routing table
        policy = DEFAULT_ROUTING.get(
            effective_task,
            {"primary": "groq", "fallback": "gemini"}
        )

        decision = RoutingDecision(
            task_type=effective_task,
            primary_provider=policy["primary"],
            fallback_provider=policy["fallback"],
            reason=reason
        )

        logger.info(
            f"[AI Router] Task: {task_type.value} -> Effective: {effective_task.value} | "
            f"Primary: {decision.primary_provider} | Fallback: {decision.fallback_provider} | Reason: {reason}"
        )

        return decision

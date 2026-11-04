"""
Comprehensive Unit and Integration Tests for ResearchMind AI Intelligent Routing:
- Provider Unit Tests (Gemini & Groq)
- Task Routing Logic (Fast workloads -> Groq, Deep workloads -> Gemini, Keyword & Context promotion)
- Bidirectional Fallback (Groq -> Gemini, Gemini -> Groq)
- Configuration Scenarios (Both, Only Gemini, Only Groq, Neither)
- API Endpoint Integration & Health Check
"""
import os
import unittest
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient
from fastapi import HTTPException

from app.api.main import app
from app.services import AIService, AIRouter, TaskType, RoutingDecision
from app.services.providers import (
    AIProvider,
    AIResponse,
    GeminiProvider,
    GroqProvider,
    AIRateLimitError,
    AITemporaryError,
    AIAuthenticationError,
    AIModelNotFoundError,
    AIContentBlockedError,
)


class TestAIRouter(unittest.TestCase):
    """Verify task classification and routing policies."""

    def setUp(self):
        self.router = AIRouter(context_threshold=1000)

    def test_routing_fast_workloads_to_groq(self):
        """Interactive, low-latency tasks must route to Groq as primary."""
        fast_tasks = [
            TaskType.CHAT,
            TaskType.QUICK_QA,
            TaskType.SIMPLE_SUMMARY,
            TaskType.QUIZ,
        ]
        for task in fast_tasks:
            decision = self.router.route(task_type=task, context_size=100, user_prompt="Explain TF-IDF")
            self.assertEqual(decision.primary_provider, "groq", f"Task {task} should route to Groq")
            self.assertEqual(decision.fallback_provider, "gemini", f"Task {task} fallback should be Gemini")

    def test_routing_deep_workloads_to_gemini(self):
        """Heavy, analytical, multi-document research tasks must route to Gemini as primary."""
        deep_tasks = [
            TaskType.DEEP_ANALYSIS,
            TaskType.COMPARE,
            TaskType.LITERATURE_REVIEW,
            TaskType.RESEARCH_GAPS,
            TaskType.PPT,
            TaskType.REPORT,
        ]
        for task in deep_tasks:
            decision = self.router.route(task_type=task, context_size=500, user_prompt="Analyze papers")
            self.assertEqual(decision.primary_provider, "gemini", f"Task {task} should route to Gemini")
            self.assertEqual(decision.fallback_provider, "groq", f"Task {task} fallback should be Groq")

    def test_keyword_promotion_to_gemini(self):
        """Prompt containing deep research keywords should promote interactive tasks to Gemini."""
        prompts = [
            "Please provide a deep analysis of this paper.",
            "Conduct a detailed analysis of the methodology.",
            "Identify the research gaps in the literature.",
            "Provide an academic synthesis of these findings.",
        ]
        for p in prompts:
            decision = self.router.route(task_type=TaskType.CHAT, context_size=100, user_prompt=p)
            self.assertEqual(decision.primary_provider, "gemini")
            self.assertEqual(decision.task_type, TaskType.DEEP_ANALYSIS)

    def test_context_size_threshold_promotion(self):
        """Context larger than threshold should promote to deep analysis (Gemini)."""
        small_decision = self.router.route(task_type=TaskType.CHAT, context_size=500, user_prompt="Simple question")
        self.assertEqual(small_decision.primary_provider, "groq")

        large_decision = self.router.route(task_type=TaskType.CHAT, context_size=2000, user_prompt="Simple question")
        self.assertEqual(large_decision.primary_provider, "gemini")
        self.assertEqual(large_decision.task_type, TaskType.DEEP_ANALYSIS)


class TestProviders(unittest.TestCase):
    """Test Gemini and Groq provider abstraction."""

    def test_gemini_unconfigured_error(self):
        provider = GeminiProvider(api_key="", model="gemini-test")
        self.assertFalse(provider.is_configured())
        with self.assertRaises(AIAuthenticationError):
            provider.generate("system", "user")

    def test_groq_unconfigured_error(self):
        provider = GroqProvider(api_key="", model="groq-test")
        self.assertFalse(provider.is_configured())
        with self.assertRaises(AIAuthenticationError):
            provider.generate("system", "user")

    def test_gemini_provider_generate_mock(self):
        provider = GeminiProvider(api_key="mock_key", model="gemini-test")
        provider._client = MagicMock()
        mock_resp = MagicMock()
        mock_resp.text = "Gemini response text"
        provider._client.models.generate_content.return_value = mock_resp

        res = provider.generate("sys", "user")
        self.assertEqual(res.provider, "gemini")
        self.assertEqual(res.model, "gemini-test")
        self.assertEqual(res.content, "Gemini response text")

    def test_groq_provider_generate_mock(self):
        provider = GroqProvider(api_key="mock_key", model="groq-test")
        provider._client = MagicMock()
        mock_choice = MagicMock()
        mock_choice.message.content = "Groq response text"
        mock_completion = MagicMock()
        mock_completion.choices = [mock_choice]
        mock_completion.usage.total_tokens = 42
        provider._client.chat.completions.create.return_value = mock_completion

        res = provider.generate("sys", "user")
        self.assertEqual(res.provider, "groq")
        self.assertEqual(res.model, "groq-test")
        self.assertEqual(res.content, "Groq response text")
        self.assertEqual(res.tokens_used, 42)


class TestBidirectionalFallback(unittest.TestCase):
    """Verify automatic fallback between Groq and Gemini."""

    def test_groq_failure_falls_back_to_gemini(self):
        mock_groq = MagicMock(spec=GroqProvider)
        mock_groq.provider_name = "groq"
        mock_groq.model_name = "groq-mock"
        mock_groq.is_configured.return_value = True
        mock_groq.generate.side_effect = AIRateLimitError("Groq 429 Rate Limit", provider="groq")

        mock_gemini = MagicMock(spec=GeminiProvider)
        mock_gemini.provider_name = "gemini"
        mock_gemini.model_name = "gemini-mock"
        mock_gemini.is_configured.return_value = True
        mock_gemini.generate.return_value = AIResponse(
            content="Gemini fallback response",
            provider="gemini",
            model="gemini-mock"
        )

        service = AIService(gemini_provider=mock_gemini, groq_provider=mock_groq)
        res = service.generate(task_type=TaskType.CHAT, system_prompt="sys", user_prompt="hi")

        self.assertEqual(res.provider, "gemini")
        self.assertTrue(res.fallback_used)
        self.assertEqual(res.content, "Gemini fallback response")

    def test_gemini_failure_falls_back_to_groq(self):
        mock_gemini = MagicMock(spec=GeminiProvider)
        mock_gemini.provider_name = "gemini"
        mock_gemini.model_name = "gemini-mock"
        mock_gemini.is_configured.return_value = True
        mock_gemini.generate.side_effect = AITemporaryError("Gemini 503 Unavailable", provider="gemini")

        mock_groq = MagicMock(spec=GroqProvider)
        mock_groq.provider_name = "groq"
        mock_groq.model_name = "groq-mock"
        mock_groq.is_configured.return_value = True
        mock_groq.generate.return_value = AIResponse(
            content="Groq fallback response",
            provider="groq",
            model="groq-mock"
        )

        service = AIService(gemini_provider=mock_gemini, groq_provider=mock_groq)
        res = service.generate(task_type=TaskType.LITERATURE_REVIEW, system_prompt="sys", user_prompt="analyze")

        self.assertEqual(res.provider, "groq")
        self.assertTrue(res.fallback_used)
        self.assertEqual(res.content, "Groq fallback response")


class TestConfigurationScenarios(unittest.TestCase):
    """Verify behavior under various credential configurations."""

    def test_both_providers_configured(self):
        mock_gemini = MagicMock(spec=GeminiProvider)
        mock_gemini.provider_name = "gemini"
        mock_gemini.model_name = "gemini-3.6-flash"
        mock_gemini.is_configured.return_value = True

        mock_groq = MagicMock(spec=GroqProvider)
        mock_groq.provider_name = "groq"
        mock_groq.model_name = "openai/gpt-oss-120b"
        mock_groq.is_configured.return_value = True

        service = AIService(gemini_provider=mock_gemini, groq_provider=mock_groq)
        status = service.get_status()

        self.assertEqual(status["status"], "healthy")
        self.assertTrue(status["gemini_configured"])
        self.assertTrue(status["groq_configured"])

    def test_only_gemini_configured(self):
        mock_gemini = MagicMock(spec=GeminiProvider)
        mock_gemini.provider_name = "gemini"
        mock_gemini.model_name = "gemini-mock"
        mock_gemini.is_configured.return_value = True
        mock_gemini.generate.return_value = AIResponse(content="Gemini only", provider="gemini", model="gemini-mock")

        mock_groq = MagicMock(spec=GroqProvider)
        mock_groq.provider_name = "groq"
        mock_groq.model_name = "groq-mock"
        mock_groq.is_configured.return_value = False

        service = AIService(gemini_provider=mock_gemini, groq_provider=mock_groq)
        status = service.get_status()
        self.assertEqual(status["status"], "healthy")
        self.assertTrue(status["gemini_configured"])
        self.assertFalse(status["groq_configured"])

        # Chat normally routes to Groq, but since Groq is unconfigured, it should automatically use Gemini
        res = service.generate(TaskType.CHAT, "sys", "hello")
        self.assertEqual(res.provider, "gemini")

    def test_only_groq_configured(self):
        mock_gemini = MagicMock(spec=GeminiProvider)
        mock_gemini.provider_name = "gemini"
        mock_gemini.model_name = "gemini-mock"
        mock_gemini.is_configured.return_value = False

        mock_groq = MagicMock(spec=GroqProvider)
        mock_groq.provider_name = "groq"
        mock_groq.model_name = "groq-mock"
        mock_groq.is_configured.return_value = True
        mock_groq.generate.return_value = AIResponse(content="Groq only", provider="groq", model="groq-mock")

        service = AIService(gemini_provider=mock_gemini, groq_provider=mock_groq)
        status = service.get_status()
        self.assertEqual(status["status"], "healthy")
        self.assertFalse(status["gemini_configured"])
        self.assertTrue(status["groq_configured"])

        # Literature review normally routes to Gemini, but since Gemini is unconfigured, it uses Groq
        res = service.generate(TaskType.LITERATURE_REVIEW, "sys", "analyze")
        self.assertEqual(res.provider, "groq")

    def test_neither_provider_configured(self):
        mock_gemini = MagicMock(spec=GeminiProvider)
        mock_gemini.provider_name = "gemini"
        mock_gemini.is_configured.return_value = False

        mock_groq = MagicMock(spec=GroqProvider)
        mock_groq.provider_name = "groq"
        mock_groq.is_configured.return_value = False

        service = AIService(gemini_provider=mock_gemini, groq_provider=mock_groq)
        status = service.get_status()
        self.assertEqual(status["status"], "degraded")

        with self.assertRaises(HTTPException) as ctx:
            service.generate(TaskType.CHAT, "sys", "hello")
        self.assertEqual(ctx.exception.status_code, 500)
        self.assertIn("No AI providers are configured", ctx.exception.detail)


class TestAPIEndpoints(unittest.TestCase):
    """Test FastAPI endpoints including /health and /api/ai/chat."""

    def setUp(self):
        self.client = TestClient(app)

    def test_health_check_endpoint(self):
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("status", data)
        self.assertIn("gemini_configured", data)
        self.assertIn("groq_configured", data)
        self.assertIn("primary_chat_provider", data)
        self.assertIn("primary_research_provider", data)
        # Ensure no secrets in health check
        for k in ["api_key", "secret", "password"]:
            self.assertNotIn(k, data)

    def test_chat_endpoint_contract(self):
        from app.rag.models import RAGQueryResponse
        mock_resp = RAGQueryResponse(
            query="Explain machine learning",
            answer="Mocked assistant answer",
            provider="ResearchMind AI",
            fallback_used=False
        )
        with patch("app.api.ai.rag_service.list_documents", return_value=[{"document_id": "test.pdf"}]), \
             patch("app.api.ai.rag_service.query_rag", return_value=mock_resp):
            res = self.client.post("/api/ai/chat", json={"prompt": "Explain machine learning"})
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertEqual(data["query"], "Explain machine learning")
            self.assertEqual(data["answer"], "Mocked assistant answer")
            self.assertEqual(data["provider"], "ResearchMind AI")
            self.assertEqual(data["fallback_used"], False)


if __name__ == "__main__":
    unittest.main()

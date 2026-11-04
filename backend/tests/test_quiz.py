import os
import sys
import tempfile
import unittest
import shutil
from unittest.mock import patch, MagicMock

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from app.api.main import app
from app.api import auth, quiz
from app.db import list_quiz_submissions


class QuizApiTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix='researchmind-quiz-test-')
        auth.AUTH_STORE_PATH = os.path.join(self.temp_dir, 'auth_store.json')
        auth._users.clear()
        auth._pending.clear()
        auth._login_otp.clear()
        auth._token_blacklist.clear()
        self.client = TestClient(app)

        self.test_email = 'scholar@example.com'
        self.test_user = {
            'email': self.test_email,
            'full_name': 'Scholar Test',
            'hashed_password': auth.pwd_context.hash('scholarpass123'),
            'picture': None,
            'is_verified': True,
            'created_at': '2026-01-01T00:00:00+00:00',
            'quiz_history': []
        }
        auth._users[self.test_email] = self.test_user
        auth._save_store()

        self.token = auth._create_access_token(self.test_email)

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_get_sample_questions(self):
        response = self.client.get('/api/quiz/sample-questions')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('questions', data)
        self.assertEqual(data['total'], 10)
        self.assertEqual(len(data['questions']), 10)

        # Inspect first question structure
        q1 = data['questions'][0]
        self.assertIn('question', q1)
        self.assertIn('options', q1)
        self.assertEqual(len(q1['options']), 4)
        self.assertIn('correctAnswerIndex', q1)
        self.assertIn('explanation', q1)

    def test_submit_quiz_unauthenticated(self):
        payload = {
            'score': 8,
            'total': 10,
            'topic': 'Deep Learning & Attention',
            'timeSpentSeconds': 120,
            'answers': [
                {
                    'questionId': 1,
                    'question': 'Sample question 1',
                    'selectedOption': 1,
                    'correctOption': 1,
                    'isCorrect': True,
                    'explanation': 'Correct'
                }
            ]
        }
        response = self.client.post('/api/quiz/submit', json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['status'], 'success')
        self.assertEqual(data['score'], 8)
        self.assertEqual(data['total'], 10)
        self.assertEqual(data['percentage'], 80.0)
        self.assertTrue(data['passed'])
        self.assertIn('submissionId', data)

    def test_submit_quiz_authenticated_and_history(self):
        headers = {'Authorization': f'Bearer {self.token}'}
        payload = {
            'score': 3,
            'total': 10,
            'topic': 'Transformer Architecture',
            'timeSpentSeconds': 95,
            'answers': []
        }
        response = self.client.post('/api/quiz/submit', json=payload, headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['userId'], self.test_email)
        self.assertEqual(data['score'], 3)
        self.assertEqual(data['percentage'], 30.0)
        self.assertFalse(data['passed'])  # 30% is < 40%

        # Check history endpoint
        hist_response = self.client.get('/api/quiz/history?limit=10', headers=headers)
        self.assertEqual(hist_response.status_code, 200)
        hist_data = hist_response.json()
        self.assertEqual(hist_data['userId'], self.test_email)
        self.assertGreaterEqual(hist_data['count'], 1)
        self.assertEqual(hist_data['submissions'][0]['topic'], 'Transformer Architecture')


if __name__ == '__main__':
    unittest.main()

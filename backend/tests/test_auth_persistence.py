import os
import tempfile
import unittest

from app.api import auth


class AuthPersistenceTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix='researchmind-auth-')
        auth.AUTH_STORE_PATH = os.path.join(self.temp_dir, 'auth_store.json')
        auth._users.clear()
        auth._pending.clear()
        auth._login_otp.clear()
        auth._token_blacklist.clear()

    def test_same_email_persists_and_login_request_uses_existing_account(self):
        email = 'alice@example.com'
        auth._users[email] = {
            'email': email,
            'full_name': 'Alice',
            'hashed_password': auth.pwd_context.hash('secret123'),
            'picture': None,
            'is_verified': True,
            'created_at': '2025-01-01T00:00:00+00:00',
        }

        auth._save_store()
        auth._users.clear()
        auth._load_store()

        self.assertIn(email, auth._users)
        self.assertTrue(auth._users[email]['is_verified'])

        request = type('Req', (), {'email': email})()
        response = auth.login_request_otp(request)
        self.assertIn('sent to', response['message'])
        self.assertIn(email, response['message'])


if __name__ == '__main__':
    unittest.main()

import os
import tempfile
import unittest
from unittest.mock import patch, MagicMock

from fastapi.testclient import TestClient
from app.api.main import app
from app.api import auth

class AuthTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix='researchmind-auth-')
        auth.AUTH_STORE_PATH = os.path.join(self.temp_dir, 'auth_store.json')
        auth._users.clear()
        auth._pending.clear()
        auth._login_otp.clear()
        auth._token_blacklist.clear()
        self.client = TestClient(app)

        # Create a default user for testing login
        self.test_email = 'test@example.com'
        self.test_password = 'Pass123!'
        self.test_user = {
            'email': self.test_email,
            'full_name': 'Test User',
            'hashed_password': auth.pwd_context.hash(self.test_password),
            'picture': None,
            'is_verified': True,
            'created_at': '2025-01-01T00:00:00+00:00',
        }
        auth._users[self.test_email] = self.test_user

    def tearDown(self):
        import shutil
        shutil.rmtree(self.temp_dir)

    def test_login_for_access_token_success(self):
        response = self.client.post(
            "/api/auth/token",
            data={"username": self.test_email, "password": self.test_password}
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("access_token", response.json())
        self.assertEqual(response.json()["token_type"], "bearer")

    def test_login_for_access_token_wrong_password(self):
        response = self.client.post(
            "/api/auth/token",
            data={"username": self.test_email, "password": "wrongpassword"}
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"], "Incorrect email or password.")

    def test_login_for_access_token_user_not_found(self):
        response = self.client.post(
            "/api/auth/token",
            data={"username": "notfound@example.com", "password": "password"}
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"], "Incorrect email or password.")

    @patch('app.api.auth._send_otp_email', return_value=True)
    def test_signup_request_otp_success(self, mock_send_otp):
        response = self.client.post(
            "/api/auth/signup/request-otp",
            json={"email": "newuser@example.com", "full_name": "New User", "password": "Pass123!"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("A 6-digit verification code has been sent", response.json()["message"])
        mock_send_otp.assert_called_once()

    def test_signup_request_otp_existing_user(self):
        response = self.client.post(
            "/api/auth/signup/request-otp",
            json={"email": self.test_email, "full_name": "New User", "password": "Pass123!"}
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "An account with this email already exists. Please sign in.")

    @patch('app.api.auth._send_otp_email', return_value=True)
    def test_signup_verify_otp_success(self, mock_send_otp):
        # First, request an OTP
        email = "verifyuser@example.com"
        self.client.post(
            "/api/auth/signup/request-otp",
            json={"email": email, "full_name": "Verify User", "password": "Pass123!"}
        )
        # Get the OTP from the pending dict
        otp = auth._pending[email]["otp"]

        # Now, verify the OTP
        response = self.client.post(
            "/api/auth/signup/verify-otp",
            json={"email": email, "otp": otp}
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("access_token", response.json())

    def test_signup_verify_otp_wrong_otp(self):
        # First, request an OTP
        email = "wrongotp@example.com"
        self.client.post(
            "/api/auth/signup/request-otp",
            json={"email": email, "full_name": "Wrong OTP", "password": "Pass123!"}
        )
        # Now, verify with a wrong OTP
        response = self.client.post(
            "/api/auth/signup/verify-otp",
            json={"email": email, "otp": "000000"}
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Incorrect OTP", response.json()["detail"])

    @patch('app.api.auth._send_otp_email', return_value=True)
    def test_login_request_otp_success(self, mock_send_otp):
        response = self.client.post(
            "/api/auth/login/request-otp",
            json={"email": self.test_email}
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("A 6-digit login code has been sent", response.json()["message"])
        mock_send_otp.assert_called_once()

    @patch('app.api.auth._send_otp_email', return_value=True)
    def test_login_verify_otp_success(self, mock_send_otp):
        # First, request an OTP
        self.client.post(
            "/api/auth/login/request-otp",
            json={"email": self.test_email}
        )
        # Get the OTP from the login_otp dict
        otp = auth._login_otp[self.test_email]["otp"]

        # Now, verify the OTP
        response = self.client.post(
            "/api/auth/login/verify-otp",
            json={"email": self.test_email, "otp": otp}
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("access_token", response.json())

    def test_get_me_success(self):
        # First, login to get a token
        login_response = self.client.post(
            "/api/auth/token",
            data={"username": self.test_email, "password": self.test_password}
        )
        token = login_response.json()["access_token"]

        # Now, get the user
        response = self.client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["email"], self.test_email)

    def test_update_profile_success(self):
        # First, login to get a token
        login_response = self.client.post(
            "/api/auth/token",
            data={"username": self.test_email, "password": self.test_password}
        )
        token = login_response.json()["access_token"]

        # Now, update the profile
        new_name = "Updated Name"
        response = self.client.patch(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
            json={"full_name": new_name}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["full_name"], new_name)
        self.assertEqual(auth._users[self.test_email]["full_name"], new_name)

    def test_change_password_success(self):
        # First, login to get a token
        login_response = self.client.post(
            "/api/auth/token",
            data={"username": self.test_email, "password": self.test_password}
        )
        token = login_response.json()["access_token"]

        # Now, change the password
        new_password = "NewPw12!"
        response = self.client.post(
            "/api/auth/change-password",
            headers={"Authorization": f"Bearer {token}"},
            json={"current_password": self.test_password, "new_password": new_password}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["message"], "Password updated successfully.")

        # Verify that the new password works
        new_login_response = self.client.post(
            "/api/auth/token",
            data={"username": self.test_email, "password": new_password}
        )
        self.assertEqual(new_login_response.status_code, 200)

    def test_logout_success(self):
        # First, login to get a token
        login_response = self.client.post(
            "/api/auth/token",
            data={"username": self.test_email, "password": self.test_password}
        )
        token = login_response.json()["access_token"]

        # Now, logout
        response = self.client.post(
            "/api/auth/logout",
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["message"], "Logged out successfully.")

        # Verify that the token is blacklisted
        me_response = self.client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(me_response.status_code, 401)
        self.assertEqual(me_response.json()["detail"], "Session has been invalidated. Please log in again.")

    def test_delete_account_success(self):
        # First, login to get a token
        login_response = self.client.post(
            "/api/auth/token",
            data={"username": self.test_email, "password": self.test_password}
        )
        token = login_response.json()["access_token"]

        # Now, delete the account
        response = self.client.delete(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["message"], "Account deleted.")
        self.assertNotIn(self.test_email, auth._users)


if __name__ == '__main__':
    unittest.main()

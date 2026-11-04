"""
ResearchMind AI — Email & OTP Dispatch Service
==============================================
Encapsulates SMTP authentication, HTML security email templates, and OTP code delivery.
"""

import os
import smtplib
import secrets
import string
import logging
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from typing import Tuple, Optional
from fastapi import HTTPException, status

logger = logging.getLogger("researchmind.email")

OTP_EXPIRE_MINUTES = 5
OTP_MAX_ATTEMPTS = 3


class EmailService:
    def __init__(self):
        self.reload_config()

    def reload_config(self) -> None:
        self.smtp_host = os.getenv("SMTP_HOST", "")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.email_from = os.getenv("EMAIL_FROM", "ResearchMind AI <noreply@researchmind.ai>")
        self.smtp_enabled = bool(self.smtp_host and self.smtp_user and self.smtp_password)

    @staticmethod
    def generate_otp(length: int = 6) -> str:
        """Generates a cryptographically secure numeric OTP."""
        return "".join(secrets.choice(string.digits) for _ in range(length))

    @staticmethod
    def _smtp_login_safe(server, user: str, password: str):
        """
        Performs direct AUTH PLAIN authentication with Gmail/SMTP to capture authentic 535 error.
        """
        def encode_plain(challenge=None):
            return f"\0{user}\0{password}"
        return server.auth("PLAIN", encode_plain)

    def send_otp_email(
        self,
        to_email: str,
        otp: str,
        purpose: str = "login"
    ) -> Tuple[bool, Optional[str]]:
        """
        Send OTP via SMTP (TLS/SSL).
        Returns (True, None) on success.
        Returns (False, error_detail) when delivery fails (non-production)
        or raises HTTPException in production.
        """
        self.reload_config()
        is_production = os.getenv("ENV", "").lower() == "production" or os.getenv("ENVIRONMENT", "").lower() == "production"

        print(f"\n=======================================================", flush=True)
        print(f"[AUTH OTP] CODE FOR {to_email}: {otp} (purpose: {purpose})", flush=True)
        print(f"=======================================================\n", flush=True)

        if not self.smtp_enabled:
            logger.info(f"SMTP is not configured. OTP for {to_email} is {otp}")
            if is_production:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Email delivery is not configured. Please configure SMTP/Gmail settings before using OTP authentication.",
                )
            return False, "SMTP is not configured on the server."

        now_str = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M UTC")

        if purpose == "login":
            subject = "🔐 Your Sign-In Security Code — ResearchMind AI"
            title_heading = "Sign In to ResearchMind AI"
            eyebrow_text = "SECURE LOGIN · ONE-TIME ACCESS"
            badge_label = "One-Time Access"
            code_badge = "AUTHENTICATION CODE"
            email_type_label = "Account Login"
            description_text = "We received a sign-in attempt for your account. Please enter the one-time authentication code below to complete your sign-in to your research workspace."
        elif purpose == "forgot_password":
            subject = "🔒 Reset Your Password — ResearchMind AI"
            title_heading = "Reset Your Password"
            eyebrow_text = "SECURITY ALERT · PASSWORD RESET"
            badge_label = "Security Auth"
            code_badge = "PASSWORD RESET CODE"
            email_type_label = "Password Reset"
            description_text = "A password reset request was initiated for your ResearchMind AI account. Please enter the one-time security code below to authorize this change."
        else:
            subject = "✨ Verify Your Email Address — ResearchMind AI"
            title_heading = "Verify Your Email Address"
            eyebrow_text = "WELCOME · ACCOUNT ACTIVATION"
            badge_label = "Account Activation"
            code_badge = "VERIFICATION CODE"
            email_type_label = "Account Signup"
            description_text = "Thank you for joining ResearchMind AI. Please enter the verification code below to confirm your address and activate your scientific research workspace."

        logo_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "assets", "logo-icon.png"))
        if not os.path.exists(logo_path):
            logo_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", "public", "logo-icon.png"))
        has_logo = os.path.exists(logo_path)

        logo_html = (
            '<img src="cid:researchmind_logo" width="36" height="36" alt="ResearchMind AI" style="width: 36px; height: 36px; border-radius: 10px; display: block; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);" />'
            if has_logo
            else '<div style="background: linear-gradient(135deg, #4F46E5, #7C3AED); width: 34px; height: 34px; border-radius: 10px; text-align: center; vertical-align: middle; color: #FFFFFF; font-size: 18px; font-weight: bold; line-height: 34px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);">✦</div>'
        )

        html_body = f"""<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark light" />
  <meta name="supported-color-schemes" content="dark light" />
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050711; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; color: #F1F5F9;">
  
  <!-- Preheader text -->
  <div style="display: none; font-size: 1px; color: #050711; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
    Your ResearchMind AI security code is {otp}. Valid for {OTP_EXPIRE_MINUTES} minutes.
  </div>

  <!-- Background Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #050711; margin: 0; padding: 48px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 540px; background-color: #0C101F; border: 1px solid #1E293B; border-radius: 20px; overflow: hidden; box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(99, 102, 241, 0.12);">
          
          <!-- Top Gradient Accent Bar -->
          <tr>
            <td height="4" style="background: linear-gradient(90deg, #4F46E5 0%, #7C3AED 40%, #06B6D4 100%); font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Header Section -->
          <tr>
            <td style="padding: 32px 40px 24px; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <!-- Brand -->
                  <td align="left" vertical-align="middle">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width: 36px; height: 36px; vertical-align: middle;">
                          {logo_html}
                        </td>
                        <td style="padding-left: 12px;">
                          <div style="font-size: 17px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.2px; line-height: 1.2;">
                            ResearchMind <span style="color: #818CF8;">AI</span>
                          </div>
                          <div style="font-size: 10px; font-weight: 600; color: #64748B; letter-spacing: 0.8px; text-transform: uppercase; margin-top: 2px;">
                            Academic Intelligence
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- Security Badge -->
                  <td align="right" vertical-align="middle">
                    <span style="display: inline-block; padding: 4px 10px; background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 999px; font-size: 11px; font-weight: 600; color: #A5B4FC; letter-spacing: 0.5px;">
                      🔒 {badge_label}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 40px;">
              
              <div style="font-size: 12px; font-weight: 700; color: #818CF8; letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 8px;">
                {eyebrow_text}
              </div>
              <h1 style="margin: 0 0 12px; font-size: 24px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.4px; line-height: 1.3;">
                {title_heading}
              </h1>
              <p style="margin: 0 0 28px; font-size: 14px; color: #94A3B8; line-height: 1.6;">
                {description_text}
              </p>

              <!-- OTP Highlight Card -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center" style="background: #080C18; border: 1px solid #28334E; border-radius: 14px; padding: 28px 20px; box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.4), 0 4px 20px rgba(99, 102, 241, 0.08);">
                    <div style="font-size: 11px; font-weight: 700; color: #818CF8; letter-spacing: 1.8px; text-transform: uppercase; margin-bottom: 12px;">
                      {code_badge}
                    </div>
                    <!-- Digit Display -->
                    <div style="font-family: 'SF Mono', Consolas, Monaco, 'Courier New', monospace; font-size: 44px; font-weight: 800; letter-spacing: 14px; color: #FFFFFF; line-height: 1.1; margin-bottom: 14px; padding-left: 14px; text-shadow: 0 0 24px rgba(99, 102, 241, 0.45);">
                      {otp}
                    </div>
                    <!-- Validity Pill -->
                    <table cellpadding="0" cellspacing="0" border="0" align="center">
                      <tr>
                        <td style="background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 20px; padding: 4px 14px;">
                          <span style="font-size: 12px; font-weight: 600; color: #FBBF24; display: inline-block;">
                            ⏱ Code valid for {OTP_EXPIRE_MINUTES} minutes only
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Request Details Metadata Table -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 10px; padding: 14px 18px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 4px 0; font-size: 12px; color: #64748B;" width="40%">Account Recipient</td>
                  <td style="padding: 4px 0; font-size: 12px; font-weight: 600; color: #E2E8F0; text-align: right;" width="60%">{to_email}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 12px; color: #64748B;">Requested At</td>
                  <td style="padding: 4px 0; font-size: 12px; font-weight: 600; color: #E2E8F0; text-align: right;">{now_str}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 12px; color: #64748B;">Security Action</td>
                  <td style="padding: 4px 0; font-size: 12px; font-weight: 600; color: #E2E8F0; text-align: right;">{email_type_label}</td>
                </tr>
              </table>

              <!-- Security Notice Alert -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.18); border-left: 3px solid #EF4444; border-radius: 8px; padding: 12px 16px;">
                <tr>
                  <td style="font-size: 12px; line-height: 1.5; color: #CBD5E1;">
                    <strong style="color: #F87171;">Security Advisory:</strong> If you did not initiate this request, no changes will occur to your account. Do not share this code with anyone. ResearchMind AI support will never ask for your code.
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #070A15; padding: 24px 40px; border-top: 1px solid rgba(255, 255, 255, 0.06); text-align: center;">
              <p style="margin: 0 0 6px; font-size: 12px; font-weight: 600; color: #475569;">
                ResearchMind AI · AI-Powered Academic & Scientific Discovery Engine
              </p>
              <p style="margin: 0; font-size: 11px; color: #334155; line-height: 1.5;">
                This is an automated security notification sent to <span style="color: #64748B;">{to_email}</span>.<br />
                © 2026 ResearchMind AI. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        text_body = (
            f"ResearchMind AI — {email_type_label}\n"
            f"{'=' * 40}\n\n"
            f"Your verification code: {otp}\n\n"
            f"• Recipient: {to_email}\n"
            f"• Requested at: {now_str}\n"
            f"• Validity: {OTP_EXPIRE_MINUTES} minutes only\n\n"
            "SECURITY NOTICE:\n"
            "Never share this code with anyone. ResearchMind AI staff will never ask for your code.\n"
            "If you did not make this request, you can safely disregard this email."
        )

        if has_logo:
            msg = MIMEMultipart("related")
            msg["Subject"] = subject
            msg["From"] = self.email_from
            msg["To"] = to_email

            alt_part = MIMEMultipart("alternative")
            alt_part.attach(MIMEText(text_body, "plain"))
            alt_part.attach(MIMEText(html_body, "html"))
            msg.attach(alt_part)

            try:
                with open(logo_path, "rb") as f:
                    img_data = f.read()
                logo_part = MIMEImage(img_data, _subtype="png")
                logo_part.add_header("Content-ID", "<researchmind_logo>")
                logo_part.add_header("Content-Disposition", "inline", filename="logo-icon.png")
                msg.attach(logo_part)
            except Exception as exc:
                logger.warning(f"Could not attach inline logo image: {exc}")
        else:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.email_from
            msg["To"] = to_email
            msg.attach(MIMEText(text_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))

        clean_user = self.smtp_user.strip() if self.smtp_user else ""
        clean_password = self.smtp_password.strip().replace(" ", "") if self.smtp_password else ""

        human_err = None
        server = None
        try:
            if self.smtp_port == 465:
                server = smtplib.SMTP_SSL(self.smtp_host, 465, timeout=12)
            else:
                server = smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=12)
                server.ehlo()
                server.starttls()
                server.ehlo()

            self._smtp_login_safe(server, clean_user, clean_password)
            server.sendmail(clean_user, [to_email], msg.as_string())
            server.quit()
            return True, None

        except smtplib.SMTPAuthenticationError:
            human_err = "Google rejected your Gmail App Password (535 BadCredentials). Please generate a fresh 16-character App Password at https://myaccount.google.com/apppasswords and update backend/.env."
        except (smtplib.SMTPServerDisconnected, ConnectionResetError):
            human_err = "Google SMTP rejected credentials and closed the connection (BadCredentials). Check your 16-character App Password in backend/.env."
        except Exception as exc:
            human_err = f"SMTP error: {exc}"
        finally:
            if server:
                try:
                    server.close()
                except Exception:
                    pass

        if not human_err:
            human_err = "Failed to deliver email via SMTP."

        print(f"[EMAIL ERROR] Failed to send OTP to {to_email}: {human_err}", flush=True)
        logger.warning(f"Failed to send OTP to {to_email}: {human_err}")

        if is_production:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=human_err,
            )
        return False, human_err


# Singleton instance
email_service = EmailService()

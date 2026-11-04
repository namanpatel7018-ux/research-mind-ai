"""
SMTP Email Test Script
Run this to verify your Gmail app password and SMTP settings.
"""
import os
import sys
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", "")

print("=" * 60)
print("SMTP Configuration Test")
print("=" * 60)
print(f"SMTP Host:     {SMTP_HOST}")
print(f"SMTP Port:     {SMTP_PORT}")
print(f"SMTP User:     {SMTP_USER}")
print(f"SMTP Password: {'*' * len(SMTP_PASSWORD) if SMTP_PASSWORD else '(empty)'}")
print(f"Email From:    {EMAIL_FROM}")
print("=" * 60)

if not SMTP_USER or not SMTP_PASSWORD:
    print("\n❌ ERROR: SMTP_USER or SMTP_PASSWORD is not set in .env")
    print("\nPlease configure:")
    print("  SMTP_USER=your-email@gmail.com")
    print("  SMTP_PASSWORD=your-16-char-app-password")
    print("\nGenerate app password at: https://myaccount.google.com/apppasswords")
    exit(1)

print("\n🔌 Testing SMTP connection...")

import sys
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

msg = MIMEMultipart("alternative")
msg["Subject"] = "ResearchMind AI - SMTP Test"
msg["From"] = EMAIL_FROM
msg["To"] = SMTP_USER

text = "This is a test email from ResearchMind AI backend."
html = """
<html>
  <body>
    <h2>SMTP Test Successful!</h2>
    <p>Your email configuration is working correctly.</p>
    <p><strong>ResearchMind AI</strong></p>
  </body>
</html>
"""

msg.attach(MIMEText(text, "plain"))
msg.attach(MIMEText(html, "html"))

clean_user = SMTP_USER.strip() if SMTP_USER else ""
clean_password = SMTP_PASSWORD.strip().replace(" ", "") if SMTP_PASSWORD else ""

try:
    print(f"Connecting to {SMTP_HOST}:{SMTP_PORT}...")
    server = None
    if SMTP_PORT == 465:
        server = smtplib.SMTP_SSL(SMTP_HOST, 465, timeout=10)
        print("✅ Connected with SSL (Port 465)")
    else:
        try:
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10)
            print(f"✅ Connected to SMTP server on port {SMTP_PORT}")
            server.ehlo()
            server.starttls()
            print("✅ STARTTLS enabled")
            server.ehlo()
        except Exception as tls_err:
            print(f"⚠️ Port {SMTP_PORT} TLS failed ({tls_err}). Trying Port 465 SSL...")
            server = smtplib.SMTP_SSL(SMTP_HOST, 465, timeout=10)
            print("✅ Connected with SSL fallback (Port 465)")

    from_addr = clean_user
    def _encode_plain():
        return f"\0{clean_user}\0{clean_password}"
    try:
        server.auth("PLAIN", _encode_plain)
    except smtplib.SMTPAuthenticationError:
        raise
    except Exception:
        server.login(clean_user, clean_password)
    print(f"✅ Authentication successful as {clean_user}")
    server.sendmail(from_addr, [clean_user], msg.as_string())
    server.quit()
    print(f"✅ Test email sent to {clean_user}")

except (smtplib.SMTPAuthenticationError, smtplib.SMTPServerDisconnected) as e:
    print(f"\n❌ AUTHENTICATION / CONNECTION ERROR: {e}")
    print("\nGmail rejected the login credentials (BadCredentials).")
    print("Possible causes:")
    print("  1. The 16-character Google App Password in .env is incorrect or expired.")
    print("  2. 2-Step Verification is not enabled on your Google Account.")
    print("  3. Your personal Gmail account password was used instead of an App Password.")
    print("\nHOW TO FIX:")
    print("  1. Go to: https://myaccount.google.com/security")
    print("  2. Ensure '2-Step Verification' is turned ON.")
    print("  3. Go to: https://myaccount.google.com/apppasswords")
    print("  4. Create a new App Password (App: 'Other', Name: 'ResearchMind AI').")
    print("  5. Copy the 16-character code (e.g. abcd efgh ijkl mnop).")
    print("  6. In backend/.env, update:")
    print("     SMTP_PASSWORD=abcdefghijklmnop")
    print("  7. Re-run: python test_smtp.py")
    exit(1)

except smtplib.SMTPException as e:
    print(f"\n❌ SMTP ERROR: {e}")
    exit(1)

except Exception as e:
    print(f"\n❌ UNEXPECTED ERROR: {e}")
    exit(1)

print("\n" + "=" * 60)
print("✅ ALL TESTS PASSED - SMTP is working correctly!")
print("=" * 60)
print("\nYou should receive a test email shortly.")
print("Check your inbox (and spam folder) for confirmation.")

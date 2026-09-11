import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

logger = logging.getLogger(__name__)


def send_otp_email(to_email: str, username: str, otp_code: str) -> bool:
    """
    Sends a 6-digit OTP to the user's email address.
    If SMTP credentials are not configured, logs the OTP safely to the console.
    """
    load_dotenv(override=False)

    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "").strip()
    smtp_from_email = os.getenv("SMTP_FROM_EMAIL", "").strip() or smtp_user
    smtp_tls = os.getenv("SMTP_TLS", "true").lower() in ("1", "true", "yes")
    subject = f"{otp_code} is your MSQ Exam App password reset code"

    text_content = f"""Hello {username},

You requested to reset your password for MSQ Exam App.

Your 6-digit verification code is: {otp_code}

This code will expire in 10 minutes. If you did not request this, please ignore this email.
"""

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Password Reset Code</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px;">
  <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="text-align: center; margin-bottom: 24px;">
      <h2 style="color: #1e293b; margin: 0; font-size: 22px;">MSQ Exam Portal</h2>
      <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Password Reset Verification</p>
    </div>
    <p style="color: #334155; font-size: 15px;">Hello <strong>{username}</strong>,</p>
    <p style="color: #475569; font-size: 14px; line-height: 1.5;">
      We received a request to reset your password. Use the following 6-digit code to complete the verification:
    </p>
    <div style="text-align: center; margin: 28px 0;">
      <span style="display: inline-block; background-color: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 14px 28px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #2563eb;">
        {otp_code}
      </span>
    </div>
    <p style="color: #64748b; font-size: 13px; text-align: center;">
      This code expires in <strong>10 minutes</strong>.
    </p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
    <p style="color: #94a3b8; font-size: 12px; line-height: 1.4;">
      If you did not make this request, you can safely ignore this email. Your password will remain unchanged.
    </p>
  </div>
</body>
</html>"""

    has_smtp = bool(smtp_user and smtp_password)

    if has_smtp:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"MSQ Exam App <{smtp_from_email}>"
            msg["To"] = to_email

            part1 = MIMEText(text_content, "plain")
            part2 = MIMEText(html_content, "html")
            msg.attach(part1)
            msg.attach(part2)

            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                if smtp_tls:
                    server.starttls()
                server.login(smtp_user, smtp_password)
                server.sendmail(smtp_from_email, [to_email], msg.as_string())

            logger.info(f"Successfully sent password reset OTP email to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send OTP email via SMTP: {e}")
            print(f"\n[SMTP ERROR] Could not deliver email via {smtp_host}:{smtp_port} -> {e}")
            # Fall back to console print

    # Fallback to local console log
    print("\n" + "=" * 64)
    print("[PASSWORD RESET OTP - LOCAL CONSOLE]")
    print(f"Recipient : {username} <{to_email}>")
    print(f"OTP Code  : {otp_code}")
    print(f"Validity  : 10 Minutes")
    if not has_smtp:
        print("Note      : Live SMTP not configured in .env. Showing OTP here for testing.")
    print("=" * 64 + "\n", flush=True)
    return True

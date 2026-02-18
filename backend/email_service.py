# backend/email_service.py
"""Service d'envoi d'emails via SMTP interne"""
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

logger = logging.getLogger("Inventaire-Robot")

SMTP_HOST = os.getenv("SMTP_HOST", "localhost")
SMTP_PORT = int(os.getenv("SMTP_PORT", "25"))
SMTP_FROM  = os.getenv("SMTP_FROM", "noreply@tonentreprise.com")
APP_URL    = os.getenv("APP_URL", "http://localhost:5173")


def send_email(to: str, subject: str, body_html: str) -> bool:
    """Envoie un email. Retourne True si succès, False sinon."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = SMTP_FROM
        msg["To"]      = to
        msg.attach(MIMEText(body_html, "html", "utf-8"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.sendmail(SMTP_FROM, [to], msg.as_string())

        logger.info(f"✅ Email envoyé à {to} — {subject}")
        return True

    except Exception as e:
        logger.error(f"❌ Erreur envoi email à {to}: {e}")
        return False


def send_password_reset_email(to: str, username: str, token: str) -> bool:
    """Envoie le lien de réinitialisation de mot de passe."""
    reset_url = f"{APP_URL}/reset-password?token={token}"

    body = f"""
    <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2 style="color: #333;">Réinitialisation de mot de passe</h2>
        <p>Bonjour <strong>{username}</strong>,</p>
        <p>Une demande de réinitialisation de mot de passe a été faite pour votre compte.</p>
        <p>Cliquez sur le lien ci-dessous pour choisir un nouveau mot de passe :</p>
        <p style="margin: 30px 0;">
            <a href="{reset_url}"
               style="background:#2563eb; color:white; padding:12px 24px;
                      text-decoration:none; border-radius:6px; font-size:16px;">
                Réinitialiser mon mot de passe
            </a>
        </p>
        <p style="color:#666; font-size:13px;">
            Ce lien expire dans <strong>1 heure</strong>.<br>
            Si vous n'avez pas fait cette demande, ignorez cet email.
        </p>
        <hr style="border:none; border-top:1px solid #eee; margin-top:30px;">
        <p style="color:#999; font-size:12px;">Système de gestion d'inventaire</p>
    </body></html>
    """

    return send_email(to, "Réinitialisation de votre mot de passe", body)
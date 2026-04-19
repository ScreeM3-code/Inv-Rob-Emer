# backend/email_service.py
"""Service d'envoi d'emails via SMTP interne"""
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
import json as _json

logger = logging.getLogger("Inventaire-Robot")

SMTP_HOST     = os.getenv("SMTP_HOST", "localhost")
SMTP_PORT     = int(os.getenv("SMTP_PORT", "25"))
SMTP_FROM     = os.getenv("SMTP_FROM", "noreply@tonentreprise.com")
SMTP_USER     = os.getenv("SMTP_USER", "")       # optionnel — laisser vide si pas d'auth
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")   # optionnel
SMTP_TLS      = os.getenv("SMTP_TLS", "false").lower() == "true"   # STARTTLS
SMTP_SSL      = os.getenv("SMTP_SSL", "false").lower() == "true"   # SSL direct (port 465)
APP_URL       = os.getenv("APP_URL", "http://localhost:5173")


from typing import Optional


def send_email(to: str, subject: str, body_html: str, smtp_config: Optional[dict] = None) -> bool:
    """
    Envoie un email. Retourne True si succès, False sinon.

    La configuration SMTP peut venir soit des variables d'environnement, soit de la base de données via smtp_config.
    """
    if not to:
        logger.warning("⚠️ send_email appelé sans destinataire — ignoré")
        return False

    host = smtp_config.get('host') if smtp_config else SMTP_HOST
    port = smtp_config.get('port') if smtp_config else SMTP_PORT
    sender = smtp_config.get('from') if smtp_config and smtp_config.get('from') else SMTP_FROM
    user = smtp_config.get('user') if smtp_config else SMTP_USER
    password = smtp_config.get('password') if smtp_config else SMTP_PASSWORD
    tls = smtp_config.get('tls') if smtp_config and smtp_config.get('tls') is not None else SMTP_TLS
    ssl = smtp_config.get('ssl') if smtp_config and smtp_config.get('ssl') is not None else SMTP_SSL

    if not host or not port:
        logger.error("❌ Configuration SMTP incomplète")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = sender
        msg["To"] = to
        msg.attach(MIMEText(body_html, "html", "utf-8"))

        logger.info(f"📧 Tentative envoi → {to} | host={host}:{port} | tls={tls} | ssl={ssl} | auth={'oui' if user else 'non'}")

        if ssl:
            with smtplib.SMTP_SSL(host, port, timeout=15) as server:
                server.ehlo()
                if user:
                    server.login(user, password)
                server.sendmail(sender, [to], msg.as_string())
        else:
            with smtplib.SMTP(host, port, timeout=15) as server:
                server.ehlo()
                if tls:
                    server.starttls()
                    server.ehlo()
                if user:
                    server.login(user, password)
                server.sendmail(sender, [to], msg.as_string())

        logger.info(f"✅ Email envoyé à {to} — {subject}")
        return True

    except smtplib.SMTPRecipientsRefused as e:
        logger.error(f"❌ Destinataire refusé {to}: {e}")
        return False
    except smtplib.SMTPSenderRefused as e:
        logger.error(f"❌ Expéditeur refusé ({SMTP_FROM}): {e} — vérifiez SMTP_FROM dans .env")
        return False
    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"❌ Authentification SMTP échouée: {e} — vérifiez SMTP_USER/SMTP_PASSWORD")
        return False
    except ConnectionRefusedError:
        logger.error(f"❌ Connexion refusée à {SMTP_HOST}:{SMTP_PORT} — serveur inaccessible")
        return False
    except TimeoutError:
        logger.error(f"❌ Timeout connexion SMTP {SMTP_HOST}:{SMTP_PORT}")
        return False
    except Exception as e:
        logger.error(f"❌ Erreur envoi email à {to}: {type(e).__name__}: {e}")
        return False


# ──────────────────────────────────────────────────────────────
# Templates de notifications
# ──────────────────────────────────────────────────────────────

def _base_template(title: str, content: str) -> str:
    return f"""
    <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; color: #333;">
      <div style="background:#c0392b; padding:16px 24px; border-radius:8px 8px 0 0;">
        <h2 style="color:white; margin:0; font-size:18px;">🔧 Inventaire Robot — {title}</h2>
      </div>
      <div style="border:1px solid #eee; border-top:none; padding:24px; border-radius:0 0 8px 8px;">
        {content}
        <hr style="border:none; border-top:1px solid #eee; margin:24px 0 16px;">
        <p style="color:#999; font-size:11px; margin:0;">
          Cet email est envoyé automatiquement par le système de gestion d'inventaire.<br>
          Vous pouvez modifier vos préférences de notification dans votre profil.
        </p>
      </div>
    </body></html>
    """


def send_password_reset_email(to: str, username: str, token: str) -> bool:
    """Envoie le lien de réinitialisation de mot de passe."""
    reset_url = f"{APP_URL}/reset-password?token={token}"
    content = f"""
        <p>Bonjour <strong>{username}</strong>,</p>
        <p>Une demande de réinitialisation de mot de passe a été faite pour votre compte.</p>
        <p style="margin: 24px 0;">
            <a href="{reset_url}"
               style="background:#2563eb; color:white; padding:12px 24px;
                      text-decoration:none; border-radius:6px; font-size:15px;">
                Réinitialiser mon mot de passe
            </a>
        </p>
        <p style="color:#666; font-size:13px;">
            Ce lien expire dans <strong>1 heure</strong>.<br>
            Si vous n'avez pas fait cette demande, ignorez cet email.
        </p>
    """
    return send_email(to, "Réinitialisation de votre mot de passe", _base_template("Réinitialisation", content))


def send_notification_pieces_a_commander(to: str, username: str, pieces: list) -> bool:
    """Notifie qu'il y a des pièces à commander (seuil minimum atteint)."""
    rows = "".join([
        f"""<tr>
          <td style="padding:8px 12px; border-bottom:1px solid #eee;">{p.get('NomPièce','')}</td>
          <td style="padding:8px 12px; border-bottom:1px solid #eee; text-align:center;">{p.get('NumPièce','')}</td>
          <td style="padding:8px 12px; border-bottom:1px solid #eee; text-align:center; color:#c0392b; font-weight:bold;">{p.get('QtéenInventaire',0)}</td>
          <td style="padding:8px 12px; border-bottom:1px solid #eee; text-align:center;">{p.get('Qtéàcommander',0)}</td>
        </tr>"""
        for p in pieces
    ])
    content = f"""
        <p>Bonjour <strong>{username}</strong>,</p>
        <p>Les pièces suivantes ont atteint leur seuil minimum et doivent être commandées :</p>
        <table style="width:100%; border-collapse:collapse; margin:16px 0; font-size:13px;">
          <thead>
            <tr style="background:#f5f5f5;">
              <th style="padding:10px 12px; text-align:left; border-bottom:2px solid #ddd;">Pièce</th>
              <th style="padding:10px 12px; text-align:center; border-bottom:2px solid #ddd;">Numéro</th>
              <th style="padding:10px 12px; text-align:center; border-bottom:2px solid #ddd;">Stock actuel</th>
              <th style="padding:10px 12px; text-align:center; border-bottom:2px solid #ddd;">Qté à commander</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
        <p style="margin-top:16px;">
          <a href="{APP_URL}/commandes"
             style="background:#c0392b; color:white; padding:10px 20px;
                    text-decoration:none; border-radius:6px; font-size:14px;">
            Voir les commandes
          </a>
        </p>
    """
    nb = len(pieces)
    return send_email(to, f"⚠️ {nb} pièce{'s' if nb>1 else ''} à commander", _base_template("Pièces à commander", content))


def send_notification_demande_approbation(to: str, username: str, piece_nom: str, piece_ref: int, demande_par: str) -> bool:
    """Notifie un admin qu'une pièce est soumise pour approbation."""
    content = f"""
        <p>Bonjour <strong>{username}</strong>,</p>
        <p>Une nouvelle pièce a été soumise pour approbation par <strong>{demande_par}</strong> :</p>
        <div style="background:#fff8e1; border-left:4px solid #f39c12; padding:12px 16px; margin:16px 0; border-radius:4px;">
          <strong>{piece_nom}</strong> <span style="color:#888;">(réf. #{piece_ref})</span>
        </div>
        <p>
          <a href="{APP_URL}/approbation"
             style="background:#f39c12; color:white; padding:10px 20px;
                    text-decoration:none; border-radius:6px; font-size:14px;">
            Voir les approbations
          </a>
        </p>
    """
    return send_email(to, f"📋 Demande d'approbation — {piece_nom}", _base_template("Demande d'approbation", content))


def send_notification_approbation_result(to: str, username: str, piece_nom: str, statut: str, note: str = "") -> bool:
    """Notifie l'utilisateur du résultat d'une approbation."""
    if statut == "approuvee":
        color = "#27ae60"
        icon = "✅"
        label = "approuvée"
        link_url = f"{APP_URL}/commandes"
        link_label = "Voir les commandes"
    else:
        color = "#c0392b"
        icon = "❌"
        label = "refusée"
        link_url = f"{APP_URL}/inventaire"
        link_label = "Voir l'inventaire"

    note_block = f'<p style="background:#f5f5f5; padding:10px 14px; border-radius:4px; font-style:italic;">Note : {note}</p>' if note else ""
    content = f"""
        <p>Bonjour <strong>{username}</strong>,</p>
        <p>La pièce <strong>{piece_nom}</strong> a été <span style="color:{color}; font-weight:bold;">{icon} {label}</span>.</p>
        {note_block}
        <p>
          <a href="{link_url}"
             style="background:{color}; color:white; padding:10px 20px;
                    text-decoration:none; border-radius:6px; font-size:14px;">
            {link_label}
          </a>
        </p>
    """
    return send_email(to, f"{icon} Approbation {label} — {piece_nom}", _base_template(f"Approbation {label}", content))


def send_notification_piece_commandee(to: str, username: str, piece_nom: str, qte: int) -> bool:
    """Notifie qu'une pièce vient d'être commandée."""
    content = f"""
        <p>Bonjour <strong>{username}</strong>,</p>
        <p>La commande suivante a été passée :</p>
        <div style="background:#e8f5e9; border-left:4px solid #27ae60; padding:12px 16px; margin:16px 0; border-radius:4px;">
          <strong>{piece_nom}</strong> — Quantité : <strong>{qte}</strong>
        </div>
        <p>
          <a href="{APP_URL}/commandes"
             style="background:#27ae60; color:white; padding:10px 20px;
                    text-decoration:none; border-radius:6px; font-size:14px;">
            Voir les commandes
          </a>
        </p>
    """
    return send_email(to, f"🛒 Commande passée — {piece_nom}", _base_template("Commande passée", content))
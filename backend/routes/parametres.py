import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Request
from models import AppSettingsRequest, AppSettingsResponse
from database import get_db_connection
from auth import require_admin
from utils.settings import get_app_settings, upsert_app_settings, ensure_app_settings_table
from email_service import send_email

router = APIRouter(prefix="/parametres", tags=["parametres"])


@router.get("", response_model=AppSettingsResponse)
async def get_parametres(conn: asyncpg.Connection = Depends(get_db_connection)):
    settings = await get_app_settings(conn)
    return AppSettingsResponse(**settings)


@router.put("", response_model=AppSettingsResponse)
async def update_parametres(
        data: AppSettingsRequest,
        conn: asyncpg.Connection = Depends(get_db_connection),
        user: dict = Depends(require_admin)
):
    settings_dict = data.dict(exclude_none=True)
    updated = await upsert_app_settings(conn, settings_dict)
    return AppSettingsResponse(**updated)


@router.post("/test-email")
async def test_smtp(conn: asyncpg.Connection = Depends(get_db_connection), user: dict = Depends(require_admin)):
    settings = await get_app_settings(conn)
    email = user.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Aucun email configuré sur votre compte. Ajoutez-en un e-mail dans votre profil.")

    smtp_host = settings.get("email_host") or None
    smtp_port = settings.get("email_port") or None
    smtp_from = settings.get("email_from") or None
    smtp_user = settings.get("email_user") or None
    smtp_password = settings.get("email_password") or None
    smtp_tls = bool(settings.get("email_tls", True))
    smtp_ssl = bool(settings.get("email_ssl", False))

    success = send_email(
        to=email,
        subject="Test Email - Inventaire Robot",
        body_html="Ceci est un email de test envoyé depuis Inventaire Robot. La configuration SMTP fonctionne correctement.",
        smtp_config={
            "host": smtp_host,
            "port": smtp_port,
            "from": smtp_from,
            "user": smtp_user,
            "password": smtp_password,
            "tls": smtp_tls,
            "ssl": smtp_ssl,
        }
    )

    if not success:
        raise HTTPException(status_code=500, detail="Échec de l'envoi de l'email de test. Vérifiez la configuration SMTP.")
    return {"msg": f"Email de test envoyé à {email}"}

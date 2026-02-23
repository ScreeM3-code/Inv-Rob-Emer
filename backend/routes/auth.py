"""Routes d'authentification et gestion des utilisateurs"""
from datetime import datetime
from typing import Optional
import uuid
import json as _json

from fastapi import APIRouter, Depends, HTTPException, status, Response, Request, Body
import asyncpg

from database import get_db_connection
from auth import (
    require_auth,
    require_admin,
    get_current_user,
    create_access_token,
    hash_password,
    verify_password,
    get_user_by_username,
    pwd_context,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from models.user import (
    LoginRequest,
    CreateUserRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    UpdateUserRequest,
    CreateGroupRequest,
    UpdateGroupRequest,
    NotifPrefsRequest,
)
from email_service import send_password_reset_email, send_email
import secrets

router = APIRouter(prefix="/auth", tags=["auth"])

# Clés valides de notification
VALID_NOTIF_KEYS = {
    "pieces_a_commander",
    "demande_approbation",
    "approbation_accordee",
    "approbation_refusee",
    "piece_commandee",
}


# ==================== Routes d'authentification ====================

@router.post('/login')
async def login(
        data: LoginRequest = Body(...),
        response: Response = None,
        conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Authentification: retourne un JWT si les identifiants sont valides"""
    user = await get_user_by_username(conn, data.username)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur ou mot de passe invalide"
        )

    if not verify_password(data.password, user['password_hash']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur ou mot de passe invalide"
        )

    import json
    raw_perms = user.get('group_permissions') or {}
    if isinstance(raw_perms, str):
        raw_perms = json.loads(raw_perms)

    token = create_access_token({
        "sub":         user['username'],
        "role":        user['role'],
        "id":          str(user['id']),
        "group":       user.get('group_name') or user['role'],
        "permissions": raw_perms,
    })

    if response is not None:
        response.set_cookie(
            key="access_token",
            value=token,
            httponly=True,
            samesite="lax",
            secure=False,
            max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id":          str(user['id']),
            "username":    user['username'],
            "role":        user['role'],
            "email":       user.get('email'),
            "group":       user.get('group_name') or user['role'],
            "permissions": raw_perms,
        }
    }


@router.get('/me')
async def me(user: dict = Depends(get_current_user)):
    """Retourne l'utilisateur connecté avec ses permissions."""
    return {"user": user}


@router.post('/logout')
async def logout(response: Response):
    """Supprime le cookie d'authentification"""
    response.delete_cookie('access_token')
    return {"msg": "Logged out"}


@router.post('/refresh')
async def refresh_token(
        response: Response,
        request: Request,
        conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Renouvelle le token si l'utilisateur a un token valide"""
    from auth import get_current_user_from_token
    token = request.cookies.get('access_token')

    try:
        user = await get_current_user_from_token(token, conn)
    except HTTPException:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Impossible de rafraîchir le token"
        )

    new_token = create_access_token({
        "sub": user['username'],
        "role": user['role'],
        "id": user['id']
    })

    response.set_cookie(
        key="access_token",
        value=new_token,
        httponly=True,
        samesite="none",
        secure=False,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    return {"access_token": new_token, "token_type": "bearer"}


@router.post('/forgot-password')
async def forgot_password(data: ForgotPasswordRequest, request: Request):
    """Envoie un email de réinitialisation si l'adresse est connue."""
    pool = request.app.state.pool
    async with pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT id, username, email FROM users WHERE email = $1",
            data.email.lower().strip()
        )

    if not user:
        return {"msg": "Si cet email existe, un lien vous a été envoyé."}

    token = secrets.token_urlsafe(32)
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE",
            user['id']
        )
        await conn.execute(
            """INSERT INTO password_reset_tokens (user_id, token, expires_at)
               VALUES ($1, $2, NOW() + INTERVAL '1 hour')""",
            user['id'], token
        )

    send_password_reset_email(user['email'], user['username'], token)
    return {"msg": "Si cet email existe, un lien vous a été envoyé."}


@router.post('/reset-password')
async def reset_password(data: ResetPasswordRequest, request: Request):
    """Applique le nouveau mot de passe si le token est valide."""
    pool = request.app.state.pool
    async with pool.acquire() as conn:
        record = await conn.fetchrow(
            """SELECT prt.user_id, prt.expires_at, prt.used
               FROM password_reset_tokens prt
               WHERE prt.token = $1""",
            data.token
        )

        if not record:
            raise HTTPException(status_code=400, detail="Token invalide ou expiré")
        if record['used']:
            raise HTTPException(status_code=400, detail="Ce lien a déjà été utilisé")
        if record['expires_at'].replace(tzinfo=None) < datetime.utcnow():
            raise HTTPException(status_code=400, detail="Ce lien a expiré")

        if len(data.new_password) < 8:
            raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 8 caractères")

        new_hash = pwd_context.hash(data.new_password)
        await conn.execute(
            "UPDATE users SET password_hash = $1 WHERE id = $2",
            new_hash, record['user_id']
        )
        await conn.execute(
            "UPDATE password_reset_tokens SET used = TRUE WHERE token = $1",
            data.token
        )

    return {"msg": "Mot de passe mis à jour avec succès"}


# ==================== Gestion des utilisateurs ====================

@router.get('/users')
async def list_users(request: Request, user: dict = Depends(require_admin)):
    """Retourne la liste des utilisateurs avec leur groupe."""
    pool = request.app.state.pool
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT u.id, u.username, u.email, u.role, u.group_id,
                      g.name AS group_name, g.permissions
               FROM users u
               LEFT JOIN user_groups g ON u.group_id = g.id
               ORDER BY u.username"""
        )
    return {"users": [dict(r) for r in rows]}


@router.post('/users')
async def create_user(data: CreateUserRequest, request: Request, user: dict = Depends(require_admin)):
    """Crée un utilisateur avec email et groupe."""
    pool = request.app.state.pool
    async with pool.acquire() as conn:
        existing = await conn.fetchrow(
            "SELECT id FROM users WHERE username = $1", data.username
        )
        if existing:
            raise HTTPException(status_code=400, detail="Utilisateur existe déjà")

        user_id = uuid.uuid4()
        hashed = pwd_context.hash(data.password)

        group = await conn.fetchrow(
            "SELECT id FROM user_groups WHERE name = $1", data.role or 'user'
        )
        group_id = group['id'] if group else None

        await conn.execute(
            """INSERT INTO users (id, username, password_hash, role, group_id, created_at)
               VALUES ($1, $2, $3, $4, $5, NOW())""",
            user_id, data.username, hashed, data.role or 'user', group_id
        )
    return {"msg": "Utilisateur créé", "user": {"username": data.username, "role": data.role}}


@router.patch('/users/{username}')
async def update_user(username: str, data: UpdateUserRequest, request: Request, user: dict = Depends(require_admin)):
    """Met à jour email et/ou groupe d'un utilisateur."""
    pool = request.app.state.pool
    async with pool.acquire() as conn:
        existing = await conn.fetchrow(
            "SELECT id FROM users WHERE username = $1", username
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable")

        if data.email is not None:
            await conn.execute(
                "UPDATE users SET email = $1 WHERE username = $2",
                data.email.lower().strip(), username
            )
        if data.group_id is not None:
            await conn.execute(
                "UPDATE users SET group_id = $1 WHERE username = $2",
                data.group_id, username
            )
        if data.role is not None:
            await conn.execute(
                "UPDATE users SET role = $1 WHERE username = $2",
                data.role, username
            )

    return {"msg": f"Utilisateur {username} mis à jour"}


@router.delete('/users/{username}')
async def delete_user(
        username: str,
        user: dict = Depends(require_admin),
        conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Supprime un utilisateur (admin seulement)"""
    if username == user['username']:
        raise HTTPException(status_code=400, detail="Impossible de supprimer votre propre compte")

    existing_user = await get_user_by_username(conn, username)
    if not existing_user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    try:
        await conn.execute("DELETE FROM users WHERE username = $1", username)
        return {"msg": f"Utilisateur {username} supprimé"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression: {str(e)}")


@router.patch('/users/{username}/password')
async def change_password(
        username: str,
        new_password: str = Body(..., embed=True),
        user: dict = Depends(require_admin),
        conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Change le mot de passe d'un utilisateur (admin seulement)"""
    existing_user = await get_user_by_username(conn, username)
    if not existing_user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 6 caractères")

    password_hash = hash_password(new_password)
    try:
        await conn.execute("UPDATE users SET password_hash = $1 WHERE username = $2", password_hash, username)
        return {"msg": f"Mot de passe de {username} modifié"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la modification: {str(e)}")


# ==================== Gestion des groupes ====================

@router.get('/groups')
async def list_groups(request: Request, user: dict = Depends(require_admin)):
    """Retourne tous les groupes de permissions."""
    pool = request.app.state.pool
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM user_groups ORDER BY name")
    return {"groups": [dict(r) for r in rows]}


@router.post('/groups')
async def create_group(data: CreateGroupRequest, request: Request, user: dict = Depends(require_admin)):
    """Crée un nouveau groupe de permissions."""
    import json
    pool = request.app.state.pool
    async with pool.acquire() as conn:
        existing = await conn.fetchrow(
            "SELECT id FROM user_groups WHERE name = $1", data.name
        )
        if existing:
            raise HTTPException(status_code=400, detail="Un groupe avec ce nom existe déjà")

        row = await conn.fetchrow(
            """INSERT INTO user_groups (name, description, permissions)
               VALUES ($1, $2, $3) RETURNING *""",
            data.name,
            data.description or "",
            json.dumps(data.permissions)
        )
    return {"msg": "Groupe créé", "group": dict(row)}


@router.patch('/groups/{group_id}')
async def update_group(
        group_id: int,
        data: UpdateGroupRequest,
        request: Request,
        user: dict = Depends(require_admin)
):
    """Met à jour un groupe de permissions."""
    import json
    pool = request.app.state.pool
    async with pool.acquire() as conn:
        existing = await conn.fetchrow(
            "SELECT id FROM user_groups WHERE id = $1", group_id
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Groupe introuvable")

        await conn.execute(
            """UPDATE user_groups SET description = $1, permissions = $2 WHERE id = $3""",
            data.description,
            json.dumps(data.permissions),
            group_id
        )
    return {"msg": "Groupe mis à jour"}


@router.delete('/groups/{group_id}')
async def delete_group(
        group_id: int,
        request: Request,
        user: dict = Depends(require_admin)
):
    """Supprime un groupe de permissions."""
    pool = request.app.state.pool
    async with pool.acquire() as conn:
        existing = await conn.fetchrow(
            "SELECT id FROM user_groups WHERE id = $1", group_id
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Groupe introuvable")

        users_in_group = await conn.fetchval(
            "SELECT COUNT(*) FROM users WHERE group_id = $1", group_id
        )
        if users_in_group > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Impossible de supprimer: {users_in_group} utilisateur(s) dans ce groupe"
            )

        await conn.execute("DELETE FROM user_groups WHERE id = $1", group_id)
    return {"msg": "Groupe supprimé"}


# ==================== Préférences de notification ====================

@router.get('/me/notification-prefs')
async def get_notif_prefs(request: Request, user: dict = Depends(require_auth)):
    """Retourne les préférences de notification de l'utilisateur connecté."""
    import json
    pool = request.app.state.pool
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT notification_prefs FROM users WHERE username = $1",
            user['username']
        )

    raw = row['notification_prefs'] if row else None
    prefs = json.loads(raw) if raw else {}
    return {"prefs": prefs}


@router.put('/me/notification-prefs')
async def update_notif_prefs(
        data: NotifPrefsRequest,
        request: Request,
        user: dict = Depends(require_auth)
):
    """Met à jour les préférences de notification."""
    import json
    pool = request.app.state.pool

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT notification_prefs FROM users WHERE username = $1",
            user['username']
        )
        raw = row['notification_prefs']
        current = json.loads(raw) if raw else {}

    updates = data.dict(exclude_none=True)
    current.update(updates)

    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE users SET notification_prefs = $1 WHERE username = $2",
            _json.dumps(current), user['username']
        )

    return {"msg": "Préférences sauvegardées", "prefs": current}


@router.put('/me/email')
async def update_my_email(
    email: str = Body(..., embed=True),
    request: Request = None,
    user: dict = Depends(require_auth)
):
    """Permet à l'utilisateur de mettre à jour son propre email."""
    pool = request.app.state.pool
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE users SET email = $1 WHERE username = $2",
            email.lower().strip() if email else None,
            user['username']
        )
    return {"msg": "Email mis à jour"}


@router.post('/test-email')
async def test_email(
    request: Request,
    user: dict = Depends(require_admin)
):
    """(Admin seulement) Envoie un email de test à l'adresse de l'admin connecté."""
    pool = request.app.state.pool
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT email FROM users WHERE username = $1", user['username']
        )

    if not row or not row['email']:
        raise HTTPException(
            status_code=400,
            detail="Aucun email configuré sur votre compte. Ajoutez-en un d'abord."
        )

    try:
        send_email(
            to_email=row['email'],
            subject="Test Email - Inventaire Robot",
            body="Ceci est un email de test envoyé depuis Inventaire Robot. La configuration SMTP fonctionne correctement."
        )
        return {"msg": f"Email de test envoyé à {row['email']}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur envoi email: {str(e)}")

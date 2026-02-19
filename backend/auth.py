# backend/auth.py
"""Système d'authentification avec JWT et PostgreSQL (asyncpg)"""
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status, Response, Request, APIRouter, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
import os
from pydantic import BaseModel as PydanticBaseModel
import uuid
import asyncpg
from database import get_db_connection
import secrets
from email_service import send_password_reset_email, send_email
import json as _json, json

# Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "CHANGE_ME_IN_PRODUCTION")  # ⚠️ Mettre dans .env
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 90  # 90 jours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

router = APIRouter(prefix="/auth", tags=["auth"])

# Liste complète des permissions disponibles dans le système
ALL_PERMISSIONS = [
    "inventaire_view", "inventaire_create", "inventaire_update",
    "inventaire_delete", "inventaire_sortie_rapide",
    "groupes_view", "groupes_create", "groupes_update", "groupes_delete",
    "fournisseur_view", "fournisseur_create", "fournisseur_update", "fournisseur_delete",
    "fabricant_view", "fabricant_create", "fabricant_update", "fabricant_delete",
    "commandes_view", "commandes_create", "commandes_update",
    "soumissions_view", "soumissions_create", "soumissions_update",
    "receptions_view", "receptions_create", "receptions_update",
    "historique_view",
    "can_delete_any", "can_manage_users", "can_approve_orders", "can_submit_approval",
]

# Clés valides de notification
VALID_NOTIF_KEYS = {
    "pieces_a_commander",
    "demande_approbation",
    "approbation_accordee",
    "approbation_refusee",
    "piece_commandee",
}

class NotifPrefsRequest(PydanticBaseModel):
    pieces_a_commander:   Optional[bool] = None
    demande_approbation:  Optional[bool] = None
    approbation_accordee: Optional[bool] = None
    approbation_refusee:  Optional[bool] = None
    piece_commandee:      Optional[bool] = None

# ==================== Modèles Pydantic ====================
class LoginRequest(PydanticBaseModel):
    username: str
    password: str


class CreateUserRequest(PydanticBaseModel):
    username: str
    password: str
    role: Optional[str] = 'user'


class UserResponse(PydanticBaseModel):
    id: str
    username: str
    role: str
    created_at: Optional[datetime] = None

class ForgotPasswordRequest(PydanticBaseModel):
    email: str

class ResetPasswordRequest(PydanticBaseModel):
    token: str
    new_password: str

class UpdateUserRequest(PydanticBaseModel):
    email: Optional[str] = None
    group_id: Optional[int] = None
    role: Optional[str] = None

class CreateGroupRequest(PydanticBaseModel):
    name: str
    description: Optional[str] = None
    permissions: dict  # { "inventaire_view": True, ... }


class UpdateGroupRequest(PydanticBaseModel):
    description: Optional[str] = None
    permissions: dict


# ==================== Fonctions utilitaires ====================
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifie si le mot de passe correspond au hash"""
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    """Hash un mot de passe"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Crée un JWT token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_user_by_username(conn, username: str):
    """Récupère un utilisateur avec son groupe et ses permissions."""
    row = await conn.fetchrow(
        """SELECT u.id, u.username, u.password_hash, u.role,
                  u.email, u.group_id,
                  g.name        AS group_name,
                  g.permissions AS group_permissions
           FROM users u
           LEFT JOIN user_groups g ON u.group_id = g.id
           WHERE u.username = $1""",
        username
    )
    return dict(row) if row else None


async def get_current_user_from_token(
        token: str,
        conn: asyncpg.Connection
):
    """Vérifie le token JWT et retourne l'utilisateur depuis la DB"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalide ou expiré",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        if not token:
            raise credentials_exception

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception

        # Vérifier que l'utilisateur existe toujours dans la DB
        user = await get_user_by_username(conn, username)
        if user is None:
            raise credentials_exception

        return {
            "username": payload.get("sub"),
            "role": payload.get("role"),
            "id": payload.get("id"),
            "group": payload.get("group"),
            "permissions": payload.get("permissions", {}),
        }

    except JWTError:
        raise credentials_exception


async def get_current_user(
        request: Request,
        credentials: HTTPAuthorizationCredentials = Depends(security),
        conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Vérifie le token JWT (header ou cookie) et retourne l'utilisateur"""
    token = None

    # 1) Priorité à l'en-tête Authorization
    if credentials and getattr(credentials, 'credentials', None):
        token = credentials.credentials
    # 2) Sinon essayer le cookie
    if not token:
        token = request.cookies.get('access_token')

    return await get_current_user_from_token(token, conn)


# ==================== Dependencies ====================
async def require_auth(user: dict = Depends(get_current_user)):
    """Protège une route - nécessite authentification"""
    return user


async def require_admin(user: dict = Depends(get_current_user)):
    """Protège une route - nécessite rôle admin"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Accès refusé - Admin seulement")
    return user


# ==================== Routes d'authentification ====================
@router.post('/login')
async def login(
        data: LoginRequest = Body(...),
        response: Response = None,
        conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Authentification: retourne un JWT si les identifiants sont valides"""

    # Récupérer l'utilisateur depuis la DB
    user = await get_user_by_username(conn, data.username)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur ou mot de passe invalide"
        )

    # Vérifier le mot de passe
    if not verify_password(data.password, user['password_hash']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur ou mot de passe invalide"
        )

    # Créer le token
    import json

    # Charger les permissions depuis le JSONB (asyncpg retourne une string ou dict)
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

    # Placer le token dans un cookie HttpOnly
    if response is not None:
        response.set_cookie(
            key="access_token",
            value=token,
            httponly=True,
            samesite="lax",
            secure=False,  # À passer à True en production avec HTTPS
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


# ==================== Gestion des utilisateurs ====================

@router.delete('/users/{username}')
async def delete_user(
        username: str,
        user: dict = Depends(require_admin),
        conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Supprime un utilisateur (admin seulement)"""

    # Empêcher la suppression de son propre compte
    if username == user['username']:
        raise HTTPException(status_code=400, detail="Impossible de supprimer votre propre compte")

    # Vérifier que l'utilisateur existe
    existing_user = await get_user_by_username(conn, username)
    if not existing_user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    # Supprimer l'utilisateur
    query = "DELETE FROM users WHERE username = $1"

    try:
        await conn.execute(query, username)
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

    # Vérifier que l'utilisateur existe
    existing_user = await get_user_by_username(conn, username)
    if not existing_user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    # Valider le nouveau mot de passe
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 6 caractères")

    # Mettre à jour le mot de passe
    password_hash = hash_password(new_password)
    query = "UPDATE users SET password_hash = $1 WHERE username = $2"

    try:
        await conn.execute(query, password_hash, username)
        return {"msg": f"Mot de passe de {username} modifié"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la modification: {str(e)}")
    
@router.post('/forgot-password')
async def forgot_password(data: ForgotPasswordRequest, request: Request):
    """Envoie un email de réinitialisation si l'adresse est connue."""
    pool = request.app.state.pool
    async with pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT id, username, email FROM users WHERE email = $1",
            data.email.lower().strip()
        )

    # On répond toujours OK pour ne pas révéler si l'email existe
    if not user:
        return {"msg": "Si cet email existe, un lien vous a été envoyé."}

    token = secrets.token_urlsafe(32)
    async with pool.acquire() as conn:
        # Invalider les anciens tokens de cet utilisateur
        await conn.execute(
            "UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE",
            user['id']
        )
        # Créer le nouveau token (expire dans 1h)
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

        # Mettre à jour le mot de passe
        await conn.execute(
            "UPDATE users SET password_hash = $1 WHERE id = $2",
            new_hash, record['user_id']
        )
        # Marquer le token comme utilisé
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

        import uuid
        user_id = uuid.uuid4()
        hashed = pwd_context.hash(data.password)

        # Trouver le group_id selon le rôle par défaut
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


@router.get('/groups')
async def list_groups(request: Request, user: dict = Depends(require_admin)):
    """Retourne tous les groupes de permissions."""
    pool = request.app.state.pool
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM user_groups ORDER BY name")
    return {"groups": [dict(r) for r in rows]}

@router.get('/groups/permissions-list')
async def list_available_permissions(user: dict = Depends(require_admin)):
    """Retourne la liste de toutes les permissions disponibles."""
    return {"permissions": ALL_PERMISSIONS}


@router.post('/groups')
async def create_group(
    data: CreateGroupRequest,
    request: Request,
    user: dict = Depends(require_admin)
):
    """Crée un nouveau groupe de permissions."""
    pool = request.app.state.pool
    async with pool.acquire() as conn:
        existing = await conn.fetchrow(
            "SELECT id FROM user_groups WHERE name = $1", data.name.lower().strip()
        )
        if existing:
            raise HTTPException(status_code=400, detail="Un groupe avec ce nom existe déjà")

        row = await conn.fetchrow(
            """INSERT INTO user_groups (name, description, permissions)
               VALUES ($1, $2, $3)
               RETURNING id, name, description, permissions""",
            data.name.lower().strip(),
            data.description or '',
            _json.dumps(data.permissions)
        )
    return {"msg": "Groupe créé", "group": dict(row)}


@router.put('/groups/{group_id}')
async def update_group(
    group_id: int,
    data: UpdateGroupRequest,
    request: Request,
    user: dict = Depends(require_admin)
):
    """Met à jour la description et les permissions d'un groupe."""
    pool = request.app.state.pool
    async with pool.acquire() as conn:
        existing = await conn.fetchrow(
            "SELECT id, name FROM user_groups WHERE id = $1", group_id
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Groupe introuvable")

        # Empêcher la modification du groupe admin
        if existing['name'] == 'admin':
            raise HTTPException(status_code=400, detail="Le groupe admin ne peut pas être modifié")

        row = await conn.fetchrow(
            """UPDATE user_groups
               SET description = $1, permissions = $2
               WHERE id = $3
               RETURNING id, name, description, permissions""",
            data.description,
            _json.dumps(data.permissions),
            group_id
        )
    return {"msg": "Groupe mis à jour", "group": dict(row)}


@router.delete('/groups/{group_id}')
async def delete_group(
    group_id: int,
    request: Request,
    user: dict = Depends(require_admin)
):
    """Supprime un groupe (impossible si des utilisateurs y sont assignés)."""
    pool = request.app.state.pool
    async with pool.acquire() as conn:
        existing = await conn.fetchrow(
            "SELECT id, name FROM user_groups WHERE id = $1", group_id
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Groupe introuvable")

        # Protéger les groupes système
        if existing['name'] in ('admin', 'user', 'acheteur'):
            raise HTTPException(status_code=400, detail=f"Le groupe '{existing['name']}' est un groupe système et ne peut pas être supprimé")

        # Vérifier si des users utilisent ce groupe
        count = await conn.fetchval(
            "SELECT COUNT(*) FROM users WHERE group_id = $1", group_id
        )
        if count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Impossible de supprimer : {count} utilisateur(s) appartiennent à ce groupe"
            )

        await conn.execute("DELETE FROM user_groups WHERE id = $1", group_id)

    return {"msg": f"Groupe supprimé"}

@router.get('/me/notification-prefs')
async def get_my_notif_prefs(
    request: Request,
    user: dict = Depends(require_auth)
):
    """Retourne les préférences de notification de l'utilisateur connecté."""
    pool = request.app.state.pool
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT email, notification_prefs FROM users WHERE username = $1",
            user['username']
        )
    if not row:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    raw = row['notification_prefs']

    if isinstance(raw, str):
        prefs = json.loads(raw)  # ← transforme la chaîne JSON en dict
    else:
        prefs = raw or {}

    print(prefs)
    # Valeurs par défaut si clé absente
    defaults = {
        "pieces_a_commander":   True,
        "demande_approbation":  True,
        "approbation_accordee": True,
        "approbation_refusee":  True,
        "piece_commandee":      False,
    }
    for k, v in defaults.items():
        prefs.setdefault(k, v)

    return {
        "email":  row['email'],
        "prefs":  prefs,
        "has_email": bool(row['email'])
    }


@router.put('/me/notification-prefs')
async def update_my_notif_prefs(
    data: NotifPrefsRequest,
    request: Request,
    user: dict = Depends(require_auth)
):
    """Met à jour les préférences de notification de l'utilisateur connecté."""
    pool = request.app.state.pool

    # Construire l'objet prefs en fusionnant avec l'existant
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT notification_prefs FROM users WHERE username = $1",
            user['username']
        )

        raw = row['notification_prefs']
        current = json.loads(raw) if raw else {}

    # Appliquer seulement les champs fournis
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
    """
    (Admin seulement) Envoie un email de test à l'adresse de l'admin connecté.
    Utile pour diagnostiquer la config SMTP.
    """
    import os
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

    smtp_info = {
        "SMTP_HOST":  os.getenv("SMTP_HOST", "localhost"),
        "SMTP_PORT":  os.getenv("SMTP_PORT", "25"),
        "SMTP_FROM":  os.getenv("SMTP_FROM", "non défini"),
        "SMTP_TLS":   os.getenv("SMTP_TLS", "false"),
        "SMTP_SSL":   os.getenv("SMTP_SSL", "false"),
        "SMTP_USER":  "oui" if os.getenv("SMTP_USER") else "non",
    }
    info_rows = "".join(f"<tr><td style='padding:4px 12px;color:#666'>{k}</td><td style='padding:4px 12px;font-weight:bold'>{v}</td></tr>" for k,v in smtp_info.items())

    body = f"""
    <html><body style="font-family:Arial,sans-serif;max-width:500px;margin:auto;">
      <h2 style="color:#c0392b;">✅ Test SMTP — Inventaire Robot</h2>
      <p>Si vous recevez cet email, votre configuration SMTP fonctionne correctement.</p>
      <h4 style="margin-top:20px;">Configuration actuelle :</h4>
      <table style="font-size:13px;">{info_rows}</table>
      <p style="color:#888;font-size:12px;margin-top:20px;">Envoyé par {user['username']} via le panneau admin.</p>
    </body></html>
    """

    ok = send_email(row['email'], "✅ Test SMTP — Inventaire Robot", body)
    if ok:
        return {"msg": f"Email de test envoyé à {row['email']}", "smtp": smtp_info}
    else:
        raise HTTPException(
            status_code=500,
            detail=f"Échec de l'envoi. Consultez les logs backend (InvRob.log) pour le détail. Config: {smtp_info}"
        )



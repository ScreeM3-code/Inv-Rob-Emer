# backend/auth.py
"""Utilitaires d'authentification JWT et dependencies FastAPI"""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
import asyncpg
import os

from database import get_db_connection

# ==================== Configuration ====================
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "CHANGE_ME_IN_PRODUCTION")  # ⚠️ Mettre dans .env
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 90  # 90 jours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

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

        user = await get_user_by_username(conn, username)
        if user is None:
            raise credentials_exception

        return {
            "username": payload.get("sub"),
            "role":     payload.get("role"),
            "id":       payload.get("id"),
            "group":    payload.get("group"),
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
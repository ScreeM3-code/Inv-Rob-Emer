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

# Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "CHANGE_ME_IN_PRODUCTION")  # ⚠️ Mettre dans .env
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 90  # 90 jours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

router = APIRouter(prefix="/auth", tags=["auth"])


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


async def get_user_by_username(conn: asyncpg.Connection, username: str):
    """Récupère un utilisateur par son username depuis la DB"""
    query = """
        SELECT id, username, role, password_hash, created_at 
        FROM users 
        WHERE username = $1
    """
    row = await conn.fetchrow(query, username)

    if row:
        return {
            "id": str(row['id']),
            "username": row['username'],
            "role": row['role'],
            "password_hash": row['password_hash'],
            "created_at": row['created_at']
        }
    return None


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
            "id": user["id"],
            "username": user["username"],
            "role": user["role"]
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
    token = create_access_token({
        "sub": user['username'],
        "role": user['role'],
        "id": user['id']
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
            "id": user['id'],
            "username": user['username'],
            "role": user['role']
        }
    }


@router.get('/me')
async def me(user: dict = Depends(get_current_user)):
    """Retourne l'utilisateur actuellement connecté"""
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
@router.get('/users')
async def list_users(
        user: dict = Depends(require_admin),
        conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Retourne la liste des utilisateurs (admin seulement)"""
    query = """
        SELECT id, username, role, created_at 
        FROM users 
        ORDER BY created_at DESC
    """
    rows = await conn.fetch(query)

    users = []
    for row in rows:
        users.append({
            "id": str(row['id']),
            "username": row['username'],
            "role": row['role'],
            "created_at": row['created_at'].isoformat() if row['created_at'] else None
        })

    return {"users": users}


@router.post('/users')
async def create_user(
        data: CreateUserRequest,
        user: dict = Depends(require_admin),
        conn: asyncpg.Connection = Depends(get_db_connection)
):
    """Crée un nouvel utilisateur (admin seulement)"""

    # Vérifier si l'utilisateur existe déjà
    existing_user = await get_user_by_username(conn, data.username)
    if existing_user:
        raise HTTPException(status_code=400, detail="Utilisateur existe déjà")

    # Valider le rôle
    if data.role not in ['user', 'admin']:
        raise HTTPException(status_code=400, detail="Rôle invalide (user ou admin)")

    # Créer l'utilisateur
    user_id = uuid.uuid4()
    password_hash = hash_password(data.password)

    query = """
        INSERT INTO users (id, username, password_hash, role, created_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, username, role, created_at
    """

    try:
        row = await conn.fetchrow(
            query,
            user_id,
            data.username,
            password_hash,
            data.role,
            datetime.now()
        )

        return {
            "msg": "Utilisateur créé",
            "user": {
                "id": str(row['id']),
                "username": row['username'],
                "role": row['role'],
                "created_at": row['created_at'].isoformat() if row['created_at'] else None
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création: {str(e)}")


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
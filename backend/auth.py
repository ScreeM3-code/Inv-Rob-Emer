# backend/auth.py
"""Système d'authentification simple avec JWT"""
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Response, Request
from jose import JWTError, jwt
from passlib.context import CryptContext
import os
from fastapi import APIRouter, Body
from pydantic import BaseModel as PydanticBaseModel
 
# Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "CHANGE_ME_IN_PRODUCTION")  # ⚠️ Mettre dans .env
ALGORITHM = "HS256"
# Expiration du token: ~90 jours (3 mois)
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 90  # minutes

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

# Simple router for login endpoints
router = APIRouter(prefix="/auth", tags=["auth"])

# Base de données simple (à remplacer par vraie table SQL en production)
USERS_DB = {
    "admin": {
        "username": "admin",
        "hashed_password": pwd_context.hash("admin123"),  # ⚠️ Changer en production
        "role": "admin"
    },
    "user": {
        "username": "user",
        "hashed_password": pwd_context.hash("user123"),
        "role": "user"
    }
}


class LoginRequest(PydanticBaseModel):
    username: str
    password: str


@router.post('/login')
def login(data: LoginRequest = Body(...), response: Response = None):
    """Authentification simple: retourne un JWT si les identifiants sont valides."""
    user = USERS_DB.get(data.username)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Utilisateur ou mot de passe invalide")

    if not verify_password(data.password, user['hashed_password']):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Utilisateur ou mot de passe invalide")

    token = create_access_token({"sub": user['username'], "role": user.get('role', 'user')})
    # Placer le token dans un cookie HttpOnly pour persistance côté client
    if response is not None:
        response.set_cookie(
            key="access_token",
            value=token,
            httponly=True,
            samesite="lax",
            max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )
    return {"access_token": token, "token_type": "bearer", "user": {"username": user['username'], "role": user.get('role')}}




def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), request: Request = None):
    """Vérifie le token JWT et retourne l'utilisateur"""
    token = None
    # 1) Priorité à l'en-tête Authorization si présent
    if credentials and getattr(credentials, 'credentials', None):
        token = credentials.credentials
    # 2) Sinon essayer le cookie `access_token`
    if not token and request is not None:
        token = request.cookies.get('access_token')

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
        return {"username": username, "role": payload.get("role")}
    except JWTError:
        raise credentials_exception


@router.get('/me')
def me(user: dict = Depends(get_current_user)):
    return {"user": user}


@router.post('/logout')
def logout(response: Response):
    """Supprime le cookie d'authentification côté client"""
    response.delete_cookie('access_token')
    return {"msg": "Logged out"}


@router.post('/refresh')
def refresh_token(response: Response, request: Request):
    """Renouvelle le token si l'utilisateur a un token valide (cookie ou header)."""
    try:
        user = get_current_user(request=request, credentials=None)
    except HTTPException:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Impossible de rafraîchir le token")

    token = create_access_token({"sub": user['username'], "role": user.get('role')})
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    return {"access_token": token, "token_type": "bearer"}




# Dependency pour routes protégées
async def require_auth(user: dict = Depends(get_current_user)):
    """Protège une route - nécessite authentification"""
    return user

# Dependency pour routes admin seulement
async def require_admin(user: dict = Depends(get_current_user)):
    """Protège une route - nécessite rôle admin"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Accès refusé - Admin seulement")
    return user


# --- Endpoints de gestion des utilisateurs (simple DB en mémoire, demo seulement) ---
@router.get('/users')
def list_users(user: dict = Depends(require_admin)):
    """Retourne la liste des utilisateurs (admin seulement)."""
    out = []
    for k, v in USERS_DB.items():
        out.append({"username": v.get('username'), "role": v.get('role')})
    return {"users": out}


class CreateUserRequest(PydanticBaseModel):
    username: str
    password: str
    role: Optional[str] = 'user'


@router.post('/users')
def create_user(data: CreateUserRequest, user: dict = Depends(require_admin)):
    """Crée un utilisateur (admin seulement). Stockage en mémoire pour la démo."""
    if data.username in USERS_DB:
        raise HTTPException(status_code=400, detail="Utilisateur existe déjà")
    USERS_DB[data.username] = {
        "username": data.username,
        "hashed_password": pwd_context.hash(data.password),
        "role": data.role
    }
    return {"msg": "Utilisateur créé", "user": {"username": data.username, "role": data.role}}

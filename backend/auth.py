# backend/auth.py
"""Système d'authentification simple avec JWT"""
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
import os
from fastapi import APIRouter, Body
from pydantic import BaseModel as PydanticBaseModel
 
# Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "CHANGE_ME_IN_PRODUCTION")  # ⚠️ Mettre dans .env
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 heures

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

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
def login(data: LoginRequest = Body(...)):
    """Authentification simple: retourne un JWT si les identifiants sont valides."""
    user = USERS_DB.get(data.username)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Utilisateur ou mot de passe invalide")

    if not verify_password(data.password, user['hashed_password']):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Utilisateur ou mot de passe invalide")

    token = create_access_token({"sub": user['username'], "role": user.get('role', 'user')})
    return {"access_token": token, "token_type": "bearer", "user": {"username": user['username'], "role": user.get('role')}}


@router.get('/me')
def me(user: dict = Depends(get_current_user)):
    return {"user": user}

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Vérifie le token JWT et retourne l'utilisateur"""
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalide ou expiré",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        return {"username": username, "role": payload.get("role")}
    except JWTError:
        raise credentials_exception

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

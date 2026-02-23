"""Modèles Pydantic pour les utilisateurs et l'authentification"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class LoginRequest(BaseModel):
    username: str
    password: str


class CreateUserRequest(BaseModel):
    username: str
    password: str
    role: Optional[str] = 'user'


class UserResponse(BaseModel):
    id: str
    username: str
    role: str
    created_at: Optional[datetime] = None


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class UpdateUserRequest(BaseModel):
    email: Optional[str] = None
    group_id: Optional[int] = None
    role: Optional[str] = None


class CreateGroupRequest(BaseModel):
    name: str
    description: Optional[str] = None
    permissions: dict


class UpdateGroupRequest(BaseModel):
    description: Optional[str] = None
    permissions: dict


class NotifPrefsRequest(BaseModel):
    pieces_a_commander:   Optional[bool] = None
    demande_approbation:  Optional[bool] = None
    approbation_accordee: Optional[bool] = None
    approbation_refusee:  Optional[bool] = None
    piece_commandee:      Optional[bool] = None


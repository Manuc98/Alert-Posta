"""
Schemas Pydantic para Autenticação
"""

from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class LoginRequest(BaseModel):
    """Request de login"""
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    """Resposta de login"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserResponse"


class RefreshTokenRequest(BaseModel):
    """Request de refresh token"""
    refresh_token: str


class RefreshTokenResponse(BaseModel):
    """Resposta de refresh token"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseModel):
    """Resposta de utilizador"""
    id: int
    email: str
    username: str
    full_name: Optional[str] = None
    role: str
    is_active: bool
    is_verified: bool
    last_login: Optional[datetime] = None
    created_at: datetime


# Atualizar referências
LoginResponse.model_rebuild()

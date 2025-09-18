"""
Schemas Pydantic para Users
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


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


class UserCreate(BaseModel):
    """Criação de utilizador"""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = Field(None, max_length=255)
    role: str = Field(default="client", regex="^(super_admin|developer|client)$")
    is_active: bool = Field(default=True)
    is_verified: bool = Field(default=False)


class UserUpdate(BaseModel):
    """Atualização de utilizador"""
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=100)
    full_name: Optional[str] = Field(None, max_length=255)
    role: Optional[str] = Field(None, regex="^(super_admin|developer|client)$")
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None


class UserListResponse(BaseModel):
    """Resposta de lista de utilizadores"""
    users: List[UserResponse]
    total: int
    limit: int
    offset: int


class UserStats(BaseModel):
    """Estatísticas de utilizadores"""
    total_users: int
    active_users: int
    inactive_users: int
    verified_users: int
    unverified_users: int
    users_by_role: dict


class RoleInfo(BaseModel):
    """Informações sobre um role"""
    name: str
    description: str
    permissions: List[str]


class RolesInfo(BaseModel):
    """Informações sobre todos os roles disponíveis"""
    roles: List[RoleInfo]

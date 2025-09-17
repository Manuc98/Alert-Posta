"""
Endpoints para autenticação
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any
from datetime import datetime, timedelta

from app.core.database import get_async_session
from app.core.logging import get_logger
from app.core.auth import (
    verify_password, get_password_hash, create_access_token, 
    create_refresh_token, verify_token, get_current_user
)
from app.core.config import settings
from app.models.user import User
from app.schemas.auth import (
    LoginRequest, LoginResponse, RefreshTokenRequest, 
    RefreshTokenResponse, UserResponse
)

router = APIRouter()
logger = get_logger("auth_api")

security = HTTPBearer()


@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_async_session)
):
    """Login do utilizador"""
    try:
        from sqlalchemy import select
        
        # Verificar utilizador
        result = await db.execute(
            select(User).where(User.email == login_data.email)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            logger.warning("Tentativa de login com email inexistente", email=login_data.email)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciais inválidas"
            )
        
        # Verificar password
        if not verify_password(login_data.password, user.hashed_password):
            logger.warning("Tentativa de login com password incorreta", user_id=user.id, email=login_data.email)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciais inválidas"
            )
        
        # Verificar se utilizador está ativo
        if not user.is_active:
            logger.warning("Tentativa de login com utilizador inativo", user_id=user.id, email=login_data.email)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Utilizador inativo"
            )
        
        # Criar tokens
        access_token = create_access_token(
            data={"sub": str(user.id), "email": user.email, "role": user.role}
        )
        refresh_token = create_refresh_token(
            data={"sub": str(user.id), "email": user.email}
        )
        
        # Atualizar último login
        user.last_login = datetime.utcnow()
        await db.commit()
        
        logger.info("Login realizado com sucesso", user_id=user.id, email=user.email, role=user.role)
        
        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=UserResponse(
                id=user.id,
                email=user.email,
                username=user.username,
                full_name=user.full_name,
                role=user.role,
                is_active=user.is_active,
                is_verified=user.is_verified,
                last_login=user.last_login,
                created_at=user.created_at
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erro no login", email=login_data.email, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno do servidor"
        )


@router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh_token(
    refresh_data: RefreshTokenRequest
):
    """Renovar token de acesso"""
    try:
        # Verificar refresh token
        payload = verify_token(refresh_data.refresh_token)
        
        # Verificar se é um refresh token
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido"
            )
        
        # Criar novo access token
        access_token = create_access_token(
            data={
                "sub": payload["sub"],
                "email": payload["email"],
                "role": payload.get("role", "client")
            }
        )
        
        logger.info("Token renovado", user_id=payload["sub"])
        
        return RefreshTokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erro ao renovar token", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Obter informações do utilizador atual"""
    try:
        logger.info("Informações do utilizador obtidas", user_id=current_user.id)
        
        return UserResponse(
            id=current_user.id,
            email=current_user.email,
            username=current_user.username,
            full_name=current_user.full_name,
            role=current_user.role,
            is_active=current_user.is_active,
            is_verified=current_user.is_verified,
            last_login=current_user.last_login,
            created_at=current_user.created_at
        )
        
    except Exception as e:
        logger.error("Erro ao obter informações do utilizador", user_id=current_user.id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno do servidor"
        )


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user)
):
    """Logout do utilizador"""
    try:
        # Em uma implementação mais robusta, aqui seria invalidado o token
        # Por agora, apenas registamos o logout
        
        logger.info("Logout realizado", user_id=current_user.id, email=current_user.email)
        
        return {"message": "Logout realizado com sucesso"}
        
    except Exception as e:
        logger.error("Erro no logout", user_id=current_user.id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno do servidor"
        )


@router.get("/verify-token")
async def verify_access_token(
    current_user: User = Depends(get_current_user)
):
    """Verificar se o token de acesso é válido"""
    try:
        logger.info("Token verificado", user_id=current_user.id)
        
        return {
            "valid": True,
            "user_id": current_user.id,
            "email": current_user.email,
            "role": current_user.role
        }
        
    except Exception as e:
        logger.error("Erro ao verificar token", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido"
        )

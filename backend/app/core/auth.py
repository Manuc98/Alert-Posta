"""
Sistema de autenticação para Alert@Postas V3
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_async_session
from app.core.logging import get_logger
from app.core.exceptions import AuthenticationException, AuthorizationException
from app.models.user import User

logger = get_logger("auth")

# Configurar hash de passwords
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Configurar JWT
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verificar password"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash da password"""
    return pwd_context.hash(password)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Criar token de acesso"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    return encoded_jwt


def create_refresh_token(data: Dict[str, Any]) -> str:
    """Criar token de refresh"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Dict[str, Any]:
    """Verificar e decodificar token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError as e:
        logger.error("Erro ao verificar token", error=str(e))
        raise AuthenticationException("Token inválido")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_async_session)
) -> User:
    """Obter utilizador atual a partir do token"""
    try:
        token = credentials.credentials
        payload = verify_token(token)
        
        user_id: str = payload.get("sub")
        if user_id is None:
            raise AuthenticationException("Token inválido")
        
        # Obter utilizador da base de dados
        result = await db.execute(select(User).where(User.id == int(user_id)))
        user = result.scalar_one_or_none()
        
        if user is None:
            raise AuthenticationException("Utilizador não encontrado")
        
        if not user.is_active:
            raise AuthenticationException("Utilizador inativo")
        
        # Atualizar último login
        user.last_login = datetime.utcnow()
        await db.commit()
        
        logger.info("Utilizador autenticado", user_id=user.id, email=user.email)
        return user
        
    except AuthenticationException:
        raise
    except Exception as e:
        logger.error("Erro na autenticação", error=str(e))
        raise AuthenticationException("Erro na autenticação")


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Obter utilizador ativo atual"""
    if not current_user.is_active:
        raise AuthenticationException("Utilizador inativo")
    return current_user


async def get_current_superadmin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Obter superadmin atual"""
    if not current_user.is_superadmin:
        raise AuthorizationException("Acesso negado - requer superadmin")
    return current_user


async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Obter admin atual"""
    if not current_user.is_admin:
        raise AuthorizationException("Acesso negado - requer admin")
    return current_user


async def get_current_operator(
    current_user: User = Depends(get_current_user)
) -> User:
    """Obter operador atual"""
    if not current_user.is_operator:
        raise AuthorizationException("Acesso negado - requer operador")
    return current_user


def require_role(required_role: str):
    """Decorator para verificar role específica"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Esta função seria usada como dependency
            # A implementação real seria mais complexa
            pass
        return wrapper
    return decorator

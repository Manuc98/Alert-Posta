"""
Endpoints para gestão de utilizadores
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any

from app.core.database import get_async_session
from app.core.logging import get_logger
from app.core.auth import get_current_admin, get_current_user
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate, UserCreate, UserListResponse

router = APIRouter()
logger = get_logger("users_api")


@router.get("", response_model=UserListResponse)
async def get_users(
    role: Optional[str] = Query(None, description="Filtrar por role"),
    is_active: Optional[bool] = Query(None, description="Filtrar por status ativo"),
    limit: int = Query(100, ge=1, le=1000, description="Limite de resultados"),
    offset: int = Query(0, ge=0, description="Offset para paginação"),
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_async_session)
):
    """Obter lista de utilizadores (apenas admin)"""
    try:
        from sqlalchemy import select, func
        
        # Construir query base
        query = select(User)
        count_query = select(func.count(User.id))
        
        # Aplicar filtros
        conditions = []
        
        if role:
            conditions.append(User.role == role)
        
        if is_active is not None:
            conditions.append(User.is_active == is_active)
        
        if conditions:
            query = query.where(conditions[0] if len(conditions) == 1 else conditions)
            count_query = count_query.where(conditions[0] if len(conditions) == 1 else conditions)
        
        # Aplicar paginação
        query = query.offset(offset).limit(limit)
        
        # Executar queries
        result = await db.execute(query)
        users = result.scalars().all()
        
        count_result = await db.execute(count_query)
        total = count_result.scalar()
        
        # Converter para response
        user_responses = [
            UserResponse(
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
            for user in users
        ]
        
        logger.info("Utilizadores obtidos", admin_id=current_user.id, count=len(users), total=total)
        
        return UserListResponse(
            users=user_responses,
            total=total,
            limit=limit,
            offset=offset
        )
        
    except Exception as e:
        logger.error("Erro ao obter utilizadores", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao obter utilizadores"
        )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_async_session)
):
    """Obter utilizador específico (apenas admin)"""
    try:
        from sqlalchemy import select
        
        # Verificar se o utilizador pode aceder (admin ou próprio perfil)
        if current_user.id != user_id and not current_user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado"
            )
        
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Utilizador não encontrado"
            )
        
        logger.info("Utilizador obtido", admin_id=current_user.id, user_id=user_id)
        
        return UserResponse(
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
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erro ao obter utilizador", user_id=user_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao obter utilizador"
        )


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_async_session)
):
    """Atualizar utilizador (apenas admin)"""
    try:
        from sqlalchemy import select
        
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Utilizador não encontrado"
            )
        
        # Aplicar atualizações
        updates = user_update.dict(exclude_unset=True)
        for key, value in updates.items():
            if hasattr(user, key):
                setattr(user, key, value)
        
        # Salvar
        await db.commit()
        await db.refresh(user)
        
        logger.info("Utilizador atualizado", admin_id=current_user.id, user_id=user_id, updates=list(updates.keys()))
        
        return UserResponse(
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
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erro ao atualizar utilizador", user_id=user_id, error=str(e))
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao atualizar utilizador"
        )


@router.post("", response_model=UserResponse)
async def create_user(
    user_create: UserCreate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_async_session)
):
    """Criar utilizador (apenas admin)"""
    try:
        from sqlalchemy import select
        from app.core.auth import get_password_hash
        
        # Verificar se email já existe
        result = await db.execute(
            select(User).where(User.email == user_create.email)
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email já existe"
            )
        
        # Verificar se username já existe
        result = await db.execute(
            select(User).where(User.username == user_create.username)
        )
        existing_username = result.scalar_one_or_none()
        
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username já existe"
            )
        
        # Criar utilizador
        user = User(
            email=user_create.email,
            username=user_create.username,
            hashed_password=get_password_hash(user_create.password),
            full_name=user_create.full_name,
            role=user_create.role,
            is_active=user_create.is_active,
            is_verified=user_create.is_verified
        )
        
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
        logger.info("Utilizador criado", admin_id=current_user.id, user_id=user.id, email=user.email)
        
        return UserResponse(
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
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erro ao criar utilizador", error=str(e))
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao criar utilizador"
        )


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_async_session)
):
    """Eliminar utilizador (apenas superadmin)"""
    try:
        from sqlalchemy import select
        
        # Apenas superadmin pode eliminar utilizadores
        if not current_user.is_superadmin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas superadmin pode eliminar utilizadores"
            )
        
        # Não permitir eliminar a si mesmo
        if current_user.id == user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não pode eliminar a si mesmo"
            )
        
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Utilizador não encontrado"
            )
        
        # Eliminar utilizador
        await db.delete(user)
        await db.commit()
        
        logger.info("Utilizador eliminado", admin_id=current_user.id, user_id=user_id, email=user.email)
        
        return {"message": "Utilizador eliminado com sucesso"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erro ao eliminar utilizador", user_id=user_id, error=str(e))
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao eliminar utilizador"
        )

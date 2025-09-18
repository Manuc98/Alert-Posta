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
from app.schemas.user import UserResponse, UserUpdate, UserCreate, UserListResponse, UserStats, RoleInfo, RolesInfo

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
        
        # Validações de role antes de aplicar atualizações
        if user_update.role == "super_admin" and not current_user.is_super_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas super_admin pode alterar outros utilizadores para super_admin"
            )
        
        # Não permitir que um utilizador se altere a si mesmo para super_admin
        if current_user.id == user_id and user_update.role == "super_admin":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não pode alterar o seu próprio role para super_admin"
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
        
        # Validações de role
        if user_create.role == "super_admin" and not current_user.is_super_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas super_admin pode criar outros super_admin"
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
        
        # Apenas super_admin pode eliminar utilizadores
        if not current_user.is_super_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas super_admin pode eliminar utilizadores"
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


@router.get("/stats/overview", response_model=UserStats)
async def get_user_stats(
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_async_session)
):
    """Obter estatísticas de utilizadores (apenas admin)"""
    try:
        from sqlalchemy import select, func
        
        # Total de utilizadores
        total_result = await db.execute(select(func.count(User.id)))
        total_users = total_result.scalar()
        
        # Utilizadores ativos
        active_result = await db.execute(select(func.count(User.id)).where(User.is_active == True))
        active_users = active_result.scalar()
        
        # Utilizadores inativos
        inactive_users = total_users - active_users
        
        # Utilizadores verificados
        verified_result = await db.execute(select(func.count(User.id)).where(User.is_verified == True))
        verified_users = verified_result.scalar()
        
        # Utilizadores não verificados
        unverified_users = total_users - verified_users
        
        # Utilizadores por role
        role_result = await db.execute(
            select(User.role, func.count(User.id))
            .group_by(User.role)
        )
        users_by_role = {row[0]: row[1] for row in role_result.fetchall()}
        
        logger.info("Estatísticas de utilizadores obtidas", admin_id=current_user.id)
        
        return UserStats(
            total_users=total_users,
            active_users=active_users,
            inactive_users=inactive_users,
            verified_users=verified_users,
            unverified_users=unverified_users,
            users_by_role=users_by_role
        )
        
    except Exception as e:
        logger.error("Erro ao obter estatísticas de utilizadores", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao obter estatísticas de utilizadores"
        )


@router.get("/roles/info", response_model=RolesInfo)
async def get_roles_info(
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_async_session)
):
    """Obter informações sobre roles disponíveis (apenas admin)"""
    try:
        roles_info = [
            RoleInfo(
                name="super_admin",
                description="Administrador principal com acesso total ao sistema",
                permissions=[
                    "gerir_utilizadores",
                    "acessar_painel_admin",
                    "modificar_config_sistema",
                    "acessar_modelos_ml",
                    "eliminar_utilizadores",
                    "criar_super_admin"
                ]
            ),
            RoleInfo(
                name="developer",
                description="Desenvolvedor com acesso administrativo limitado",
                permissions=[
                    "gerir_utilizadores",
                    "acessar_painel_admin", 
                    "acessar_modelos_ml",
                    "ver_estatisticas"
                ]
            ),
            RoleInfo(
                name="client",
                description="Cliente com acesso básico ao sistema",
                permissions=[
                    "ver_dashboard",
                    "receber_sinais",
                    "ver_historico_proprio"
                ]
            )
        ]
        
        logger.info("Informações de roles obtidas", admin_id=current_user.id)
        
        return RolesInfo(roles=roles_info)
        
    except Exception as e:
        logger.error("Erro ao obter informações de roles", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao obter informações de roles"
        )

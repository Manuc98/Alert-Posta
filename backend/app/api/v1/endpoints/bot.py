"""
Endpoints para controlo do bot Alert@Postas
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any
import asyncio

from app.core.database import get_async_session
from app.core.logging import get_logger
from app.core.auth import get_current_user
from app.models.user import User
from app.services.bot_service import BotService
from app.schemas.bot import BotStatus, BotControlResponse

router = APIRouter()
logger = get_logger("bot_api")


@router.get("/status", response_model=BotStatus)
async def get_bot_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Obter status atual do bot"""
    try:
        bot_service = BotService(db)
        status = await bot_service.get_status()
        
        logger.info("Status do bot obtido", user_id=current_user.id)
        return status
        
    except Exception as e:
        logger.error("Erro ao obter status do bot", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao obter status do bot"
        )


@router.post("/restart", response_model=BotControlResponse)
async def restart_bot(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Reiniciar o bot"""
    try:
        bot_service = BotService(db)
        result = await bot_service.restart()
        
        logger.info("Bot reiniciado", user_id=current_user.id)
        return result
        
    except Exception as e:
        logger.error("Erro ao reiniciar bot", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao reiniciar bot"
        )


@router.post("/start", response_model=BotControlResponse)
async def start_bot(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Iniciar o bot"""
    try:
        bot_service = BotService(db)
        result = await bot_service.start()
        
        logger.info("Bot iniciado", user_id=current_user.id)
        return result
        
    except Exception as e:
        logger.error("Erro ao iniciar bot", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao iniciar bot"
        )


@router.post("/stop", response_model=BotControlResponse)
async def stop_bot(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Parar o bot"""
    try:
        bot_service = BotService(db)
        result = await bot_service.stop()
        
        logger.info("Bot parado", user_id=current_user.id)
        return result
        
    except Exception as e:
        logger.error("Erro ao parar bot", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao parar bot"
        )


@router.get("/modules")
async def get_bot_modules(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Obter status dos módulos do bot"""
    try:
        bot_service = BotService(db)
        modules = await bot_service.get_modules_status()
        
        logger.info("Status dos módulos obtido", user_id=current_user.id)
        return {"modules": modules}
        
    except Exception as e:
        logger.error("Erro ao obter status dos módulos", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao obter status dos módulos"
        )


@router.post("/modules/{module_name}/restart")
async def restart_module(
    module_name: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Reiniciar módulo específico"""
    try:
        bot_service = BotService(db)
        result = await bot_service.restart_module(module_name)
        
        logger.info("Módulo reiniciado", module=module_name, user_id=current_user.id)
        return result
        
    except Exception as e:
        logger.error("Erro ao reiniciar módulo", module=module_name, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao reiniciar módulo {module_name}"
        )

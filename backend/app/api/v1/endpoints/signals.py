"""
Endpoints para gestão de sinais
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
from datetime import datetime

from app.core.database import get_async_session
from app.core.logging import get_logger
from app.core.auth import get_current_user
from app.models.user import User
from app.services.signal_service import SignalService
from app.schemas.signal import (
    SignalResponse, SignalListResponse, SignalUpdate, 
    SignalCreate, SignalExplainResponse, SignalStatsResponse
)

router = APIRouter()
logger = get_logger("signals_api")


@router.get("", response_model=SignalListResponse)
async def get_signals(
    status: Optional[str] = Query(None, description="Filtrar por status"),
    module: Optional[str] = Query(None, description="Filtrar por módulo"),
    sent: Optional[bool] = Query(None, description="Filtrar por enviado"),
    hit: Optional[bool] = Query(None, description="Filtrar por resultado"),
    game_id: Optional[int] = Query(None, description="Filtrar por jogo"),
    model_id: Optional[int] = Query(None, description="Filtrar por modelo"),
    limit: int = Query(100, ge=1, le=1000, description="Limite de resultados"),
    offset: int = Query(0, ge=0, description="Offset para paginação"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Obter lista de sinais"""
    try:
        signal_service = SignalService(db)
        
        filters = {
            "status": status,
            "module": module,
            "sent": sent,
            "hit": hit,
            "game_id": game_id,
            "model_id": model_id
        }
        
        signals, total = await signal_service.get_signals(
            filters=filters,
            limit=limit,
            offset=offset
        )
        
        logger.info(
            "Sinais obtidos",
            user_id=current_user.id,
            count=len(signals),
            total=total,
            filters=filters
        )
        
        return SignalListResponse(
            signals=signals,
            total=total,
            limit=limit,
            offset=offset
        )
        
    except Exception as e:
        logger.error("Erro ao obter sinais", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao obter sinais"
        )


@router.get("/stats", response_model=SignalStatsResponse)
async def get_signals_stats(
    days: int = Query(7, ge=1, le=365, description="Número de dias para estatísticas"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Obter estatísticas de sinais"""
    try:
        signal_service = SignalService(db)
        stats = await signal_service.get_signals_stats(days=days)
        
        logger.info("Estatísticas de sinais obtidas", user_id=current_user.id, days=days)
        return stats
        
    except Exception as e:
        logger.error("Erro ao obter estatísticas de sinais", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao obter estatísticas de sinais"
        )


@router.get("/{signal_id}", response_model=SignalResponse)
async def get_signal(
    signal_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Obter sinal específico"""
    try:
        signal_service = SignalService(db)
        signal = await signal_service.get_signal_by_id(signal_id)
        
        if not signal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sinal não encontrado"
            )
        
        logger.info("Sinal obtido", user_id=current_user.id, signal_id=signal_id)
        return signal
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erro ao obter sinal", signal_id=signal_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao obter sinal"
        )


@router.patch("/{signal_id}", response_model=SignalResponse)
async def update_signal(
    signal_id: str,
    signal_update: SignalUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Atualizar sinal"""
    try:
        signal_service = SignalService(db)
        signal = await signal_service.update_signal(
            signal_id, 
            signal_update.dict(exclude_unset=True)
        )
        
        if not signal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sinal não encontrado"
            )
        
        logger.info("Sinal atualizado", user_id=current_user.id, signal_id=signal_id, updates=signal_update.dict())
        return signal
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erro ao atualizar sinal", signal_id=signal_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao atualizar sinal"
        )


@router.post("/{signal_id}/send-telegram")
async def send_signal_to_telegram(
    signal_id: str,
    custom_message: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Enviar sinal para Telegram"""
    try:
        signal_service = SignalService(db)
        result = await signal_service.send_to_telegram(signal_id, custom_message)
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["message"]
            )
        
        logger.info("Sinal enviado para Telegram", user_id=current_user.id, signal_id=signal_id)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erro ao enviar sinal para Telegram", signal_id=signal_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao enviar sinal para Telegram"
        )


@router.get("/{signal_id}/explain", response_model=SignalExplainResponse)
async def explain_signal(
    signal_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Obter explicação SHAP do sinal"""
    try:
        signal_service = SignalService(db)
        explanation = await signal_service.get_signal_explanation(signal_id)
        
        if not explanation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Explicação não encontrada para este sinal"
            )
        
        logger.info("Explicação do sinal obtida", user_id=current_user.id, signal_id=signal_id)
        return explanation
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erro ao obter explicação do sinal", signal_id=signal_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao obter explicação do sinal"
        )


@router.post("/{signal_id}/verify-result")
async def verify_signal_result(
    signal_id: str,
    hit: bool,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Verificar resultado do sinal"""
    try:
        signal_service = SignalService(db)
        result = await signal_service.verify_result(signal_id, hit)
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["message"]
            )
        
        logger.info("Resultado do sinal verificado", user_id=current_user.id, signal_id=signal_id, hit=hit)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erro ao verificar resultado do sinal", signal_id=signal_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao verificar resultado do sinal"
        )


@router.post("/{signal_id}/update-message")
async def update_telegram_message(
    signal_id: str,
    new_message: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Atualizar mensagem do Telegram"""
    try:
        signal_service = SignalService(db)
        result = await signal_service.update_telegram_message(signal_id, new_message)
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["message"]
            )
        
        logger.info("Mensagem do Telegram atualizada", user_id=current_user.id, signal_id=signal_id)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erro ao atualizar mensagem do Telegram", signal_id=signal_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao atualizar mensagem do Telegram"
        )


@router.post("/export")
async def export_signals(
    format: str = Query("csv", description="Formato de exportação (csv, excel)"),
    filters: Optional[Dict[str, Any]] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Exportar sinais"""
    try:
        signal_service = SignalService(db)
        export_data = await signal_service.export_signals(format=format, filters=filters)
        
        logger.info("Sinais exportados", user_id=current_user.id, format=format)
        
        return export_data
        
    except Exception as e:
        logger.error("Erro ao exportar sinais", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao exportar sinais"
        )

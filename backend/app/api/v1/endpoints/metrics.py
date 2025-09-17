"""
Endpoints para métricas e KPIs
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, List
from datetime import datetime, timedelta

from app.core.database import get_async_session
from app.core.logging import get_logger
from app.core.auth import get_current_user
from app.models.user import User
from app.services.metrics_service import MetricsService

router = APIRouter()
logger = get_logger("metrics_api")


@router.get("/kpis")
async def get_kpis(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Obter KPIs básicos"""
    try:
        metrics_service = MetricsService(db)
        kpis = await metrics_service.get_kpis()
        
        logger.info("KPIs obtidos", user_id=current_user.id)
        return kpis
        
    except Exception as e:
        logger.error("Erro ao obter KPIs", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao obter KPIs"
        )


@router.get("/signals/today")
async def get_signals_today(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Obter sinais de hoje"""
    try:
        metrics_service = MetricsService(db)
        signals = await metrics_service.get_signals_today()
        
        logger.info("Sinais de hoje obtidos", user_id=current_user.id, count=signals.get("total", 0))
        return signals
        
    except Exception as e:
        logger.error("Erro ao obter sinais de hoje", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao obter sinais de hoje"
        )


@router.get("/accuracy/7d")
async def get_accuracy_7d(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Obter taxa de acerto dos últimos 7 dias"""
    try:
        metrics_service = MetricsService(db)
        accuracy = await metrics_service.get_accuracy_period(days=7)
        
        logger.info("Taxa de acerto 7d obtida", user_id=current_user.id, accuracy=accuracy.get("accuracy_rate", 0))
        return accuracy
        
    except Exception as e:
        logger.error("Erro ao obter taxa de acerto 7d", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao obter taxa de acerto 7d"
        )


@router.get("/roi/estimated")
async def get_estimated_roi(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Obter ROI estimado"""
    try:
        metrics_service = MetricsService(db)
        roi = await metrics_service.get_estimated_roi()
        
        logger.info("ROI estimado obtido", user_id=current_user.id, roi=roi.get("roi_percentage", 0))
        return roi
        
    except Exception as e:
        logger.error("Erro ao obter ROI estimado", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao obter ROI estimado"
        )


@router.get("/active-model")
async def get_active_model(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Obter modelo ativo"""
    try:
        metrics_service = MetricsService(db)
        active_model = await metrics_service.get_active_model()
        
        logger.info("Modelo ativo obtido", user_id=current_user.id)
        return active_model
        
    except Exception as e:
        logger.error("Erro ao obter modelo ativo", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao obter modelo ativo"
        )


@router.get("/dashboard")
async def get_dashboard_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Obter dados completos do dashboard"""
    try:
        metrics_service = MetricsService(db)
        dashboard_data = await metrics_service.get_dashboard_data()
        
        logger.info("Dados do dashboard obtidos", user_id=current_user.id)
        return dashboard_data
        
    except Exception as e:
        logger.error("Erro ao obter dados do dashboard", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao obter dados do dashboard"
        )


@router.get("/performance/trend")
async def get_performance_trend(
    days: int = Query(30, ge=1, le=365, description="Número de dias"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Obter tendência de performance"""
    try:
        metrics_service = MetricsService(db)
        trend = await metrics_service.get_performance_trend(days=days)
        
        logger.info("Tendência de performance obtida", user_id=current_user.id, days=days)
        return trend
        
    except Exception as e:
        logger.error("Erro ao obter tendência de performance", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao obter tendência de performance"
        )


@router.get("/games/live")
async def get_live_games_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Obter número de jogos ao vivo"""
    try:
        metrics_service = MetricsService(db)
        live_games = await metrics_service.get_live_games_count()
        
        logger.info("Jogos ao vivo obtidos", user_id=current_user.id, count=live_games.get("count", 0))
        return live_games
        
    except Exception as e:
        logger.error("Erro ao obter jogos ao vivo", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao obter jogos ao vivo"
        )


@router.get("/modules/status")
async def get_modules_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Obter status dos módulos"""
    try:
        metrics_service = MetricsService(db)
        modules_status = await metrics_service.get_modules_status()
        
        logger.info("Status dos módulos obtido", user_id=current_user.id)
        return modules_status
        
    except Exception as e:
        logger.error("Erro ao obter status dos módulos", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao obter status dos módulos"
        )

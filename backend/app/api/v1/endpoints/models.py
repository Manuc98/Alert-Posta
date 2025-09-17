"""
Endpoints para gestão de modelos ML
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any

from app.core.database import get_async_session
from app.core.logging import get_logger
from app.core.auth import get_current_admin
from app.models.user import User
from app.services.model_service import ModelService
from app.schemas.model import ModelResponse, ModelListResponse, ModelActivateRequest, ModelRetrainRequest

router = APIRouter()
logger = get_logger("models_api")


@router.get("", response_model=ModelListResponse)
async def get_models(
    module: Optional[str] = Query(None, description="Filtrar por módulo"),
    active_only: bool = Query(False, description="Apenas modelos ativos"),
    limit: int = Query(100, ge=1, le=1000, description="Limite de resultados"),
    offset: int = Query(0, ge=0, description="Offset para paginação"),
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_async_session)
):
    """Obter lista de modelos ML"""
    try:
        model_service = ModelService(db)
        
        filters = {
            "module": module,
            "active_only": active_only
        }
        
        models, total = await model_service.get_models(
            filters=filters,
            limit=limit,
            offset=offset
        )
        
        logger.info(
            "Modelos obtidos",
            user_id=current_user.id,
            count=len(models),
            total=total,
            filters=filters
        )
        
        return ModelListResponse(
            models=models,
            total=total,
            limit=limit,
            offset=offset
        )
        
    except Exception as e:
        logger.error("Erro ao obter modelos", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao obter modelos"
        )


@router.get("/{model_id}", response_model=ModelResponse)
async def get_model(
    model_id: int,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_async_session)
):
    """Obter modelo específico"""
    try:
        model_service = ModelService(db)
        model = await model_service.get_model_by_id(model_id)
        
        if not model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Modelo não encontrado"
            )
        
        logger.info("Modelo obtido", user_id=current_user.id, model_id=model_id)
        return model
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erro ao obter modelo", model_id=model_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao obter modelo"
        )


@router.post("/activate", response_model=Dict[str, Any])
async def activate_model(
    request: ModelActivateRequest,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_async_session)
):
    """Ativar modelo"""
    try:
        model_service = ModelService(db)
        result = await model_service.activate_model(request.model_id)
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["message"]
            )
        
        logger.info("Modelo ativado", user_id=current_user.id, model_id=request.model_id)
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erro ao ativar modelo", model_id=request.model_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao ativar modelo"
        )


@router.post("/retrain", response_model=Dict[str, Any])
async def retrain_model(
    request: ModelRetrainRequest,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_async_session)
):
    """Retreinar modelo"""
    try:
        model_service = ModelService(db)
        result = await model_service.retrain_model(request.model_id, request.force)
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["message"]
            )
        
        logger.info("Modelo retreinado", user_id=current_user.id, model_id=request.model_id)
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erro ao retreinar modelo", model_id=request.model_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao retreinar modelo"
        )


@router.get("/{model_id}/metrics")
async def get_model_metrics(
    model_id: int,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_async_session)
):
    """Obter métricas do modelo"""
    try:
        model_service = ModelService(db)
        metrics = await model_service.get_model_metrics(model_id)
        
        if not metrics:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Modelo não encontrado ou sem métricas"
            )
        
        logger.info("Métricas do modelo obtidas", user_id=current_user.id, model_id=model_id)
        return {"metrics": metrics}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erro ao obter métricas do modelo", model_id=model_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao obter métricas do modelo"
        )


@router.get("/{model_id}/performance")
async def get_model_performance(
    model_id: int,
    days: int = Query(7, ge=1, le=365, description="Número de dias para análise"),
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_async_session)
):
    """Obter performance do modelo"""
    try:
        model_service = ModelService(db)
        performance = await model_service.get_model_performance(model_id, days)
        
        if not performance:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Modelo não encontrado ou sem dados de performance"
            )
        
        logger.info("Performance do modelo obtida", user_id=current_user.id, model_id=model_id, days=days)
        return performance
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erro ao obter performance do modelo", model_id=model_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao obter performance do modelo"
        )


@router.post("/{model_id}/rollback")
async def rollback_model(
    model_id: int,
    version: Optional[str] = Query(None, description="Versão para rollback"),
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_async_session)
):
    """Fazer rollback do modelo"""
    try:
        model_service = ModelService(db)
        result = await model_service.rollback_model(model_id, version)
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["message"]
            )
        
        logger.info("Rollback do modelo realizado", user_id=current_user.id, model_id=model_id, version=version)
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erro ao fazer rollback do modelo", model_id=model_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao fazer rollback do modelo"
        )


@router.get("/mlflow/list")
async def list_mlflow_models(
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_async_session)
):
    """Listar modelos no MLflow"""
    try:
        model_service = ModelService(db)
        models = await model_service.list_mlflow_models()
        
        logger.info("Modelos MLflow listados", user_id=current_user.id, count=len(models))
        return {"models": models}
        
    except Exception as e:
        logger.error("Erro ao listar modelos MLflow", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao listar modelos MLflow"
        )

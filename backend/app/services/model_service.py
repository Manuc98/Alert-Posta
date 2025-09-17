"""
Serviço para gestão de modelos ML
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.core.logging import get_logger
from app.core.cache import cache_manager
from app.core.exceptions import ModelNotFoundException
from app.core.mlflow_client import mlflow_manager
from app.models.model import Model
from app.schemas.model import ModelResponse, ModelMetrics, ModelPerformance, MLflowModelInfo

logger = get_logger("model_service")


class ModelService:
    """Serviço para gestão de modelos ML"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.cache = cache_manager
    
    async def get_models(
        self,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 100,
        offset: int = 0
    ) -> Tuple[List[ModelResponse], int]:
        """Obter lista de modelos com filtros"""
        try:
            # Construir query base
            query = select(Model)
            count_query = select(func.count(Model.id))
            
            # Aplicar filtros
            conditions = []
            
            if filters:
                if filters.get("module"):
                    conditions.append(Model.module == filters["module"])
                
                if filters.get("active_only"):
                    conditions.append(Model.is_active == True)
            
            if conditions:
                query = query.where(and_(*conditions))
                count_query = count_query.where(and_(*conditions))
            
            # Aplicar ordenação e paginação
            query = query.order_by(Model.created_at.desc()).offset(offset).limit(limit)
            
            # Executar queries
            result = await self.db.execute(query)
            models = result.scalars().all()
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()
            
            # Converter para response
            model_responses = [self._model_to_response(model) for model in models]
            
            logger.info("Modelos obtidos", count=len(models), total=total, filters=filters)
            
            return model_responses, total
            
        except Exception as e:
            logger.error("Erro ao obter modelos", error=str(e))
            raise
    
    async def get_model_by_id(self, model_id: int) -> Optional[ModelResponse]:
        """Obter modelo por ID"""
        try:
            # Verificar cache primeiro
            cache_key = f"model:{model_id}"
            cached_model = await self.cache.get(cache_key)
            if cached_model:
                return ModelResponse(**cached_model)
            
            # Obter da base de dados
            result = await self.db.execute(
                select(Model).where(Model.id == model_id)
            )
            model = result.scalar_one_or_none()
            
            if not model:
                return None
            
            # Converter para response
            model_response = self._model_to_response(model)
            
            # Cache por 5 minutos
            await self.cache.set(cache_key, model_response.dict(), ttl=300)
            
            logger.info("Modelo obtido", model_id=model_id)
            return model_response
            
        except Exception as e:
            logger.error("Erro ao obter modelo", model_id=model_id, error=str(e))
            raise
    
    async def activate_model(self, model_id: int) -> Dict[str, Any]:
        """Ativar modelo"""
        try:
            # Obter modelo
            result = await self.db.execute(
                select(Model).where(Model.id == model_id)
            )
            model = result.scalar_one_or_none()
            
            if not model:
                raise ModelNotFoundException(str(model_id))
            
            # Desativar outros modelos do mesmo módulo
            await self.db.execute(
                select(Model).where(
                    and_(Model.module == model.module, Model.is_active == True)
                )
            )
            other_models = result.scalars().all()
            for other_model in other_models:
                other_model.deactivate()
            
            # Ativar modelo atual
            model.activate()
            
            # Salvar
            await self.db.commit()
            
            # Invalidar cache
            await self.cache.delete(f"model:{model_id}")
            await self.cache.delete("models:active")
            
            logger.info("Modelo ativado", model_id=model_id, module=model.module)
            
            return {
                "success": True,
                "message": f"Modelo {model.name} ativado com sucesso",
                "model_id": model_id,
                "module": model.module
            }
            
        except ModelNotFoundException:
            raise
        except Exception as e:
            logger.error("Erro ao ativar modelo", model_id=model_id, error=str(e))
            await self.db.rollback()
            return {"success": False, "message": str(e)}
    
    async def retrain_model(self, model_id: int, force: bool = False) -> Dict[str, Any]:
        """Retreinar modelo"""
        try:
            # Obter modelo
            result = await self.db.execute(
                select(Model).where(Model.id == model_id)
            )
            model = result.scalar_one_or_none()
            
            if not model:
                raise ModelNotFoundException(str(model_id))
            
            # Verificar se já está em treino
            if model.is_training and not force:
                return {
                    "success": False,
                    "message": "Modelo já está em treino. Use force=true para forçar."
                }
            
            # Marcar como em treino
            model.start_training()
            await self.db.commit()
            
            # Aqui seria iniciado o processo de retreino real
            # Por agora, simulamos o processo
            
            # Simular retreino (em produção seria assíncrono)
            await self._simulate_retrain(model)
            
            logger.info("Modelo retreinado", model_id=model_id, module=model.module)
            
            return {
                "success": True,
                "message": f"Modelo {model.name} retreinado com sucesso",
                "model_id": model_id,
                "training_started_at": datetime.utcnow().isoformat()
            }
            
        except ModelNotFoundException:
            raise
        except Exception as e:
            logger.error("Erro ao retreinar modelo", model_id=model_id, error=str(e))
            await self.db.rollback()
            return {"success": False, "message": str(e)}
    
    async def get_model_metrics(self, model_id: int) -> Optional[ModelMetrics]:
        """Obter métricas do modelo"""
        try:
            # Obter modelo
            result = await self.db.execute(
                select(Model).where(Model.id == model_id)
            )
            model = result.scalar_one_or_none()
            
            if not model:
                return None
            
            # Extrair métricas do JSON
            metrics_data = model.metrics_json or {}
            
            return ModelMetrics(
                accuracy=metrics_data.get("accuracy", 0.0),
                precision=metrics_data.get("precision", 0.0),
                recall=metrics_data.get("recall", 0.0),
                f1_score=metrics_data.get("f1_score", 0.0),
                auc_roc=metrics_data.get("auc_roc"),
                log_loss=metrics_data.get("log_loss"),
                confusion_matrix=metrics_data.get("confusion_matrix"),
                feature_importance=metrics_data.get("feature_importance")
            )
            
        except Exception as e:
            logger.error("Erro ao obter métricas do modelo", model_id=model_id, error=str(e))
            return None
    
    async def get_model_performance(self, model_id: int, days: int = 7) -> Optional[ModelPerformance]:
        """Obter performance do modelo"""
        try:
            # Obter modelo
            result = await self.db.execute(
                select(Model).where(Model.id == model_id)
            )
            model = result.scalar_one_or_none()
            
            if not model:
                return None
            
            # Aqui seria feita a análise de performance real
            # Por agora, retornamos dados simulados
            
            performance = ModelPerformance(
                model_id=model.id,
                model_name=model.name,
                module=model.module,
                total_signals=0,  # Seria calculado a partir dos sinais
                successful_signals=0,
                failed_signals=0,
                accuracy_rate=model.accuracy,
                success_rate=model.accuracy,
                avg_confidence=0.0,
                avg_probability=0.0,
                profit_loss=0.0,
                period_days=days,
                last_updated=datetime.utcnow()
            )
            
            logger.info("Performance do modelo obtida", model_id=model_id, days=days)
            
            return performance
            
        except Exception as e:
            logger.error("Erro ao obter performance do modelo", model_id=model_id, error=str(e))
            return None
    
    async def rollback_model(self, model_id: int, version: Optional[str] = None) -> Dict[str, Any]:
        """Fazer rollback do modelo"""
        try:
            # Obter modelo
            result = await self.db.execute(
                select(Model).where(Model.id == model_id)
            )
            model = result.scalar_one_or_none()
            
            if not model:
                raise ModelNotFoundException(str(model_id))
            
            # Aqui seria implementado o rollback real via MLflow
            # Por agora, simulamos o processo
            
            logger.info("Rollback do modelo realizado", model_id=model_id, version=version)
            
            return {
                "success": True,
                "message": f"Modelo {model.name} revertido para versão {version or 'anterior'}",
                "model_id": model_id,
                "version": version
            }
            
        except ModelNotFoundException:
            raise
        except Exception as e:
            logger.error("Erro ao fazer rollback do modelo", model_id=model_id, error=str(e))
            return {"success": False, "message": str(e)}
    
    async def list_mlflow_models(self) -> List[MLflowModelInfo]:
        """Listar modelos no MLflow"""
        try:
            # Usar o MLflow manager para listar modelos
            mlflow_models = mlflow_manager.list_models()
            
            # Converter para o formato esperado
            models_info = []
            for model in mlflow_models:
                models_info.append(MLflowModelInfo(
                    name=model["name"],
                    latest_version=model["latest_version"],
                    stage=model["stage"],
                    description=model["description"],
                    last_updated=model["last_updated"]
                ))
            
            logger.info("Modelos MLflow listados", count=len(models_info))
            
            return models_info
            
        except Exception as e:
            logger.error("Erro ao listar modelos MLflow", error=str(e))
            return []
    
    async def _simulate_retrain(self, model: Model):
        """Simular processo de retreino"""
        try:
            # Simular métricas de retreino
            new_metrics = {
                "accuracy": 0.85 + (hash(str(model.id)) % 10) / 100,
                "precision": 0.82 + (hash(str(model.id)) % 10) / 100,
                "recall": 0.83 + (hash(str(model.id)) % 10) / 100,
                "f1_score": 0.84 + (hash(str(model.id)) % 10) / 100
            }
            
            # Finalizar treino
            model.finish_training(new_metrics)
            await self.db.commit()
            
            logger.info("Retreino simulado concluído", model_id=model.id, metrics=new_metrics)
            
        except Exception as e:
            logger.error("Erro na simulação de retreino", model_id=model.id, error=str(e))
            model.finish_training()
            await self.db.commit()
    
    def _model_to_response(self, model: Model) -> ModelResponse:
        """Converter Model para ModelResponse"""
        return ModelResponse(
            id=model.id,
            name=model.name,
            module=model.module,
            version=model.version,
            description=model.description,
            mlflow_run_id=model.mlflow_run_id,
            mlflow_model_uri=model.mlflow_model_uri,
            mlflow_experiment_id=model.mlflow_experiment_id,
            is_active=model.is_active,
            is_training=model.is_training,
            metrics_json=model.metrics_json or {},
            config_json=model.config_json or {},
            created_at=model.created_at,
            updated_at=model.updated_at,
            last_trained_at=model.last_trained_at
        )

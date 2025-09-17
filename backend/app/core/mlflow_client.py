"""
Cliente MLflow para Alert@Postas V3
"""

import mlflow
import mlflow.sklearn
import mlflow.xgboost
import mlflow.lightgbm
import mlflow.pytorch
from mlflow.tracking import MlflowClient
from typing import Dict, Any, Optional, List
import os
import tempfile
import shutil

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("mlflow")


def init_mlflow():
    """Inicializar MLflow"""
    try:
        # Configurar tracking URI
        mlflow.set_tracking_uri(settings.MLFLOW_TRACKING_URI)
        
        # Criar experimento se não existir
        try:
            experiment = mlflow.get_experiment_by_name(settings.MLFLOW_EXPERIMENT_NAME)
            if experiment is None:
                mlflow.create_experiment(settings.MLFLOW_EXPERIMENT_NAME)
                logger.info("Experimento MLflow criado", experiment=settings.MLFLOW_EXPERIMENT_NAME)
            else:
                logger.info("Experimento MLflow encontrado", experiment=settings.MLFLOW_EXPERIMENT_NAME)
        except Exception as e:
            logger.warning("Erro ao criar/verificar experimento", error=str(e))
        
        # Definir experimento ativo
        mlflow.set_experiment(settings.MLFLOW_EXPERIMENT_NAME)
        
        logger.info("MLflow inicializado com sucesso")
        
    except Exception as e:
        logger.error("Erro ao inicializar MLflow", error=str(e))
        raise


class MLflowManager:
    """Gestor MLflow para modelos"""
    
    def __init__(self):
        self.client = MlflowClient()
        self.experiment_name = settings.MLFLOW_EXPERIMENT_NAME
    
    def create_run(self, model_name: str, module: str) -> str:
        """Criar novo run"""
        with mlflow.start_run(run_name=f"{model_name}_{module}") as run:
            run_id = run.info.run_id
            
            # Log tags
            mlflow.set_tag("model_name", model_name)
            mlflow.set_tag("module", module)
            mlflow.set_tag("version", "v1.0")
            
            logger.info("Run MLflow criado", run_id=run_id, model=model_name, module=module)
            return run_id
    
    def log_model(self, model, model_name: str, model_type: str = "sklearn") -> str:
        """Log modelo no MLflow"""
        try:
            if model_type == "sklearn":
                mlflow.sklearn.log_model(model, "model")
            elif model_type == "xgboost":
                mlflow.xgboost.log_model(model, "model")
            elif model_type == "lightgbm":
                mlflow.lightgbm.log_model(model, "model")
            elif model_type == "pytorch":
                mlflow.pytorch.log_model(model, "model")
            else:
                raise ValueError(f"Tipo de modelo não suportado: {model_type}")
            
            # Obter URI do modelo
            model_uri = f"runs:/{mlflow.active_run().info.run_id}/model"
            
            logger.info("Modelo logado no MLflow", model=model_name, type=model_type, uri=model_uri)
            return model_uri
            
        except Exception as e:
            logger.error("Erro ao logar modelo", model=model_name, error=str(e))
            raise
    
    def log_metrics(self, metrics: Dict[str, float]):
        """Log métricas"""
        try:
            mlflow.log_metrics(metrics)
            logger.info("Métricas logadas", metrics=list(metrics.keys()))
        except Exception as e:
            logger.error("Erro ao logar métricas", error=str(e))
    
    def log_params(self, params: Dict[str, Any]):
        """Log parâmetros"""
        try:
            # Converter valores para string se necessário
            str_params = {k: str(v) for k, v in params.items()}
            mlflow.log_params(str_params)
            logger.info("Parâmetros logados", params=list(params.keys()))
        except Exception as e:
            logger.error("Erro ao logar parâmetros", error=str(e))
    
    def log_artifacts(self, artifacts_dir: str):
        """Log artefatos"""
        try:
            mlflow.log_artifacts(artifacts_dir)
            logger.info("Artefatos logados", directory=artifacts_dir)
        except Exception as e:
            logger.error("Erro ao logar artefatos", error=str(e))
    
    def log_dataset_info(self, dataset_path: str, dataset_name: str):
        """Log informação do dataset"""
        try:
            # Log dataset como artefato
            mlflow.log_artifact(dataset_path, "datasets")
            
            # Log metadados do dataset
            file_size = os.path.getsize(dataset_path)
            mlflow.log_param("dataset_name", dataset_name)
            mlflow.log_param("dataset_size_bytes", file_size)
            mlflow.log_param("dataset_size_mb", round(file_size / (1024 * 1024), 2))
            
            logger.info("Dataset logado", name=dataset_name, size_mb=round(file_size / (1024 * 1024), 2))
            
        except Exception as e:
            logger.error("Erro ao logar dataset", dataset=dataset_name, error=str(e))
    
    def get_model_uri(self, model_name: str, version: str = "latest") -> Optional[str]:
        """Obter URI do modelo"""
        try:
            if version == "latest":
                model_versions = self.client.get_latest_versions(model_name, stages=["None"])
                if model_versions:
                    return f"models:/{model_name}/{model_versions[0].version}"
                return None
            else:
                return f"models:/{model_name}/{version}"
                
        except Exception as e:
            logger.error("Erro ao obter URI do modelo", model=model_name, version=version, error=str(e))
            return None
    
    def register_model(self, model_uri: str, model_name: str) -> str:
        """Registar modelo no Model Registry"""
        try:
            model_version = mlflow.register_model(model_uri, model_name)
            logger.info("Modelo registado", name=model_name, version=model_version.version)
            return model_version.version
            
        except Exception as e:
            logger.error("Erro ao registar modelo", model=model_name, error=str(e))
            raise
    
    def transition_model_stage(self, model_name: str, version: str, stage: str):
        """Transicionar modelo para novo stage"""
        try:
            self.client.transition_model_version_stage(
                name=model_name,
                version=version,
                stage=stage
            )
            logger.info("Modelo transicionado", model=model_name, version=version, stage=stage)
            
        except Exception as e:
            logger.error("Erro ao transicionar modelo", model=model_name, version=version, stage=stage, error=str(e))
    
    def get_model_info(self, model_name: str, version: str = "latest") -> Optional[Dict[str, Any]]:
        """Obter informação do modelo"""
        try:
            if version == "latest":
                versions = self.client.get_latest_versions(model_name)
                if not versions:
                    return None
                version = versions[0].version
            
            model_version = self.client.get_model_version(model_name, version)
            
            return {
                "name": model_version.name,
                "version": model_version.version,
                "stage": model_version.current_stage,
                "description": model_version.description,
                "creation_timestamp": model_version.creation_timestamp,
                "last_updated_timestamp": model_version.last_updated_timestamp
            }
            
        except Exception as e:
            logger.error("Erro ao obter informação do modelo", model=model_name, version=version, error=str(e))
            return None
    
    def list_models(self) -> List[Dict[str, Any]]:
        """Listar todos os modelos"""
        try:
            models = self.client.search_registered_models()
            
            result = []
            for model in models:
                latest_version = self.client.get_latest_versions(model.name)
                if latest_version:
                    latest = latest_version[0]
                    result.append({
                        "name": model.name,
                        "latest_version": latest.version,
                        "stage": latest.current_stage,
                        "description": model.description,
                        "last_updated": latest.last_updated_timestamp
                    })
            
            return result
            
        except Exception as e:
            logger.error("Erro ao listar modelos", error=str(e))
            return []


# Instância global do gestor MLflow
mlflow_manager = MLflowManager()

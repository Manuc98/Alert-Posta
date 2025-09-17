"""
Schemas Pydantic para Models
"""

from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime


class ModelResponse(BaseModel):
    """Resposta de modelo"""
    id: int
    name: str
    module: str
    version: str
    description: Optional[str] = None
    mlflow_run_id: Optional[str] = None
    mlflow_model_uri: str
    mlflow_experiment_id: Optional[str] = None
    is_active: bool
    is_training: bool
    metrics_json: Dict[str, Any] = Field(default_factory=dict)
    config_json: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime
    last_trained_at: Optional[datetime] = None
    
    @property
    def accuracy(self) -> float:
        return self.metrics_json.get("accuracy", 0.0)
    
    @property
    def precision(self) -> float:
        return self.metrics_json.get("precision", 0.0)
    
    @property
    def recall(self) -> float:
        return self.metrics_json.get("recall", 0.0)
    
    @property
    def f1_score(self) -> float:
        return self.metrics_json.get("f1_score", 0.0)


class ModelListResponse(BaseModel):
    """Resposta de lista de modelos"""
    models: List[ModelResponse]
    total: int
    limit: int
    offset: int


class ModelActivateRequest(BaseModel):
    """Request para ativar modelo"""
    model_id: int


class ModelRetrainRequest(BaseModel):
    """Request para retreinar modelo"""
    model_id: int
    force: bool = False


class ModelMetrics(BaseModel):
    """Métricas do modelo"""
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    auc_roc: Optional[float] = None
    log_loss: Optional[float] = None
    confusion_matrix: Optional[List[List[int]]] = None
    feature_importance: Optional[List[Dict[str, Any]]] = None


class ModelPerformance(BaseModel):
    """Performance do modelo"""
    model_id: int
    model_name: str
    module: str
    total_signals: int
    successful_signals: int
    failed_signals: int
    accuracy_rate: float
    success_rate: float
    avg_confidence: float
    avg_probability: float
    profit_loss: float
    period_days: int
    last_updated: datetime


class MLflowModelInfo(BaseModel):
    """Informação de modelo MLflow"""
    name: str
    latest_version: str
    stage: str
    description: Optional[str] = None
    last_updated: datetime
    run_id: Optional[str] = None
    model_uri: Optional[str] = None

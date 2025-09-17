"""
Schemas Pydantic para Signals
"""

from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime


class SignalResponse(BaseModel):
    """Resposta de sinal"""
    id: int
    signal_id: str
    game_id: int
    model_id: int
    module: str
    prediction_type: str
    prediction: str
    probability: float
    confidence: float
    expected_value: float
    status: str
    sent: bool
    sent_at: Optional[datetime] = None
    payload_json: Dict[str, Any] = Field(default_factory=dict)
    telegram_message_id: Optional[str] = None
    explain_shap: Dict[str, Any] = Field(default_factory=dict)
    hit: Optional[bool] = None
    hit_checked_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    @property
    def is_successful(self) -> bool:
        return self.hit is True
    
    @property
    def is_failed(self) -> bool:
        return self.hit is False
    
    @property
    def is_pending_verification(self) -> bool:
        return self.hit is None
    
    @property
    def is_sent(self) -> bool:
        return self.sent and self.sent_at is not None


class SignalUpdate(BaseModel):
    """Atualização de sinal"""
    payload_json: Optional[Dict[str, Any]] = None
    status: Optional[str] = None
    hit: Optional[bool] = None


class SignalCreate(BaseModel):
    """Criação de sinal"""
    game_id: int
    model_id: int
    module: str
    prediction_type: str
    prediction: str
    probability: float
    confidence: float
    expected_value: float = 0.0
    payload_json: Dict[str, Any] = Field(default_factory=dict)
    explain_shap: Dict[str, Any] = Field(default_factory=dict)


class SignalListResponse(BaseModel):
    """Resposta de lista de sinais"""
    signals: List[SignalResponse]
    total: int
    limit: int
    offset: int


class SignalFilters(BaseModel):
    """Filtros para sinais"""
    status: Optional[str] = None
    module: Optional[str] = None
    sent: Optional[bool] = None
    hit: Optional[bool] = None
    game_id: Optional[int] = None
    model_id: Optional[int] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None


class SignalExplainResponse(BaseModel):
    """Resposta de explicação SHAP"""
    signal_id: str
    features: List[Dict[str, Any]]
    explanation_text: str
    model_name: str
    module: str


class SignalStatsResponse(BaseModel):
    """Estatísticas de sinais"""
    total_signals: int
    sent_signals: int
    successful_signals: int
    failed_signals: int
    pending_verification: int
    accuracy_rate: float
    success_rate: float
    avg_confidence: float
    avg_probability: float

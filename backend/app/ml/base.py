"""
Classe base para módulos ML
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
import pandas as pd
from datetime import datetime
import joblib
import os

from app.core.logging import get_logger
from app.core.config import settings

logger = get_logger("ml_base")


class BaseMLModule(ABC):
    """Classe base para módulos de ML"""
    
    def __init__(self, module_name: str):
        self.module_name = module_name
        self.model = None
        self.features = []
        self.is_trained = False
        self.model_path = os.path.join(settings.MODELS_PATH, f"{module_name}_model.pkl")
        
    @abstractmethod
    def prepare_features(self, game_data: Dict[str, Any]) -> np.ndarray:
        """Preparar features para o modelo"""
        pass
    
    @abstractmethod
    def predict(self, features: np.ndarray) -> Tuple[np.ndarray, float]:
        """Fazer previsão"""
        pass
    
    @abstractmethod
    def train(self, X: np.ndarray, y: np.ndarray) -> Dict[str, float]:
        """Treinar modelo"""
        pass
    
    def load_model(self) -> bool:
        """Carregar modelo salvo"""
        try:
            if os.path.exists(self.model_path):
                self.model = joblib.load(self.model_path)
                self.is_trained = True
                logger.info("Modelo carregado", module=self.module_name, path=self.model_path)
                return True
            else:
                logger.warning("Modelo não encontrado", module=self.module_name, path=self.model_path)
                return False
        except Exception as e:
            logger.error("Erro ao carregar modelo", module=self.module_name, error=str(e))
            return False
    
    def save_model(self) -> bool:
        """Salvar modelo"""
        try:
            if not os.path.exists(settings.MODELS_PATH):
                os.makedirs(settings.MODELS_PATH, exist_ok=True)
            
            joblib.dump(self.model, self.model_path)
            logger.info("Modelo salvo", module=self.module_name, path=self.model_path)
            return True
        except Exception as e:
            logger.error("Erro ao salvar modelo", module=self.module_name, error=str(e))
            return False
    
    def get_feature_importance(self) -> Dict[str, float]:
        """Obter importância das features"""
        try:
            if hasattr(self.model, 'feature_importances_'):
                importance_dict = dict(zip(self.features, self.model.feature_importances_))
                return dict(sorted(importance_dict.items(), key=lambda x: x[1], reverse=True))
            else:
                logger.warning("Modelo não tem feature_importances_", module=self.module_name)
                return {}
        except Exception as e:
            logger.error("Erro ao obter importância das features", module=self.module_name, error=str(e))
            return {}
    
    def validate_features(self, features: np.ndarray) -> bool:
        """Validar features"""
        try:
            if features is None or len(features) == 0:
                return False
            
            if np.any(np.isnan(features)) or np.any(np.isinf(features)):
                return False
            
            return True
        except Exception as e:
            logger.error("Erro na validação de features", module=self.module_name, error=str(e))
            return False
    
    def calculate_confidence(self, prediction_proba: np.ndarray) -> float:
        """Calcular confiança da previsão"""
        try:
            # Confiança baseada na diferença entre a maior e segunda maior probabilidade
            if len(prediction_proba) >= 2:
                sorted_proba = np.sort(prediction_proba)[::-1]
                confidence = sorted_proba[0] - sorted_proba[1]
                return float(confidence)
            else:
                return float(prediction_proba[0]) if len(prediction_proba) > 0 else 0.0
        except Exception as e:
            logger.error("Erro ao calcular confiança", module=self.module_name, error=str(e))
            return 0.0
    
    def generate_explanation(self, features: np.ndarray, prediction: str, confidence: float) -> Dict[str, Any]:
        """Gerar explicação da previsão"""
        try:
            feature_importance = self.get_feature_importance()
            
            # Top 5 features mais importantes
            top_features = list(feature_importance.items())[:5]
            
            # Explicação textual baseada nas features
            explanation_parts = []
            
            for feature, importance in top_features:
                if importance > 0.1:  # Features com importância significativa
                    explanation_parts.append(f"{feature} (importância: {importance:.2f})")
            
            explanation_text = f"Previsão baseada em: {', '.join(explanation_parts[:3])}"
            
            return {
                "features": [
                    {"name": name, "importance": float(importance)}
                    for name, importance in top_features
                ],
                "text": explanation_text,
                "confidence": confidence,
                "module": self.module_name
            }
            
        except Exception as e:
            logger.error("Erro ao gerar explicação", module=self.module_name, error=str(e))
            return {
                "features": [],
                "text": "Erro ao gerar explicação",
                "confidence": confidence,
                "module": self.module_name
            }

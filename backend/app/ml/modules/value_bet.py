"""
Módulo 5 - Value Betting (Filtro Final)
Compara prob predita vs implied probability das odds
Só envia sinais com EV positivo
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple, Optional
from scipy import stats
import math

from app.ml.base import BaseMLModule
from app.core.logging import get_logger

logger = get_logger("ml_value_bet")


class ValueBetModule(BaseMLModule):
    """Módulo para value betting - filtro final"""
    
    def __init__(self):
        super().__init__("value_bet")
        self.features = [
            "predicted_probability", "market_odds", "implied_probability",
            "model_confidence", "historical_accuracy", "sample_size",
            "market_volume", "odds_movement", "bookmaker_margin",
            "competition_level", "market_efficiency", "value_score",
            "kelly_percentage", "expected_value", "risk_score"
        ]
        
        # Configurações de value betting
        self.min_value_threshold = 0.05  # 5% EV mínimo
        self.max_kelly_percentage = 0.25  # 25% máximo do bankroll
        self.min_confidence_threshold = 0.60  # 60% confiança mínima
        self.min_sample_size = 50  # Amostra mínima para confiabilidade
        
    def prepare_features(self, game_data: Dict[str, Any]) -> np.ndarray:
        """Preparar features para value betting"""
        try:
            features = []
            
            # Dados da previsão
            prediction_data = game_data.get("prediction_data", {})
            features.append(prediction_data.get("predicted_probability", 0.5))
            features.append(prediction_data.get("market_odds", 2.0))
            
            # Calcular probabilidade implícita
            implied_prob = self._calculate_implied_probability(
                prediction_data.get("market_odds", 2.0)
            )
            features.append(implied_prob)
            
            # Confiança do modelo
            features.append(prediction_data.get("model_confidence", 0.5))
            
            # Dados históricos
            historical_data = game_data.get("historical_data", {})
            features.append(historical_data.get("accuracy", 0.5))
            features.append(historical_data.get("sample_size", 0))
            
            # Dados do mercado
            market_data = game_data.get("market_data", {})
            features.append(market_data.get("volume", 1000))
            features.append(market_data.get("odds_movement", 0.0))
            features.append(market_data.get("bookmaker_margin", 0.05))
            
            # Características da competição
            competition_data = game_data.get("competition_data", {})
            features.append(self._encode_competition_level(competition_data.get("level", "normal")))
            features.append(competition_data.get("market_efficiency", 0.7))
            
            # Calcular métricas de value
            value_score = self._calculate_value_score(
                prediction_data.get("predicted_probability", 0.5),
                prediction_data.get("market_odds", 2.0)
            )
            features.append(value_score)
            
            # Kelly Criterion
            kelly_pct = self._calculate_kelly_percentage(
                prediction_data.get("predicted_probability", 0.5),
                prediction_data.get("market_odds", 2.0)
            )
            features.append(kelly_pct)
            
            # Expected Value
            expected_value = self._calculate_expected_value(
                prediction_data.get("predicted_probability", 0.5),
                prediction_data.get("market_odds", 2.0)
            )
            features.append(expected_value)
            
            # Risk Score
            risk_score = self._calculate_risk_score(game_data)
            features.append(risk_score)
            
            features_array = np.array(features).reshape(1, -1)
            
            return features_array
            
        except Exception as e:
            logger.error("Erro ao preparar features para value betting", error=str(e))
            return np.array([[]])
    
    def predict(self, features: np.ndarray) -> Tuple[np.ndarray, float]:
        """Avaliar value betting"""
        try:
            if not self.validate_features(features):
                logger.warning("Features inválidas", module=self.module_name)
                return np.array([]), 0.0
            
            # Extrair dados das features
            feature_dict = self._extract_feature_dict(features[0])
            
            # Avaliar se é um value bet
            value_assessment = self._assess_value_bet(feature_dict)
            
            if value_assessment["is_value_bet"]:
                result = f"value_bet:{value_assessment['bet_type']}"
                confidence = value_assessment["confidence"]
                
                logger.info(
                    "Value bet identificado",
                    bet_type=value_assessment["bet_type"],
                    expected_value=value_assessment["expected_value"],
                    kelly_percentage=value_assessment["kelly_percentage"],
                    confidence=confidence
                )
                
                return np.array([result]), confidence
            else:
                logger.info("Não é um value bet", reason=value_assessment["reason"])
                return np.array([]), 0.0
                
        except Exception as e:
            logger.error("Erro na avaliação de value betting", error=str(e))
            return np.array([]), 0.0
    
    def train(self, X: np.ndarray, y: np.ndarray) -> Dict[str, float]:
        """Treinar modelo de value betting"""
        try:
            if len(X) == 0 or len(y) == 0:
                logger.warning("Dados de treino vazios", module=self.module_name)
                return {"accuracy": 0.0}
            
            # Analisar histórico de value bets bem-sucedidos
            successful_bets = self._analyze_successful_value_bets(X, y)
            
            # Otimizar thresholds baseado no histórico
            optimized_thresholds = self._optimize_thresholds(X, y)
            
            # Atualizar configurações
            self.min_value_threshold = optimized_thresholds.get("min_value_threshold", self.min_value_threshold)
            self.min_confidence_threshold = optimized_thresholds.get("min_confidence_threshold", self.min_confidence_threshold)
            
            # Calcular accuracy
            accuracy = self._calculate_value_bet_accuracy(X, y)
            
            self.is_trained = True
            
            logger.info("Modelo de value betting treinado", accuracy=accuracy, samples=len(X))
            
            return {
                "accuracy": float(accuracy),
                "samples": len(X),
                "successful_bets": len(successful_bets),
                "optimized_thresholds": optimized_thresholds
            }
            
        except Exception as e:
            logger.error("Erro no treino do modelo de value betting", error=str(e))
            return {"accuracy": 0.0, "error": str(e)}
    
    def _assess_value_bet(self, features: Dict[str, float]) -> Dict[str, Any]:
        """Avaliar se é um value bet"""
        try:
            predicted_prob = features["predicted_probability"]
            market_odds = features["market_odds"]
            model_confidence = features["model_confidence"]
            historical_accuracy = features["historical_accuracy"]
            sample_size = features["sample_size"]
            expected_value = features["expected_value"]
            kelly_percentage = features["kelly_percentage"]
            risk_score = features["risk_score"]
            
            # Verificar critérios básicos
            reasons = []
            
            # 1. Expected Value mínimo
            if expected_value < self.min_value_threshold:
                reasons.append("EV abaixo do threshold")
            
            # 2. Confiança mínima
            if model_confidence < self.min_confidence_threshold:
                reasons.append("Confiança abaixo do threshold")
            
            # 3. Amostra suficiente
            if sample_size < self.min_sample_size:
                reasons.append("Amostra insuficiente")
            
            # 4. Kelly Criterion
            if kelly_percentage <= 0 or kelly_percentage > self.max_kelly_percentage:
                reasons.append("Kelly percentage inadequado")
            
            # 5. Risk Score
            if risk_score > 0.8:  # Alto risco
                reasons.append("Risco muito alto")
            
            # 6. Accuracy histórica
            if historical_accuracy < 0.55:  # Accuracy muito baixa
                reasons.append("Accuracy histórica baixa")
            
            # Determinar se é value bet
            is_value_bet = len(reasons) == 0
            
            if is_value_bet:
                # Determinar tipo de aposta
                bet_type = self._determine_bet_type(features)
                
                # Calcular confiança final
                confidence = self._calculate_final_confidence(features)
                
                return {
                    "is_value_bet": True,
                    "bet_type": bet_type,
                    "expected_value": expected_value,
                    "kelly_percentage": kelly_percentage,
                    "confidence": confidence,
                    "stake_recommendation": kelly_percentage * 0.1  # 10% do bankroll máximo
                }
            else:
                return {
                    "is_value_bet": False,
                    "reasons": reasons,
                    "expected_value": expected_value,
                    "confidence": model_confidence
                }
                
        except Exception as e:
            logger.error("Erro na avaliação de value bet", error=str(e))
            return {"is_value_bet": False, "reasons": ["Erro na avaliação"]}
    
    def _calculate_implied_probability(self, odds: float) -> float:
        """Calcular probabilidade implícita das odds"""
        try:
            # Considerar margem da casa
            implied_prob = 1.0 / odds
            return min(0.95, max(0.05, implied_prob))  # Limitar entre 5% e 95%
        except Exception as e:
            logger.error("Erro ao calcular probabilidade implícita", error=str(e))
            return 0.5
    
    def _calculate_value_score(self, predicted_prob: float, market_odds: float) -> float:
        """Calcular score de value"""
        try:
            implied_prob = self._calculate_implied_probability(market_odds)
            value_score = (predicted_prob - implied_prob) / implied_prob
            return value_score
        except Exception as e:
            logger.error("Erro ao calcular value score", error=str(e))
            return 0.0
    
    def _calculate_kelly_percentage(self, predicted_prob: float, market_odds: float) -> float:
        """Calcular Kelly Criterion percentage"""
        try:
            b = market_odds - 1  # Net odds
            p = predicted_prob  # Probability of winning
            q = 1 - p  # Probability of losing
            
            kelly = (b * p - q) / b
            return max(0.0, min(1.0, kelly))  # Limitar entre 0% e 100%
        except Exception as e:
            logger.error("Erro ao calcular Kelly percentage", error=str(e))
            return 0.0
    
    def _calculate_expected_value(self, predicted_prob: float, market_odds: float) -> float:
        """Calcular Expected Value"""
        try:
            # EV = (Probability of Win * Net Odds) - (Probability of Loss)
            net_odds = market_odds - 1
            ev = (predicted_prob * net_odds) - (1 - predicted_prob)
            return ev
        except Exception as e:
            logger.error("Erro ao calcular Expected Value", error=str(e))
            return 0.0
    
    def _calculate_risk_score(self, game_data: Dict[str, Any]) -> float:
        """Calcular score de risco"""
        try:
            risk_factors = []
            
            # Risco baseado no mercado
            market_data = game_data.get("market_data", {})
            if market_data.get("volume", 1000) < 500:
                risk_factors.append(0.2)  # Baixo volume
            
            if abs(market_data.get("odds_movement", 0.0)) > 0.2:
                risk_factors.append(0.3)  # Movimento significativo
            
            # Risco baseado na competição
            competition_data = game_data.get("competition_data", {})
            if competition_data.get("level") == "amateur":
                risk_factors.append(0.2)  # Competição amadora
            
            if competition_data.get("market_efficiency", 0.7) < 0.6:
                risk_factors.append(0.1)  # Mercado ineficiente
            
            # Risco baseado nos dados históricos
            historical_data = game_data.get("historical_data", {})
            if historical_data.get("sample_size", 0) < 100:
                risk_factors.append(0.1)  # Amostra pequena
            
            # Calcular risco total
            total_risk = sum(risk_factors)
            return min(1.0, total_risk)  # Limitar em 100%
            
        except Exception as e:
            logger.error("Erro ao calcular risk score", error=str(e))
            return 0.5
    
    def _encode_competition_level(self, level: str) -> float:
        """Codificar nível da competição"""
        encoding = {
            "amateur": 0.2,
            "semi_pro": 0.4,
            "normal": 0.6,
            "professional": 0.8,
            "elite": 1.0
        }
        return encoding.get(level, 0.6)
    
    def _determine_bet_type(self, features: Dict[str, float]) -> str:
        """Determinar tipo de aposta"""
        try:
            # Baseado nas features, determinar o tipo de aposta
            # Simplificado - em produção seria mais complexo
            
            if features["expected_value"] > 0.1:
                return "high_value"
            elif features["expected_value"] > 0.05:
                return "medium_value"
            else:
                return "low_value"
                
        except Exception as e:
            logger.error("Erro ao determinar tipo de aposta", error=str(e))
            return "unknown"
    
    def _calculate_final_confidence(self, features: Dict[str, float]) -> float:
        """Calcular confiança final"""
        try:
            # Combinação ponderada de diferentes fatores de confiança
            model_confidence = features["model_confidence"]
            historical_accuracy = features["historical_accuracy"]
            sample_size_factor = min(1.0, features["sample_size"] / 200)  # Normalizar
            value_score_factor = min(1.0, features["value_score"] / 0.2)  # Normalizar
            
            # Pesos
            weights = [0.4, 0.3, 0.2, 0.1]
            factors = [model_confidence, historical_accuracy, sample_size_factor, value_score_factor]
            
            final_confidence = sum(w * f for w, f in zip(weights, factors))
            return min(0.95, max(0.05, final_confidence))
            
        except Exception as e:
            logger.error("Erro ao calcular confiança final", error=str(e))
            return features.get("model_confidence", 0.5)
    
    def _extract_feature_dict(self, features: np.ndarray) -> Dict[str, float]:
        """Extrair features para dicionário"""
        return {
            "predicted_probability": features[0],
            "market_odds": features[1],
            "implied_probability": features[2],
            "model_confidence": features[3],
            "historical_accuracy": features[4],
            "sample_size": features[5],
            "market_volume": features[6],
            "odds_movement": features[7],
            "bookmaker_margin": features[8],
            "competition_level": features[9],
            "market_efficiency": features[10],
            "value_score": features[11],
            "kelly_percentage": features[12],
            "expected_value": features[13],
            "risk_score": features[14]
        }
    
    def _analyze_successful_value_bets(self, X: np.ndarray, y: np.ndarray) -> List[Dict[str, Any]]:
        """Analisar value bets bem-sucedidos do histórico"""
        # Implementação simplificada
        return []
    
    def _optimize_thresholds(self, X: np.ndarray, y: np.ndarray) -> Dict[str, float]:
        """Otimizar thresholds baseado no histórico"""
        # Implementação simplificada
        return {
            "min_value_threshold": self.min_value_threshold,
            "min_confidence_threshold": self.min_confidence_threshold
        }
    
    def _calculate_value_bet_accuracy(self, X: np.ndarray, y: np.ndarray) -> float:
        """Calcular accuracy dos value bets"""
        # Implementação simplificada
        return 0.65  # Placeholder

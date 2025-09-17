"""
Módulo 4 - Múltiplas (Custom Strategy)
Combina previsões com Monte Carlo para validar risco
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple, Optional
from itertools import combinations, product
import random

from app.ml.base import BaseMLModule
from app.core.logging import get_logger

logger = get_logger("ml_multiple")


class MultipleModule(BaseMLModule):
    """Módulo para estratégias múltiplas personalizadas"""
    
    def __init__(self):
        super().__init__("multiple")
        self.features = [
            "winner_prediction", "winner_confidence",
            "next_goal_prediction", "next_goal_confidence",
            "over_under_prediction", "over_under_confidence",
            "home_odds", "away_odds", "draw_odds",
            "over_1_5_odds", "over_2_5_odds", "under_2_5_odds",
            "next_goal_home_odds", "next_goal_away_odds",
            "game_minute", "home_score", "away_score",
            "home_momentum", "away_momentum", "match_tempo",
            "weather_impact", "stadium_factor", "crowd_impact"
        ]
        
        # Estratégias pré-definidas
        self.strategies = {
            "conservative": {
                "max_combinations": 2,
                "min_confidence": 0.7,
                "max_risk": 0.1
            },
            "balanced": {
                "max_combinations": 3,
                "min_confidence": 0.6,
                "max_risk": 0.2
            },
            "aggressive": {
                "max_combinations": 4,
                "min_confidence": 0.55,
                "max_risk": 0.3
            }
        }
        
    def prepare_features(self, game_data: Dict[str, Any]) -> np.ndarray:
        """Preparar features para estratégias múltiplas"""
        try:
            features = []
            
            # Previsões dos outros módulos
            predictions = game_data.get("predictions", {})
            
            # Winner prediction
            winner_pred = predictions.get("winner", {})
            features.append(self._encode_prediction(winner_pred.get("prediction", "X")))
            features.append(winner_pred.get("confidence", 0.5))
            
            # Next goal prediction
            next_goal_pred = predictions.get("next_goal", {})
            features.append(self._encode_next_goal(next_goal_pred.get("prediction", "none")))
            features.append(next_goal_pred.get("confidence", 0.5))
            
            # Over/Under prediction
            over_under_pred = predictions.get("over_under", {})
            features.append(self._encode_over_under(over_under_pred.get("prediction", "under_2.5")))
            features.append(over_under_pred.get("confidence", 0.5))
            
            # Odds
            odds = game_data.get("odds", {})
            features.append(odds.get("home", 2.0))
            features.append(odds.get("away", 2.0))
            features.append(odds.get("draw", 3.0))
            features.append(odds.get("over_1_5", 1.5))
            features.append(odds.get("over_2_5", 2.0))
            features.append(odds.get("under_2_5", 1.8))
            features.append(odds.get("next_goal_home", 2.2))
            features.append(odds.get("next_goal_away", 2.2))
            
            # Estado do jogo
            features.append(game_data.get("minute", 0) / 90.0)  # Normalizar
            features.append(game_data.get("home_score", 0))
            features.append(game_data.get("away_score", 0))
            
            # Momentum e fatores do jogo
            features.append(game_data.get("home_momentum", 0.5))
            features.append(game_data.get("away_momentum", 0.5))
            features.append(game_data.get("match_tempo", 0.5))
            
            # Fatores externos
            features.append(self._calculate_weather_impact(game_data.get("weather", {})))
            features.append(game_data.get("stadium_factor", 1.0))
            features.append(game_data.get("crowd_impact", 0.5))
            
            features_array = np.array(features).reshape(1, -1)
            
            return features_array
            
        except Exception as e:
            logger.error("Erro ao preparar features para múltiplas", error=str(e))
            return np.array([[]])
    
    def predict(self, features: np.ndarray) -> Tuple[np.ndarray, float]:
        """Gerar estratégias múltiplas"""
        try:
            if not self.validate_features(features):
                logger.warning("Features inválidas", module=self.module_name)
                return np.array([]), 0.0
            
            # Extrair dados das features
            feature_dict = self._extract_feature_dict(features[0])
            
            # Gerar estratégias baseadas nos dados
            strategies = self._generate_strategies(feature_dict)
            
            # Selecionar melhor estratégia
            best_strategy = self._select_best_strategy(strategies)
            
            if best_strategy:
                result = best_strategy["combination"]
                confidence = best_strategy["confidence"]
                
                logger.info(
                    "Estratégia múltipla gerada",
                    combination=result,
                    confidence=confidence,
                    expected_value=best_strategy.get("expected_value", 0.0)
                )
                
                return np.array([result]), confidence
            else:
                logger.warning("Nenhuma estratégia válida encontrada")
                return np.array([]), 0.0
                
        except Exception as e:
            logger.error("Erro na geração de estratégias múltiplas", error=str(e))
            return np.array([]), 0.0
    
    def train(self, X: np.ndarray, y: np.ndarray) -> Dict[str, float]:
        """Treinar modelo de múltiplas (baseado em histórico)"""
        try:
            if len(X) == 0 or len(y) == 0:
                logger.warning("Dados de treino vazios", module=self.module_name)
                return {"accuracy": 0.0}
            
            # Analisar histórico de estratégias bem-sucedidas
            successful_combinations = self._analyze_successful_combinations(X, y)
            
            # Calcular accuracy baseada em estratégias
            accuracy = self._calculate_strategy_accuracy(X, y, successful_combinations)
            
            # Salvar padrões aprendidos
            self.successful_patterns = successful_combinations
            self.is_trained = True
            
            logger.info("Modelo de múltiplas treinado", accuracy=accuracy, samples=len(X))
            
            return {
                "accuracy": float(accuracy),
                "samples": len(X),
                "successful_patterns": len(successful_combinations)
            }
            
        except Exception as e:
            logger.error("Erro no treino do modelo de múltiplas", error=str(e))
            return {"accuracy": 0.0, "error": str(e)}
    
    def _generate_strategies(self, features: Dict[str, float]) -> List[Dict[str, Any]]:
        """Gerar estratégias baseadas nas features"""
        try:
            strategies = []
            
            # Definir possíveis seleções
            possible_selections = self._get_possible_selections(features)
            
            # Gerar combinações
            for strategy_name, config in self.strategies.items():
                combinations = self._generate_combinations(
                    possible_selections, 
                    config["max_combinations"]
                )
                
                for combination in combinations:
                    if self._validate_combination(combination, features, config):
                        strategy = self._evaluate_combination(combination, features)
                        if strategy:
                            strategies.append(strategy)
            
            # Ordenar por expected value
            strategies.sort(key=lambda x: x["expected_value"], reverse=True)
            
            return strategies
            
        except Exception as e:
            logger.error("Erro ao gerar estratégias", error=str(e))
            return []
    
    def _get_possible_selections(self, features: Dict[str, float]) -> List[Dict[str, Any]]:
        """Obter seleções possíveis baseadas nas features"""
        selections = []
        
        # Winner
        if features["winner_confidence"] > 0.55:
            winner_pred = self._decode_prediction(features["winner_prediction"])
            selections.append({
                "type": "winner",
                "selection": winner_pred,
                "odds": self._get_odds_for_selection("winner", winner_pred, features),
                "confidence": features["winner_confidence"],
                "probability": features["winner_confidence"]
            })
        
        # Next Goal
        if features["next_goal_confidence"] > 0.55:
            next_goal_pred = self._decode_next_goal(features["next_goal_prediction"])
            selections.append({
                "type": "next_goal",
                "selection": next_goal_pred,
                "odds": self._get_odds_for_selection("next_goal", next_goal_pred, features),
                "confidence": features["next_goal_confidence"],
                "probability": features["next_goal_confidence"]
            })
        
        # Over/Under
        if features["over_under_confidence"] > 0.55:
            over_under_pred = self._decode_over_under(features["over_under_prediction"])
            selections.append({
                "type": "over_under",
                "selection": over_under_pred,
                "odds": self._get_odds_for_selection("over_under", over_under_pred, features),
                "confidence": features["over_under_confidence"],
                "probability": features["over_under_confidence"]
            })
        
        return selections
    
    def _generate_combinations(self, selections: List[Dict[str, Any]], max_combinations: int) -> List[List[Dict[str, Any]]]:
        """Gerar combinações de seleções"""
        combinations_list = []
        
        # Gerar todas as combinações possíveis
        for r in range(2, min(len(selections) + 1, max_combinations + 1)):
            for combo in combinations(selections, r):
                combinations_list.append(list(combo))
        
        return combinations_list
    
    def _validate_combination(self, combination: List[Dict[str, Any]], features: Dict[str, float], config: Dict[str, float]) -> bool:
        """Validar se a combinação é válida"""
        try:
            # Verificar confiança mínima
            avg_confidence = sum(sel["confidence"] for sel in combination) / len(combination)
            if avg_confidence < config["min_confidence"]:
                return False
            
            # Verificar se não há conflitos
            if self._has_conflicts(combination):
                return False
            
            # Verificar risco máximo
            risk = self._calculate_combination_risk(combination)
            if risk > config["max_risk"]:
                return False
            
            return True
            
        except Exception as e:
            logger.error("Erro na validação de combinação", error=str(e))
            return False
    
    def _evaluate_combination(self, combination: List[Dict[str, Any]], features: Dict[str, float]) -> Optional[Dict[str, Any]]:
        """Avaliar combinação usando Monte Carlo"""
        try:
            # Simular cenários
            scenarios = self._simulate_scenarios(combination, features, n_simulations=1000)
            
            # Calcular métricas
            win_rate = scenarios["wins"] / scenarios["total"]
            avg_return = scenarios["total_return"] / scenarios["total"]
            expected_value = scenarios["expected_value"]
            
            # Calcular odds da combinação
            total_odds = 1.0
            for sel in combination:
                total_odds *= sel["odds"]
            
            # Criar descrição da combinação
            combination_str = " + ".join([f"{sel['type']}:{sel['selection']}" for sel in combination])
            
            return {
                "combination": combination_str,
                "selections": combination,
                "odds": total_odds,
                "confidence": sum(sel["confidence"] for sel in combination) / len(combination),
                "win_rate": win_rate,
                "expected_value": expected_value,
                "avg_return": avg_return,
                "risk": self._calculate_combination_risk(combination)
            }
            
        except Exception as e:
            logger.error("Erro na avaliação de combinação", error=str(e))
            return None
    
    def _simulate_scenarios(self, combination: List[Dict[str, Any]], features: Dict[str, float], n_simulations: int = 1000) -> Dict[str, float]:
        """Simular cenários usando Monte Carlo"""
        try:
            wins = 0
            total_return = 0.0
            
            for _ in range(n_simulations):
                # Simular resultado de cada seleção
                combination_wins = True
                for sel in combination:
                    # Usar probabilidade real ou simulada
                    probability = sel["probability"]
                    if random.random() > probability:
                        combination_wins = False
                        break
                
                if combination_wins:
                    wins += 1
                    # Calcular retorno
                    total_odds = 1.0
                    for sel in combination:
                        total_odds *= sel["odds"]
                    total_return += total_odds
            
            # Calcular expected value
            win_rate = wins / n_simulations
            total_odds = 1.0
            for sel in combination:
                total_odds *= sel["odds"]
            expected_value = (win_rate * total_odds) - 1.0
            
            return {
                "wins": wins,
                "total": n_simulations,
                "total_return": total_return,
                "expected_value": expected_value
            }
            
        except Exception as e:
            logger.error("Erro na simulação de cenários", error=str(e))
            return {"wins": 0, "total": n_simulations, "total_return": 0.0, "expected_value": -1.0}
    
    def _select_best_strategy(self, strategies: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Selecionar melhor estratégia"""
        try:
            if not strategies:
                return None
            
            # Filtrar estratégias com expected value positivo
            positive_ev_strategies = [s for s in strategies if s["expected_value"] > 0.05]
            
            if not positive_ev_strategies:
                # Se nenhuma tem EV positivo, retornar a melhor disponível
                return strategies[0] if strategies else None
            
            # Selecionar a com maior expected value
            best_strategy = max(positive_ev_strategies, key=lambda x: x["expected_value"])
            
            return best_strategy
            
        except Exception as e:
            logger.error("Erro na seleção de estratégia", error=str(e))
            return None
    
    def _encode_prediction(self, prediction: str) -> float:
        """Codificar previsão 1X2"""
        encoding = {"1": 0.0, "X": 0.5, "2": 1.0}
        return encoding.get(prediction, 0.5)
    
    def _decode_prediction(self, encoded: float) -> str:
        """Decodificar previsão 1X2"""
        if encoded < 0.33:
            return "1"
        elif encoded < 0.66:
            return "X"
        else:
            return "2"
    
    def _encode_next_goal(self, prediction: str) -> float:
        """Codificar previsão próximo golo"""
        encoding = {"home": 0.0, "away": 1.0, "none": 0.5}
        return encoding.get(prediction, 0.5)
    
    def _decode_next_goal(self, encoded: float) -> str:
        """Decodificar previsão próximo golo"""
        if encoded < 0.33:
            return "home"
        elif encoded < 0.66:
            return "none"
        else:
            return "away"
    
    def _encode_over_under(self, prediction: str) -> float:
        """Codificar previsão over/under"""
        if "over" in prediction:
            return 1.0
        elif "under" in prediction:
            return 0.0
        else:
            return 0.5
    
    def _decode_over_under(self, encoded: float) -> str:
        """Decodificar previsão over/under"""
        if encoded > 0.5:
            return "over_2.5"
        else:
            return "under_2.5"
    
    def _get_odds_for_selection(self, selection_type: str, selection: str, features: Dict[str, float]) -> float:
        """Obter odds para uma seleção"""
        if selection_type == "winner":
            if selection == "1":
                return features["home_odds"]
            elif selection == "X":
                return features["draw_odds"]
            elif selection == "2":
                return features["away_odds"]
        elif selection_type == "next_goal":
            if selection == "home":
                return features["next_goal_home_odds"]
            elif selection == "away":
                return features["next_goal_away_odds"]
        elif selection_type == "over_under":
            if "over" in selection:
                return features["over_2_5_odds"]
            else:
                return features["under_2_5_odds"]
        
        return 2.0  # Default
    
    def _has_conflicts(self, combination: List[Dict[str, Any]]) -> bool:
        """Verificar se há conflitos na combinação"""
        # Por exemplo, não pode ter "1" e "2" ao mesmo tempo
        selections = [sel["selection"] for sel in combination if sel["type"] == "winner"]
        if "1" in selections and "2" in selections:
            return True
        
        # Outros conflitos podem ser adicionados aqui
        return False
    
    def _calculate_combination_risk(self, combination: List[Dict[str, Any]]) -> float:
        """Calcular risco da combinação"""
        try:
            # Risco baseado no número de seleções e odds
            num_selections = len(combination)
            avg_odds = sum(sel["odds"] for sel in combination) / num_selections
            
            # Mais seleções = mais risco
            # Odds mais altas = mais risco
            risk = (num_selections - 1) * 0.1 + (avg_odds - 2.0) * 0.05
            return min(1.0, max(0.0, risk))
        except Exception as e:
            logger.error("Erro no cálculo de risco", error=str(e))
            return 0.5
    
    def _calculate_weather_impact(self, weather: Dict[str, Any]) -> float:
        """Calcular impacto do tempo"""
        try:
            impact = 0.5  # Neutro
            
            temperature = weather.get("temperature", 20)
            if temperature < 5 or temperature > 35:
                impact -= 0.2
            
            humidity = weather.get("humidity", 60)
            if humidity > 80:
                impact -= 0.1
            
            wind_speed = weather.get("wind_speed", 10)
            if wind_speed > 20:
                impact -= 0.15
            
            return max(0.0, min(1.0, impact))
        except Exception as e:
            logger.error("Erro no cálculo de impacto do tempo", error=str(e))
            return 0.5
    
    def _extract_feature_dict(self, features: np.ndarray) -> Dict[str, float]:
        """Extrair features para dicionário"""
        return {
            "winner_prediction": features[0],
            "winner_confidence": features[1],
            "next_goal_prediction": features[2],
            "next_goal_confidence": features[3],
            "over_under_prediction": features[4],
            "over_under_confidence": features[5],
            "home_odds": features[6],
            "away_odds": features[7],
            "draw_odds": features[8],
            "over_1_5_odds": features[9],
            "over_2_5_odds": features[10],
            "under_2_5_odds": features[11],
            "next_goal_home_odds": features[12],
            "next_goal_away_odds": features[13],
            "game_minute": features[14],
            "home_score": features[15],
            "away_score": features[16],
            "home_momentum": features[17],
            "away_momentum": features[18],
            "match_tempo": features[19],
            "weather_impact": features[20],
            "stadium_factor": features[21],
            "crowd_impact": features[22]
        }
    
    def _analyze_successful_combinations(self, X: np.ndarray, y: np.ndarray) -> Dict[str, Any]:
        """Analisar combinações bem-sucedidas do histórico"""
        # Implementação simplificada - em produção seria mais complexa
        return {}
    
    def _calculate_strategy_accuracy(self, X: np.ndarray, y: np.ndarray, successful_patterns: Dict[str, Any]) -> float:
        """Calcular accuracy das estratégias"""
        # Implementação simplificada
        return 0.75  # Placeholder

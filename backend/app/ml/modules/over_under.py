"""
Módulo 3 - Over/Under Dinâmico
Poisson regressão bayesiana + Random Forest
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import PoissonRegressor
from sklearn.ensemble import VotingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error
from typing import Dict, Any, List, Tuple, Optional
from scipy import stats

from app.ml.base import BaseMLModule
from app.core.logging import get_logger

logger = get_logger("ml_over_under")


class OverUnderModule(BaseMLModule):
    """Módulo para previsão over/under dinâmico"""
    
    def __init__(self):
        super().__init__("over_under")
        self.features = [
            "home_goals_scored_avg", "away_goals_scored_avg",
            "home_goals_conceded_avg", "away_goals_conceded_avg",
            "league_avg_goals_per_game", "home_form_goals_avg", "away_form_goals_avg",
            "home_shots_on_target_avg", "away_shots_on_target_avg",
            "home_possession_avg", "away_possession_avg",
            "home_corners_avg", "away_corners_avg",
            "home_fouls_avg", "away_fouls_avg",
            "weather_temperature", "weather_humidity", "weather_wind_speed",
            "stadium_capacity", "attendance_ratio",
            "home_attacking_strength", "away_attacking_strength",
            "home_defensive_strength", "away_defensive_strength",
            "league_type", "match_importance", "time_since_last_match_home",
            "time_since_last_match_away", "home_team_momentum", "away_team_momentum"
        ]
        self.scaler = StandardScaler()
        self.threshold_calculator = None
        
    def prepare_features(self, game_data: Dict[str, Any]) -> np.ndarray:
        """Preparar features para previsão over/under"""
        try:
            features = []
            
            # Estatísticas de golos
            home_stats = game_data.get("home_stats", {})
            away_stats = game_data.get("away_stats", {})
            
            features.append(home_stats.get("goals_scored_avg", 1.5))
            features.append(away_stats.get("goals_scored_avg", 1.5))
            features.append(home_stats.get("goals_conceded_avg", 1.2))
            features.append(away_stats.get("goals_conceded_avg", 1.2))
            
            # Estatísticas da liga
            league_stats = game_data.get("league_stats", {})
            features.append(league_stats.get("avg_goals_per_game", 2.5))
            
            # Forma das equipas (golos nos últimos jogos)
            home_form = game_data.get("home_form_goals", [])
            away_form = game_data.get("away_form_goals", [])
            features.append(self._calculate_goals_avg(home_form))
            features.append(self._calculate_goals_avg(away_form))
            
            # Estatísticas de jogo
            features.append(home_stats.get("shots_on_target_avg", 5.0))
            features.append(away_stats.get("shots_on_target_avg", 5.0))
            features.append(home_stats.get("possession_avg", 50.0))
            features.append(away_stats.get("possession_avg", 50.0))
            features.append(home_stats.get("corners_avg", 5.0))
            features.append(away_stats.get("corners_avg", 5.0))
            features.append(home_stats.get("fouls_avg", 12.0))
            features.append(away_stats.get("fouls_avg", 12.0))
            
            # Condições meteorológicas
            weather = game_data.get("weather", {})
            features.append(weather.get("temperature", 20.0))
            features.append(weather.get("humidity", 60.0))
            features.append(weather.get("wind_speed", 10.0))
            
            # Características do estádio
            stadium = game_data.get("stadium", {})
            features.append(stadium.get("capacity", 30000))
            features.append(stadium.get("attendance_ratio", 0.8))
            
            # Força das equipas
            features.append(self._calculate_attacking_strength(game_data, "home"))
            features.append(self._calculate_attacking_strength(game_data, "away"))
            features.append(self._calculate_defensive_strength(game_data, "home"))
            features.append(self._calculate_defensive_strength(game_data, "away"))
            
            # Características do jogo
            features.append(self._encode_league_type(game_data.get("league_type", "normal")))
            features.append(self._calculate_match_importance(game_data))
            
            # Tempo desde último jogo
            features.append(game_data.get("days_since_last_match_home", 7))
            features.append(game_data.get("days_since_last_match_away", 7))
            
            # Momentum das equipas
            features.append(self._calculate_team_momentum(game_data, "home"))
            features.append(self._calculate_team_momentum(game_data, "away"))
            
            features_array = np.array(features).reshape(1, -1)
            
            # Normalizar se o modelo foi treinado
            if self.is_trained:
                features_array = self.scaler.transform(features_array)
            
            return features_array
            
        except Exception as e:
            logger.error("Erro ao preparar features para over/under", error=str(e))
            return np.array([[]])
    
    def predict(self, features: np.ndarray) -> Tuple[np.ndarray, float]:
        """Fazer previsão over/under dinâmico"""
        try:
            if not self.is_trained or self.model is None:
                logger.warning("Modelo não treinado", module=self.module_name)
                return np.array([]), 0.0
            
            if not self.validate_features(features):
                logger.warning("Features inválidas", module=self.module_name)
                return np.array([]), 0.0
            
            # Prever número total de golos
            predicted_goals = self.model.predict(features)[0]
            
            # Calcular threshold dinâmico
            dynamic_threshold = self._calculate_dynamic_threshold(features[0])
            
            # Determinar over/under
            if predicted_goals > dynamic_threshold:
                result = f"over_{dynamic_threshold:.1f}"
                probability = self._calculate_over_probability(predicted_goals, dynamic_threshold)
            else:
                result = f"under_{dynamic_threshold:.1f}"
                probability = self._calculate_under_probability(predicted_goals, dynamic_threshold)
            
            confidence = abs(probability - 0.5) * 2  # Converter para 0-1
            
            logger.info(
                "Previsão over/under realizada",
                predicted_goals=predicted_goals,
                threshold=dynamic_threshold,
                result=result,
                confidence=confidence
            )
            
            return np.array([result]), confidence
            
        except Exception as e:
            logger.error("Erro na previsão over/under", error=str(e))
            return np.array([]), 0.0
    
    def train(self, X: np.ndarray, y: np.ndarray) -> Dict[str, float]:
        """Treinar modelo over/under"""
        try:
            if len(X) == 0 or len(y) == 0:
                logger.warning("Dados de treino vazios", module=self.module_name)
                return {"accuracy": 0.0}
            
            # Normalizar features
            X_scaled = self.scaler.fit_transform(X)
            
            # Criar ensemble: Poisson Regressor + Random Forest
            poisson_model = PoissonRegressor(alpha=1.0, max_iter=200)
            rf_model = RandomForestRegressor(
                n_estimators=100,
                max_depth=10,
                random_state=42
            )
            
            # Ensemble voting
            self.model = VotingRegressor([
                ('poisson', poisson_model),
                ('rf', rf_model)
            ])
            
            # Treinar modelo
            self.model.fit(X_scaled, y)
            self.is_trained = True
            
            # Calcular métricas
            y_pred = self.model.predict(X_scaled)
            mse = mean_squared_error(y, y_pred)
            mae = mean_absolute_error(y, y_pred)
            
            # Calcular accuracy baseada em threshold dinâmico
            accuracy = self._calculate_training_accuracy(y, y_pred, X_scaled)
            
            # Salvar modelo
            self.save_model()
            
            logger.info("Modelo over/under treinado", mse=mse, mae=mae, accuracy=accuracy, samples=len(X))
            
            return {
                "mse": float(mse),
                "mae": float(mae),
                "accuracy": float(accuracy),
                "samples": len(X),
                "features": len(self.features)
            }
            
        except Exception as e:
            logger.error("Erro no treino do modelo over/under", error=str(e))
            return {"accuracy": 0.0, "error": str(e)}
    
    def _calculate_dynamic_threshold(self, features: np.ndarray) -> float:
        """Calcular threshold dinâmico baseado nas features"""
        try:
            # Threshold base
            base_threshold = 2.5
            
            # Ajustar baseado na liga
            league_type = features[23]  # Posição da feature league_type
            if league_type > 0.7:  # Liga defensiva
                base_threshold -= 0.3
            elif league_type < 0.3:  # Liga ofensiva
                base_threshold += 0.3
            
            # Ajustar baseado no tempo desde último jogo
            days_home = features[24]
            days_away = features[25]
            
            if days_home > 14 or days_away > 14:  # Muito tempo de descanso
                base_threshold += 0.2
            elif days_home < 3 or days_away < 3:  # Pouco descanso
                base_threshold -= 0.2
            
            # Ajustar baseado nas condições meteorológicas
            temperature = features[11]
            if temperature < 5 or temperature > 35:  # Condições extremas
                base_threshold -= 0.1
            
            wind_speed = features[13]
            if wind_speed > 20:  # Vento forte
                base_threshold -= 0.1
            
            return max(1.5, min(4.5, base_threshold))  # Limitar entre 1.5 e 4.5
            
        except Exception as e:
            logger.error("Erro ao calcular threshold dinâmico", error=str(e))
            return 2.5
    
    def _calculate_over_probability(self, predicted_goals: float, threshold: float) -> float:
        """Calcular probabilidade de over"""
        try:
            # Usar distribuição Poisson
            prob_over = 1 - stats.poisson.cdf(threshold, predicted_goals)
            return min(0.95, max(0.05, prob_over))
        except Exception as e:
            logger.error("Erro ao calcular probabilidade over", error=str(e))
            return 0.5
    
    def _calculate_under_probability(self, predicted_goals: float, threshold: float) -> float:
        """Calcular probabilidade de under"""
        try:
            # Usar distribuição Poisson
            prob_under = stats.poisson.cdf(threshold, predicted_goals)
            return min(0.95, max(0.05, prob_under))
        except Exception as e:
            logger.error("Erro ao calcular probabilidade under", error=str(e))
            return 0.5
    
    def _calculate_goals_avg(self, goals_list: List[int]) -> float:
        """Calcular média de golos"""
        try:
            if not goals_list or len(goals_list) == 0:
                return 1.5
            return sum(goals_list[-5:]) / len(goals_list[-5:])  # Últimos 5 jogos
        except Exception as e:
            logger.error("Erro ao calcular média de golos", error=str(e))
            return 1.5
    
    def _calculate_attacking_strength(self, game_data: Dict[str, Any], team: str) -> float:
        """Calcular força ofensiva da equipa"""
        try:
            stats = game_data.get(f"{team}_stats", {})
            goals_scored = stats.get("goals_scored_avg", 1.5)
            shots_on_target = stats.get("shots_on_target_avg", 5.0)
            possession = stats.get("possession_avg", 50.0)
            
            # Combinação de métricas ofensivas
            strength = (goals_scored * 0.5) + (shots_on_target * 0.3) + (possession * 0.02)
            return strength / 10.0  # Normalizar
        except Exception as e:
            logger.error("Erro ao calcular força ofensiva", team=team, error=str(e))
            return 0.5
    
    def _calculate_defensive_strength(self, game_data: Dict[str, Any], team: str) -> float:
        """Calcular força defensiva da equipa"""
        try:
            stats = game_data.get(f"{team}_stats", {})
            goals_conceded = stats.get("goals_conceded_avg", 1.2)
            fouls = stats.get("fouls_avg", 12.0)
            
            # Força defensiva (menor é melhor)
            strength = (2.5 - goals_conceded) * 0.7 + (15 - fouls) * 0.3
            return max(0.0, min(1.0, strength / 10.0))  # Normalizar entre 0-1
        except Exception as e:
            logger.error("Erro ao calcular força defensiva", team=team, error=str(e))
            return 0.5
    
    def _encode_league_type(self, league_type: str) -> float:
        """Codificar tipo de liga"""
        encoding = {
            "defensive": 0.2,
            "normal": 0.5,
            "offensive": 0.8,
            "very_offensive": 1.0
        }
        return encoding.get(league_type, 0.5)
    
    def _calculate_match_importance(self, game_data: Dict[str, Any]) -> float:
        """Calcular importância do jogo"""
        try:
            importance = 0.5  # Base
            
            # Ajustar baseado na posição na tabela
            home_position = game_data.get("home_position", 10)
            away_position = game_data.get("away_position", 10)
            
            # Jogos entre equipas próximas na tabela são mais importantes
            position_diff = abs(home_position - away_position)
            if position_diff <= 2:
                importance += 0.2
            elif position_diff <= 5:
                importance += 0.1
            
            # Jogos de equipas no topo/fundo são importantes
            if home_position <= 3 or away_position <= 3:
                importance += 0.1
            if home_position >= 18 or away_position >= 18:
                importance += 0.1
            
            return min(1.0, importance)
        except Exception as e:
            logger.error("Erro ao calcular importância do jogo", error=str(e))
            return 0.5
    
    def _calculate_team_momentum(self, game_data: Dict[str, Any], team: str) -> float:
        """Calcular momentum da equipa"""
        try:
            form = game_data.get(f"{team}_form", [])
            if not form or len(form) == 0:
                return 0.5
            
            # Calcular momentum baseado nos últimos 5 jogos
            momentum = 0.0
            weights = [0.4, 0.3, 0.2, 0.1, 0.0]  # Peso decrescente
            
            for i, result in enumerate(form[-5:]):
                if result == "W":
                    momentum += weights[i]
                elif result == "D":
                    momentum += weights[i] * 0.5
            
            return momentum
        except Exception as e:
            logger.error("Erro ao calcular momentum da equipa", team=team, error=str(e))
            return 0.5
    
    def _calculate_training_accuracy(self, y_true: np.ndarray, y_pred: np.ndarray, X: np.ndarray) -> float:
        """Calcular accuracy do treino baseada em threshold dinâmico"""
        try:
            correct = 0
            total = len(y_true)
            
            for i in range(total):
                threshold = self._calculate_dynamic_threshold(X[i])
                
                if y_true[i] > threshold and y_pred[i] > threshold:
                    correct += 1
                elif y_true[i] <= threshold and y_pred[i] <= threshold:
                    correct += 1
            
            return correct / total if total > 0 else 0.0
        except Exception as e:
            logger.error("Erro ao calcular accuracy do treino", error=str(e))
            return 0.0

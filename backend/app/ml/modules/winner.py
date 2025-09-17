"""
Módulo 1 - Vencedor (1X2)
Gradient Boosted Trees + ensemble NN leve
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.ensemble import VotingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, classification_report
from typing import Dict, Any, List, Tuple, Optional

from app.ml.base import BaseMLModule
from app.core.logging import get_logger

logger = get_logger("ml_winner")


class WinnerModule(BaseMLModule):
    """Módulo para previsão de vencedor (1X2)"""
    
    def __init__(self):
        super().__init__("winner")
        self.features = [
            "home_odds", "draw_odds", "away_odds",
            "home_form_last_5", "away_form_last_5",
            "home_goals_scored_avg", "away_goals_scored_avg",
            "home_goals_conceded_avg", "away_goals_conceded_avg",
            "home_elo_rating", "away_elo_rating",
            "home_possession_avg", "away_possession_avg",
            "home_shots_on_target_avg", "away_shots_on_target_avg",
            "head_to_head_home_wins", "head_to_head_away_wins",
            "league_avg_goals", "home_team_strength", "away_team_strength"
        ]
        self.scaler = StandardScaler()
        self.label_encoder = {"1": 0, "X": 1, "2": 2}
        self.reverse_encoder = {0: "1", 1: "X", 2: "2"}
        
    def prepare_features(self, game_data: Dict[str, Any]) -> np.ndarray:
        """Preparar features para previsão de vencedor"""
        try:
            features = []
            
            # Odds
            odds = game_data.get("odds", {})
            features.append(odds.get("home", 2.0))
            features.append(odds.get("draw", 3.0))
            features.append(odds.get("away", 2.0))
            
            # Forma das equipas (últimos 5 jogos)
            home_form = game_data.get("home_form", [])
            away_form = game_data.get("away_form", [])
            features.append(self._calculate_form_score(home_form))
            features.append(self._calculate_form_score(away_form))
            
            # Médias de golos
            home_stats = game_data.get("home_stats", {})
            away_stats = game_data.get("away_stats", {})
            features.append(home_stats.get("goals_scored_avg", 1.5))
            features.append(away_stats.get("goals_scored_avg", 1.5))
            features.append(home_stats.get("goals_conceded_avg", 1.2))
            features.append(away_stats.get("goals_conceded_avg", 1.2))
            
            # ELO ratings
            features.append(game_data.get("home_elo", 1500))
            features.append(game_data.get("away_elo", 1500))
            
            # Possessão de bola
            features.append(home_stats.get("possession_avg", 50.0))
            features.append(away_stats.get("possession_avg", 50.0))
            
            # Remates à baliza
            features.append(home_stats.get("shots_on_target_avg", 5.0))
            features.append(away_stats.get("shots_on_target_avg", 5.0))
            
            # Histórico confrontos diretos
            h2h = game_data.get("head_to_head", {})
            features.append(h2h.get("home_wins", 0))
            features.append(h2h.get("away_wins", 0))
            
            # Características da liga
            league_stats = game_data.get("league_stats", {})
            features.append(league_stats.get("avg_goals_per_game", 2.5))
            
            # Força das equipas (baseada em ELO e forma)
            features.append(self._calculate_team_strength(game_data, "home"))
            features.append(self._calculate_team_strength(game_data, "away"))
            
            features_array = np.array(features).reshape(1, -1)
            
            # Normalizar se o modelo foi treinado
            if self.is_trained:
                features_array = self.scaler.transform(features_array)
            
            return features_array
            
        except Exception as e:
            logger.error("Erro ao preparar features para vencedor", error=str(e))
            return np.array([[]])
    
    def predict(self, features: np.ndarray) -> Tuple[np.ndarray, float]:
        """Fazer previsão de vencedor"""
        try:
            if not self.is_trained or self.model is None:
                logger.warning("Modelo não treinado", module=self.module_name)
                return np.array([]), 0.0
            
            if not self.validate_features(features):
                logger.warning("Features inválidas", module=self.module_name)
                return np.array([]), 0.0
            
            # Fazer previsão
            prediction_proba = self.model.predict_proba(features)[0]
            prediction_class = np.argmax(prediction_proba)
            
            # Converter para formato 1X2
            result = self.reverse_encoder[prediction_class]
            confidence = self.calculate_confidence(prediction_proba)
            
            logger.info(
                "Previsão de vencedor realizada",
                prediction=result,
                confidence=confidence,
                probabilities=prediction_proba.tolist()
            )
            
            return np.array([result]), confidence
            
        except Exception as e:
            logger.error("Erro na previsão de vencedor", error=str(e))
            return np.array([]), 0.0
    
    def train(self, X: np.ndarray, y: np.ndarray) -> Dict[str, float]:
        """Treinar modelo de vencedor"""
        try:
            if len(X) == 0 or len(y) == 0:
                logger.warning("Dados de treino vazios", module=self.module_name)
                return {"accuracy": 0.0}
            
            # Converter labels para numérico
            y_encoded = np.array([self.label_encoder.get(str(label), 1) for label in y])
            
            # Normalizar features
            X_scaled = self.scaler.fit_transform(X)
            
            # Criar ensemble: Gradient Boosting + Neural Network
            gb_model = GradientBoostingClassifier(
                n_estimators=100,
                learning_rate=0.1,
                max_depth=6,
                random_state=42
            )
            
            nn_model = MLPClassifier(
                hidden_layer_sizes=(50, 25),
                activation='relu',
                solver='adam',
                alpha=0.001,
                max_iter=500,
                random_state=42
            )
            
            # Ensemble voting
            self.model = VotingClassifier(
                estimators=[
                    ('gb', gb_model),
                    ('nn', nn_model)
                ],
                voting='soft'
            )
            
            # Treinar modelo
            self.model.fit(X_scaled, y_encoded)
            self.is_trained = True
            
            # Calcular métricas
            y_pred = self.model.predict(X_scaled)
            accuracy = accuracy_score(y_encoded, y_pred)
            
            # Salvar modelo
            self.save_model()
            
            logger.info("Modelo de vencedor treinado", accuracy=accuracy, samples=len(X))
            
            return {
                "accuracy": float(accuracy),
                "samples": len(X),
                "features": len(self.features)
            }
            
        except Exception as e:
            logger.error("Erro no treino do modelo de vencedor", error=str(e))
            return {"accuracy": 0.0, "error": str(e)}
    
    def _calculate_form_score(self, form: List[str]) -> float:
        """Calcular pontuação de forma"""
        try:
            if not form or len(form) == 0:
                return 0.5  # Neutro
            
            score_map = {"W": 1.0, "D": 0.5, "L": 0.0}
            scores = [score_map.get(result, 0.5) for result in form[-5:]]  # Últimos 5 jogos
            
            return sum(scores) / len(scores)
            
        except Exception as e:
            logger.error("Erro ao calcular forma", error=str(e))
            return 0.5
    
    def _calculate_team_strength(self, game_data: Dict[str, Any], team: str) -> float:
        """Calcular força da equipa"""
        try:
            elo = game_data.get(f"{team}_elo", 1500)
            form = game_data.get(f"{team}_form", [])
            form_score = self._calculate_form_score(form)
            
            # Normalizar ELO (1500 = médio)
            elo_normalized = (elo - 1500) / 500
            
            # Combinação de ELO e forma
            strength = (elo_normalized * 0.7) + (form_score * 0.3)
            
            return strength
            
        except Exception as e:
            logger.error("Erro ao calcular força da equipa", team=team, error=str(e))
            return 0.0
    
    def get_prediction_probabilities(self, features: np.ndarray) -> Dict[str, float]:
        """Obter probabilidades de cada resultado"""
        try:
            if not self.is_trained or self.model is None:
                return {"1": 0.33, "X": 0.33, "2": 0.34}
            
            prediction_proba = self.model.predict_proba(features)[0]
            
            return {
                "1": float(prediction_proba[0]),  # Home win
                "X": float(prediction_proba[1]),  # Draw
                "2": float(prediction_proba[2])   # Away win
            }
            
        except Exception as e:
            logger.error("Erro ao obter probabilidades", error=str(e))
            return {"1": 0.33, "X": 0.33, "2": 0.34}

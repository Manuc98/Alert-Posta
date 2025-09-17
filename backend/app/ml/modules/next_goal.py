"""
Módulo 2 - Próximo Golo (1X2)
Seq2Seq (LSTM/Transformer) para eventos in-game
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple, Optional
import torch
import torch.nn as nn
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score

from app.ml.base import BaseMLModule
from app.core.logging import get_logger

logger = get_logger("ml_next_goal")


class NextGoalLSTM(nn.Module):
    """Rede LSTM para previsão de próximo golo"""
    
    def __init__(self, input_size: int, hidden_size: int = 64, num_layers: int = 2):
        super().__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.dropout = nn.Dropout(0.2)
        self.fc = nn.Linear(hidden_size, 3)  # Home, Away, No Goal
        self.softmax = nn.Softmax(dim=1)
    
    def forward(self, x):
        lstm_out, _ = self.lstm(x)
        lstm_out = self.dropout(lstm_out[:, -1, :])  # Pegar última saída
        output = self.fc(lstm_out)
        return self.softmax(output)


class NextGoalModule(BaseMLModule):
    """Módulo para previsão de próximo golo"""
    
    def __init__(self):
        super().__init__("next_goal")
        self.features = [
            "minute", "home_score", "away_score",
            "home_attacks", "away_attacks",
            "home_dangerous_attacks", "away_dangerous_attacks",
            "home_shots_total", "away_shots_total",
            "home_shots_on_target", "away_shots_on_target",
            "home_corners", "away_corners",
            "home_fouls", "away_fouls",
            "home_yellow_cards", "away_yellow_cards",
            "home_red_cards", "away_red_cards",
            "home_possession", "away_possession",
            "home_odds", "away_odds", "draw_odds",
            "time_since_last_goal", "goals_in_match",
            "home_momentum", "away_momentum"
        ]
        self.scaler = StandardScaler()
        self.label_encoder = {"home": 0, "away": 1, "none": 2}
        self.reverse_encoder = {0: "home", 1: "away", 2: "none"}
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.sequence_length = 10  # Últimos 10 eventos/minutos
        
    def prepare_features(self, game_data: Dict[str, Any]) -> np.ndarray:
        """Preparar features para previsão de próximo golo"""
        try:
            # Obter dados do jogo atual
            current_minute = game_data.get("minute", 0)
            home_score = game_data.get("home_score", 0)
            away_score = game_data.get("away_score", 0)
            
            # Obter eventos recentes (últimos 10 minutos)
            events = game_data.get("recent_events", [])
            
            # Se não há eventos suficientes, criar sequência com dados atuais
            if len(events) < self.sequence_length:
                events = self._create_default_sequence(game_data, current_minute)
            
            # Pegar últimos eventos
            recent_events = events[-self.sequence_length:]
            
            # Preparar sequência de features
            sequence_features = []
            
            for event in recent_events:
                features = []
                
                # Dados básicos do evento
                features.append(event.get("minute", current_minute) / 90.0)  # Normalizar por 90 minutos
                features.append(event.get("home_score", home_score))
                features.append(event.get("away_score", away_score))
                
                # Ataques
                features.append(event.get("home_attacks", 0))
                features.append(event.get("away_attacks", 0))
                features.append(event.get("home_dangerous_attacks", 0))
                features.append(event.get("away_dangerous_attacks", 0))
                
                # Remates
                features.append(event.get("home_shots_total", 0))
                features.append(event.get("away_shots_total", 0))
                features.append(event.get("home_shots_on_target", 0))
                features.append(event.get("away_shots_on_target", 0))
                
                # Outros eventos
                features.append(event.get("home_corners", 0))
                features.append(event.get("away_corners", 0))
                features.append(event.get("home_fouls", 0))
                features.append(event.get("away_fouls", 0))
                features.append(event.get("home_yellow_cards", 0))
                features.append(event.get("away_yellow_cards", 0))
                features.append(event.get("home_red_cards", 0))
                features.append(event.get("away_red_cards", 0))
                
                # Possessão
                features.append(event.get("home_possession", 50.0) / 100.0)  # Normalizar
                features.append(event.get("away_possession", 50.0) / 100.0)
                
                # Odds
                odds = event.get("odds", {})
                features.append(odds.get("home", 2.0))
                features.append(odds.get("away", 2.0))
                features.append(odds.get("draw", 3.0))
                
                # Tempo desde último golo
                features.append(event.get("time_since_last_goal", 0) / 90.0)  # Normalizar
                
                # Total de golos no jogo
                features.append((event.get("home_score", 0) + event.get("away_score", 0)) / 10.0)  # Normalizar
                
                # Momentum (baseado em eventos recentes)
                features.append(self._calculate_momentum(event, "home"))
                features.append(self._calculate_momentum(event, "away"))
                
                sequence_features.append(features)
            
            features_array = np.array(sequence_features)
            
            # Normalizar se o modelo foi treinado
            if self.is_trained and hasattr(self.scaler, 'scale_'):
                features_array = self.scaler.transform(features_array.reshape(-1, features_array.shape[-1]))
                features_array = features_array.reshape(sequence_features.shape)
            
            return features_array.reshape(1, *features_array.shape)
            
        except Exception as e:
            logger.error("Erro ao preparar features para próximo golo", error=str(e))
            return np.array([[]])
    
    def predict(self, features: np.ndarray) -> Tuple[np.ndarray, float]:
        """Fazer previsão de próximo golo"""
        try:
            if not self.is_trained or self.model is None:
                logger.warning("Modelo não treinado", module=self.module_name)
                return np.array([]), 0.0
            
            if not self.validate_features(features):
                logger.warning("Features inválidas", module=self.module_name)
                return np.array([]), 0.0
            
            # Converter para tensor
            features_tensor = torch.FloatTensor(features).to(self.device)
            
            # Fazer previsão
            self.model.eval()
            with torch.no_grad():
                prediction_proba = self.model(features_tensor).cpu().numpy()[0]
            
            prediction_class = np.argmax(prediction_proba)
            result = self.reverse_encoder[prediction_class]
            confidence = self.calculate_confidence(prediction_proba)
            
            logger.info(
                "Previsão de próximo golo realizada",
                prediction=result,
                confidence=confidence,
                probabilities=prediction_proba.tolist()
            )
            
            return np.array([result]), confidence
            
        except Exception as e:
            logger.error("Erro na previsão de próximo golo", error=str(e))
            return np.array([]), 0.0
    
    def train(self, X: np.ndarray, y: np.ndarray) -> Dict[str, float]:
        """Treinar modelo de próximo golo"""
        try:
            if len(X) == 0 or len(y) == 0:
                logger.warning("Dados de treino vazios", module=self.module_name)
                return {"accuracy": 0.0}
            
            # Converter labels para numérico
            y_encoded = np.array([self.label_encoder.get(str(label), 2) for label in y])
            
            # Normalizar features
            X_reshaped = X.reshape(-1, X.shape[-1])
            X_scaled = self.scaler.fit_transform(X_reshaped)
            X_scaled = X_scaled.reshape(X.shape)
            
            # Criar modelo LSTM
            input_size = X.shape[-1]
            self.model = NextGoalLSTM(input_size).to(self.device)
            
            # Preparar dados para PyTorch
            X_tensor = torch.FloatTensor(X_scaled).to(self.device)
            y_tensor = torch.LongTensor(y_encoded).to(self.device)
            
            # Definir otimizador e loss
            optimizer = torch.optim.Adam(self.model.parameters(), lr=0.001)
            criterion = nn.CrossEntropyLoss()
            
            # Treinar modelo
            self.model.train()
            epochs = 50
            
            for epoch in range(epochs):
                optimizer.zero_grad()
                outputs = self.model(X_tensor)
                loss = criterion(outputs, y_tensor)
                loss.backward()
                optimizer.step()
                
                if epoch % 10 == 0:
                    logger.info("Época de treino", epoch=epoch, loss=loss.item())
            
            self.is_trained = True
            
            # Calcular métricas
            self.model.eval()
            with torch.no_grad():
                y_pred = self.model(X_tensor).cpu().numpy()
                y_pred_classes = np.argmax(y_pred, axis=1)
                accuracy = accuracy_score(y_encoded, y_pred_classes)
            
            # Salvar modelo
            self.save_model()
            
            logger.info("Modelo de próximo golo treinado", accuracy=accuracy, samples=len(X))
            
            return {
                "accuracy": float(accuracy),
                "samples": len(X),
                "features": len(self.features)
            }
            
        except Exception as e:
            logger.error("Erro no treino do modelo de próximo golo", error=str(e))
            return {"accuracy": 0.0, "error": str(e)}
    
    def _create_default_sequence(self, game_data: Dict[str, Any], current_minute: int) -> List[Dict[str, Any]]:
        """Criar sequência padrão quando não há eventos suficientes"""
        try:
            sequence = []
            
            # Criar eventos fictícios baseados nos dados atuais
            for i in range(self.sequence_length):
                minute = max(1, current_minute - (self.sequence_length - i))
                
                event = {
                    "minute": minute,
                    "home_score": game_data.get("home_score", 0),
                    "away_score": game_data.get("away_score", 0),
                    "home_attacks": 5 + np.random.randint(0, 10),
                    "away_attacks": 5 + np.random.randint(0, 10),
                    "home_dangerous_attacks": 2 + np.random.randint(0, 5),
                    "away_dangerous_attacks": 2 + np.random.randint(0, 5),
                    "home_shots_total": 3 + np.random.randint(0, 8),
                    "away_shots_total": 3 + np.random.randint(0, 8),
                    "home_shots_on_target": 1 + np.random.randint(0, 4),
                    "away_shots_on_target": 1 + np.random.randint(0, 4),
                    "home_corners": np.random.randint(0, 8),
                    "away_corners": np.random.randint(0, 8),
                    "home_fouls": np.random.randint(5, 15),
                    "away_fouls": np.random.randint(5, 15),
                    "home_yellow_cards": np.random.randint(0, 3),
                    "away_yellow_cards": np.random.randint(0, 3),
                    "home_red_cards": np.random.randint(0, 2),
                    "away_red_cards": np.random.randint(0, 2),
                    "home_possession": 45 + np.random.randint(0, 20),
                    "away_possession": 55 - np.random.randint(0, 20),
                    "odds": game_data.get("odds", {"home": 2.0, "away": 2.0, "draw": 3.0}),
                    "time_since_last_goal": np.random.randint(0, 45),
                    "home_momentum": 0.5,
                    "away_momentum": 0.5
                }
                
                sequence.append(event)
            
            return sequence
            
        except Exception as e:
            logger.error("Erro ao criar sequência padrão", error=str(e))
            return []
    
    def _calculate_momentum(self, event: Dict[str, Any], team: str) -> float:
        """Calcular momentum da equipa"""
        try:
            attacks = event.get(f"{team}_attacks", 0)
            dangerous_attacks = event.get(f"{team}_dangerous_attacks", 0)
            shots = event.get(f"{team}_shots_total", 0)
            shots_on_target = event.get(f"{team}_shots_on_target", 0)
            
            # Momentum baseado em ataques efetivos
            momentum = (dangerous_attacks * 0.4 + shots_on_target * 0.3 + attacks * 0.2 + shots * 0.1)
            
            # Normalizar
            return min(1.0, momentum / 20.0)
            
        except Exception as e:
            logger.error("Erro ao calcular momentum", team=team, error=str(e))
            return 0.5

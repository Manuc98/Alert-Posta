"""
Gestor principal dos módulos ML
"""

import asyncio
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import uuid

from app.core.logging import get_logger
from app.core.mlflow_client import mlflow_manager
from app.ml.modules.winner import WinnerModule
from app.ml.modules.next_goal import NextGoalModule
from app.ml.modules.over_under import OverUnderModule
from app.ml.modules.multiple import MultipleModule
from app.ml.modules.value_bet import ValueBetModule

logger = get_logger("ml_manager")


class MLManager:
    """Gestor principal dos módulos de ML"""
    
    def __init__(self):
        self.modules = {
            "winner": WinnerModule(),
            "next_goal": NextGoalModule(),
            "over_under": OverUnderModule(),
            "multiple": MultipleModule(),
            "value_bet": ValueBetModule()
        }
        self.is_initialized = False
    
    async def initialize(self):
        """Inicializar todos os módulos"""
        try:
            logger.info("Inicializando módulos ML")
            
            # Carregar modelos treinados
            for module_name, module in self.modules.items():
                try:
                    module.load_model()
                    logger.info("Módulo inicializado", module=module_name, trained=module.is_trained)
                except Exception as e:
                    logger.error("Erro ao inicializar módulo", module=module_name, error=str(e))
            
            self.is_initialized = True
            logger.info("Módulos ML inicializados com sucesso")
            
        except Exception as e:
            logger.error("Erro na inicialização dos módulos ML", error=str(e))
            raise
    
    async def predict_game(self, game_data: Dict[str, Any]) -> Dict[str, Any]:
        """Fazer previsão completa para um jogo"""
        try:
            if not self.is_initialized:
                await self.initialize()
            
            predictions = {}
            
            # 1. Previsão de vencedor
            winner_prediction = await self._predict_with_module("winner", game_data)
            if winner_prediction:
                predictions["winner"] = winner_prediction
            
            # 2. Próximo golo (apenas se jogo ao vivo)
            if game_data.get("status") == "live":
                next_goal_prediction = await self._predict_with_module("next_goal", game_data)
                if next_goal_prediction:
                    predictions["next_goal"] = next_goal_prediction
            
            # 3. Over/Under
            over_under_prediction = await self._predict_with_module("over_under", game_data)
            if over_under_prediction:
                predictions["over_under"] = over_under_prediction
            
            # 4. Múltiplas (combinar previsões)
            if len(predictions) >= 2:
                multiple_data = {**game_data, "predictions": predictions}
                multiple_prediction = await self._predict_with_module("multiple", multiple_data)
                if multiple_prediction:
                    predictions["multiple"] = multiple_prediction
            
            # 5. Value Betting (filtro final)
            if predictions:
                value_bet_data = self._prepare_value_bet_data(game_data, predictions)
                value_bet_prediction = await self._predict_with_module("value_bet", value_bet_data)
                if value_bet_prediction:
                    predictions["value_bet"] = value_bet_prediction
            
            # Gerar sinal se houver value bet
            signal = None
            if predictions.get("value_bet") and predictions["value_bet"]["prediction"]:
                signal = await self._generate_signal(game_data, predictions)
            
            return {
                "game_id": game_data.get("id"),
                "predictions": predictions,
                "signal": signal,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error("Erro na previsão do jogo", game_id=game_data.get("id"), error=str(e))
            return {
                "game_id": game_data.get("id"),
                "predictions": {},
                "signal": None,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def _predict_with_module(self, module_name: str, game_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Fazer previsão com um módulo específico"""
        try:
            module = self.modules.get(module_name)
            if not module:
                logger.warning("Módulo não encontrado", module=module_name)
                return None
            
            if not module.is_trained:
                logger.warning("Módulo não treinado", module=module_name)
                return None
            
            # Preparar features
            features = module.prepare_features(game_data)
            if features.size == 0:
                logger.warning("Features vazias", module=module_name)
                return None
            
            # Fazer previsão
            prediction, confidence = module.predict(features)
            
            if len(prediction) == 0:
                logger.warning("Previsão vazia", module=module_name)
                return None
            
            # Gerar explicação
            explanation = module.generate_explanation(features, prediction[0], confidence)
            
            return {
                "module": module_name,
                "prediction": prediction[0],
                "confidence": confidence,
                "explanation": explanation,
                "features_used": len(module.features)
            }
            
        except Exception as e:
            logger.error("Erro na previsão do módulo", module=module_name, error=str(e))
            return None
    
    def _prepare_value_bet_data(self, game_data: Dict[str, Any], predictions: Dict[str, Any]) -> Dict[str, Any]:
        """Preparar dados para value betting"""
        try:
            # Combinar dados do jogo com previsões
            value_bet_data = {
                **game_data,
                "predictions": predictions,
                "prediction_data": {
                    "predicted_probability": self._extract_best_probability(predictions),
                    "market_odds": self._extract_market_odds(game_data),
                    "model_confidence": self._extract_avg_confidence(predictions)
                },
                "historical_data": {
                    "accuracy": 0.65,  # Seria calculado a partir do histórico real
                    "sample_size": 100  # Seria calculado a partir do histórico real
                },
                "market_data": {
                    "volume": 1000,  # Seria obtido de APIs de mercado
                    "odds_movement": 0.0,  # Seria calculado
                    "bookmaker_margin": 0.05  # Seria obtido das odds
                },
                "competition_data": {
                    "level": "professional",  # Seria determinado pela liga
                    "market_efficiency": 0.8  # Seria calculado
                }
            }
            
            return value_bet_data
            
        except Exception as e:
            logger.error("Erro ao preparar dados para value betting", error=str(e))
            return game_data
    
    async def _generate_signal(self, game_data: Dict[str, Any], predictions: Dict[str, Any]) -> Dict[str, Any]:
        """Gerar sinal final"""
        try:
            signal_id = f"sig_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:4]}"
            
            # Determinar melhor previsão
            best_prediction = self._select_best_prediction(predictions)
            
            if not best_prediction:
                return None
            
            # Calcular expected value
            expected_value = self._calculate_expected_value(best_prediction, game_data)
            
            # Gerar mensagem para Telegram
            telegram_message = self._generate_telegram_message(game_data, best_prediction)
            
            signal = {
                "signal_id": signal_id,
                "game_id": game_data.get("id"),
                "module": best_prediction["module"],
                "prediction": best_prediction["prediction"],
                "probability": self._extract_probability(best_prediction),
                "confidence": best_prediction["confidence"],
                "expected_value": expected_value,
                "payload_json": {
                    "message": telegram_message,
                    "odds": self._extract_odds(game_data, best_prediction),
                    "game_info": {
                        "home_team": game_data.get("home_team"),
                        "away_team": game_data.get("away_team"),
                        "league": game_data.get("league_name"),
                        "minute": game_data.get("minute", 0)
                    }
                },
                "explain_shap": best_prediction["explanation"],
                "created_at": datetime.utcnow().isoformat()
            }
            
            logger.info("Sinal gerado", signal_id=signal_id, module=best_prediction["module"])
            
            return signal
            
        except Exception as e:
            logger.error("Erro ao gerar sinal", error=str(e))
            return None
    
    def _select_best_prediction(self, predictions: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Selecionar melhor previsão"""
        try:
            # Priorizar value bet se disponível
            if "value_bet" in predictions and predictions["value_bet"]["prediction"]:
                return predictions["value_bet"]
            
            # Selecionar previsão com maior confiança
            best_prediction = None
            best_confidence = 0.0
            
            for module, prediction in predictions.items():
                if prediction.get("confidence", 0) > best_confidence:
                    best_confidence = prediction["confidence"]
                    best_prediction = prediction
            
            return best_prediction
            
        except Exception as e:
            logger.error("Erro ao selecionar melhor previsão", error=str(e))
            return None
    
    def _calculate_expected_value(self, prediction: Dict[str, Any], game_data: Dict[str, Any]) -> float:
        """Calcular expected value"""
        try:
            probability = self._extract_probability(prediction)
            odds = self._extract_odds(game_data, prediction)
            
            # EV = (Probability * Net Odds) - (1 - Probability)
            net_odds = odds - 1
            expected_value = (probability * net_odds) - (1 - probability)
            
            return round(expected_value, 3)
            
        except Exception as e:
            logger.error("Erro ao calcular expected value", error=str(e))
            return 0.0
    
    def _generate_telegram_message(self, game_data: Dict[str, Any], prediction: Dict[str, Any]) -> str:
        """Gerar mensagem para Telegram"""
        try:
            home_team = game_data.get("home_team", "Home")
            away_team = game_data.get("away_team", "Away")
            league = game_data.get("league_name", "")
            minute = game_data.get("minute", 0)
            
            # Emoji baseado no módulo
            emoji_map = {
                "winner": "🏆",
                "next_goal": "⚽",
                "over_under": "📊",
                "multiple": "🎯",
                "value_bet": "💰"
            }
            
            emoji = emoji_map.get(prediction["module"], "🎯")
            
            # Mensagem base
            message = f"{emoji} **Alert@Postas**\n"
            message += f"⚽ {home_team} vs {away_team}\n"
            
            if league:
                message += f"🏆 {league}\n"
            
            if minute > 0:
                message += f"⏰ {minute}' min\n"
            
            message += f"🎯 {prediction['prediction']}\n"
            message += f"📊 Confiança: {int(prediction['confidence'] * 100)}%\n"
            message += f"🤖 Módulo: {prediction['module']}"
            
            # Adicionar expected value se disponível
            if "expected_value" in prediction:
                ev = prediction["expected_value"]
                if ev > 0:
                    message += f"\n💰 EV: +{ev:.1%}"
            
            return message
            
        except Exception as e:
            logger.error("Erro ao gerar mensagem Telegram", error=str(e))
            return "🎯 Sinal Alert@Postas"
    
    def _extract_best_probability(self, predictions: Dict[str, Any]) -> float:
        """Extrair melhor probabilidade"""
        best_confidence = 0.0
        for prediction in predictions.values():
            if prediction.get("confidence", 0) > best_confidence:
                best_confidence = prediction["confidence"]
        return best_confidence
    
    def _extract_market_odds(self, game_data: Dict[str, Any]) -> float:
        """Extrair odds do mercado"""
        odds = game_data.get("odds", {})
        return odds.get("home", 2.0)  # Simplificado
    
    def _extract_avg_confidence(self, predictions: Dict[str, Any]) -> float:
        """Extrair confiança média"""
        confidences = [p.get("confidence", 0) for p in predictions.values()]
        return sum(confidences) / len(confidences) if confidences else 0.0
    
    def _extract_probability(self, prediction: Dict[str, Any]) -> float:
        """Extrair probabilidade da previsão"""
        return prediction.get("confidence", 0.5)
    
    def _extract_odds(self, game_data: Dict[str, Any], prediction: Dict[str, Any]) -> float:
        """Extrair odds relevantes"""
        odds = game_data.get("odds", {})
        pred = prediction.get("prediction", "")
        
        # Simplificado - em produção seria mais complexo
        if "1" in pred:
            return odds.get("home", 2.0)
        elif "2" in pred:
            return odds.get("away", 2.0)
        elif "X" in pred:
            return odds.get("draw", 3.0)
        else:
            return 2.0
    
    async def retrain_module(self, module_name: str, training_data: Dict[str, Any]) -> Dict[str, Any]:
        """Retreinar módulo específico"""
        try:
            module = self.modules.get(module_name)
            if not module:
                return {"success": False, "message": f"Módulo {module_name} não encontrado"}
            
            # Preparar dados de treino
            X = training_data.get("features", np.array([]))
            y = training_data.get("labels", np.array([]))
            
            if len(X) == 0 or len(y) == 0:
                return {"success": False, "message": "Dados de treino vazios"}
            
            # Iniciar run MLflow
            run_id = mlflow_manager.create_run(f"retrain_{module_name}", module_name)
            
            # Treinar modelo
            metrics = module.train(X, y)
            
            # Log no MLflow
            mlflow_manager.log_metrics(metrics)
            mlflow_manager.log_params({
                "module": module_name,
                "samples": len(X),
                "features": len(module.features)
            })
            
            # Log do modelo
            model_uri = mlflow_manager.log_model(module.model, f"{module_name}_model", "sklearn")
            
            logger.info("Módulo retreinado", module=module_name, metrics=metrics)
            
            return {
                "success": True,
                "message": f"Módulo {module_name} retreinado com sucesso",
                "metrics": metrics,
                "run_id": run_id,
                "model_uri": model_uri
            }
            
        except Exception as e:
            logger.error("Erro no retreino do módulo", module=module_name, error=str(e))
            return {"success": False, "message": str(e)}
    
    def get_module_status(self) -> Dict[str, Any]:
        """Obter status dos módulos"""
        try:
            status = {}
            
            for module_name, module in self.modules.items():
                status[module_name] = {
                    "is_trained": module.is_trained,
                    "features_count": len(module.features),
                    "model_path": module.model_path
                }
            
            return status
            
        except Exception as e:
            logger.error("Erro ao obter status dos módulos", error=str(e))
            return {}


# Instância global do gestor ML
ml_manager = MLManager()

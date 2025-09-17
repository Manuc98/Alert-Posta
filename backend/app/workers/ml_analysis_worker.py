"""
Worker para análise ML automática dos jogos
"""

import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import json

from app.core.logging import get_logger
from app.core.database import get_db_session
from app.models.game import Game
from app.models.signal import Signal
from app.models.model import Model
from app.workers.base import BaseWorker
from app.core.alerts import AlertType, AlertSeverity, alert_manager
from app.core.metrics import metrics_collector
from app.ml.ml_manager import MLManager
from app.services.telegram_service import TelegramService

logger = get_logger("ml_analysis_worker")


class MLAnalysisWorker(BaseWorker):
    """Worker para análise ML automática"""
    
    def __init__(self):
        super().__init__("ml_analysis", interval=120)  # 2 minutos
        self.ml_manager = MLManager()
        self.telegram_service = TelegramService()
        self.processed_games = set()
        
    async def _get_games_to_analyze(self) -> List[Game]:
        """Obter jogos que precisam ser analisados"""
        try:
            async with get_db_session() as db:
                # Buscar jogos que:
                # 1. Estão marcados para análise
                # 2. Ainda não começaram ou estão em andamento
                # 3. Não foram processados recentemente
                
                cutoff_time = datetime.utcnow() - timedelta(hours=1)
                
                games = await db.query(Game).filter(
                    Game.include_for_analysis == True,
                    Game.start_time >= datetime.utcnow() - timedelta(hours=24),
                    Game.start_time <= datetime.utcnow() + timedelta(hours=4),
                    Game.updated_at <= cutoff_time
                ).all()
                
                logger.info(f"Encontrados {len(games)} jogos para análise")
                return games
                
        except Exception as e:
            logger.error(f"Erro ao buscar jogos para análise: {str(e)}")
            return []
    
    async def _analyze_game(self, game: Game) -> Optional[Dict[str, Any]]:
        """Analisar um jogo com modelos ML"""
        try:
            logger.info(f"Analisando jogo: {game.home_team} vs {game.away_team}")
            
            # Preparar dados do jogo para análise
            game_data = {
                "game_id": game.id,
                "home_team": game.home_team,
                "away_team": game.away_team,
                "league": game.league,
                "start_time": game.start_time,
                "odds": game.odds_json or {},
                "meta": game.meta_json or {}
            }
            
            # Executar análise com todos os módulos ML
            analysis_results = await self.ml_manager.analyze_game(game_data)
            
            if not analysis_results:
                logger.warning(f"Nenhum resultado de análise para o jogo {game.id}")
                return None
            
            # Processar resultados e gerar sinais
            signals_generated = []
            
            for module_name, result in analysis_results.items():
                if result and result.get("should_send_signal"):
                    signal_data = await self._create_signal(game, module_name, result)
                    if signal_data:
                        signals_generated.append(signal_data)
            
            # Atualizar métricas
            for signal in signals_generated:
                metrics_collector.increment_signals_generated(
                    signal["model_name"], 
                    signal["type"]
                )
            
            logger.info(f"Análise concluída para {game.home_team} vs {game.away_team}: {len(signals_generated)} sinais gerados")
            
            return {
                "game_id": game.id,
                "signals_generated": len(signals_generated),
                "signals": signals_generated,
                "analysis_results": analysis_results
            }
            
        except Exception as e:
            logger.error(f"Erro ao analisar jogo {game.id}: {str(e)}")
            return None
    
    async def _create_signal(self, game: Game, module_name: str, result: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Criar sinal baseado no resultado da análise"""
        try:
            # Preparar dados do sinal
            signal_data = {
                "game_id": game.id,
                "type": module_name,
                "prediction": result.get("prediction"),
                "probability": result.get("probability", 0),
                "confidence": result.get("confidence", 0),
                "model_id": result.get("model_id", "default"),
                "model_name": result.get("model_name", module_name),
                "payload_json": {
                    "game": f"{game.home_team} vs {game.away_team}",
                    "league": game.league,
                    "prediction": result.get("prediction"),
                    "odds": result.get("odds", {}),
                    "message": result.get("message", f"Sinal {module_name} detectado")
                },
                "explain_shap": result.get("explain_shap", {}),
                "sent": False,
                "hit": None,
                "created_at": datetime.utcnow()
            }
            
            # Salvar sinal na base de dados
            async with get_db_session() as db:
                new_signal = Signal(**signal_data)
                db.add(new_signal)
                await db.commit()
                await db.refresh(new_signal)
                
                signal_data["id"] = new_signal.id
                logger.debug(f"Sinal criado: {new_signal.id} para {module_name}")
                
                return signal_data
                
        except Exception as e:
            logger.error(f"Erro ao criar sinal: {str(e)}")
            return None
    
    async def _send_pending_signals(self) -> Dict[str, Any]:
        """Enviar sinais pendentes via Telegram"""
        try:
            async with get_db_session() as db:
                # Buscar sinais pendentes
                pending_signals = await db.query(Signal).filter(
                    Signal.sent == False,
                    Signal.created_at >= datetime.utcnow() - timedelta(hours=1)
                ).all()
                
                sent_count = 0
                failed_count = 0
                
                for signal in pending_signals:
                    try:
                        # Preparar dados para o Telegram
                        telegram_data = {
                            "signal_id": signal.id,
                            "game_id": signal.game_id,
                            "type": signal.type,
                            "prediction": signal.prediction,
                            "probability": signal.probability,
                            "confidence": signal.confidence,
                            "model_name": signal.model_name,
                            "odds": signal.payload_json.get("odds", {}),
                            "explain_shap": signal.explain_shap,
                            "home_team": signal.payload_json.get("game", "").split(" vs ")[0] if " vs " in signal.payload_json.get("game", "") else "",
                            "away_team": signal.payload_json.get("game", "").split(" vs ")[1] if " vs " in signal.payload_json.get("game", "") else ""
                        }
                        
                        # Enviar via Telegram
                        result = await self.telegram_service.send_formatted_signal(telegram_data)
                        
                        if result.get("success"):
                            # Marcar como enviado
                            signal.sent = True
                            signal.sent_at = datetime.utcnow()
                            signal.telegram_message_id = result.get("message_id")
                            
                            sent_count += 1
                            
                            # Atualizar métricas
                            metrics_collector.increment_signals_sent(signal.type, "success")
                            
                            logger.info(f"Sinal {signal.id} enviado com sucesso")
                        else:
                            failed_count += 1
                            metrics_collector.increment_signals_sent(signal.type, "failed")
                            logger.error(f"Falha ao enviar sinal {signal.id}: {result.get('error')}")
                        
                    except Exception as e:
                        failed_count += 1
                        logger.error(f"Erro ao enviar sinal {signal.id}: {str(e)}")
                
                await db.commit()
                
                return {
                    "pending_signals": len(pending_signals),
                    "sent": sent_count,
                    "failed": failed_count,
                    "success_rate": (sent_count / len(pending_signals) * 100) if pending_signals else 0
                }
                
        except Exception as e:
            logger.error(f"Erro ao enviar sinais pendentes: {str(e)}")
            return {"error": str(e)}
    
    async def _update_signal_results(self) -> Dict[str, Any]:
        """Atualizar resultados dos sinais enviados"""
        try:
            async with get_db_session() as db:
                # Buscar sinais que precisam ter resultado verificado
                signals_to_check = await db.query(Signal).filter(
                    Signal.sent == True,
                    Signal.hit == None,
                    Signal.sent_at <= datetime.utcnow() - timedelta(minutes=30)
                ).all()
                
                updated_count = 0
                
                for signal in signals_to_check:
                    try:
                        # Buscar jogo para verificar resultado
                        game = await db.query(Game).filter(Game.id == signal.game_id).first()
                        
                        if game and game.meta_json:
                            # Verificar se o jogo terminou e obter resultado
                            result = self._check_game_result(game, signal)
                            
                            if result is not None:
                                signal.hit = result
                                signal.hit_checked_at = datetime.utcnow()
                                updated_count += 1
                                
                                # Atualizar mensagem no Telegram se possível
                                if signal.telegram_message_id:
                                    await self._update_telegram_message(signal, result)
                                
                                logger.info(f"Resultado atualizado para sinal {signal.id}: {'✅' if result else '❌'}")
                        
                    except Exception as e:
                        logger.error(f"Erro ao verificar resultado do sinal {signal.id}: {str(e)}")
                
                await db.commit()
                
                return {
                    "signals_checked": len(signals_to_check),
                    "results_updated": updated_count
                }
                
        except Exception as e:
            logger.error(f"Erro ao atualizar resultados dos sinais: {str(e)}")
            return {"error": str(e)}
    
    def _check_game_result(self, game: Game, signal: Signal) -> Optional[bool]:
        """Verificar se o sinal acertou baseado no resultado do jogo"""
        try:
            # Implementar lógica específica para cada tipo de sinal
            signal_type = signal.type
            prediction = signal.prediction
            
            # TODO: Implementar verificação real baseada nos dados do jogo
            # Por enquanto, retornar None para indicar que não foi possível verificar
            return None
            
        except Exception as e:
            logger.error(f"Erro ao verificar resultado do jogo: {str(e)}")
            return None
    
    async def _update_telegram_message(self, signal: Signal, result: bool):
        """Atualizar mensagem no Telegram com o resultado"""
        try:
            if signal.telegram_message_id:
                result_data = {
                    "hit": result,
                    "actual_result": "✅ Acerto" if result else "❌ Erro",
                    "roi": 0  # TODO: Calcular ROI real
                }
                
                signal_data = {
                    "home_team": signal.payload_json.get("game", "").split(" vs ")[0] if " vs " in signal.payload_json.get("game", "") else "",
                    "away_team": signal.payload_json.get("game", "").split(" vs ")[1] if " vs " in signal.payload_json.get("game", "") else "",
                    "prediction": signal.prediction,
                    "probability": signal.probability,
                    "confidence": signal.confidence
                }
                
                await self.telegram_service.update_signal_result(
                    signal.telegram_message_id,
                    signal_data,
                    result_data
                )
                
        except Exception as e:
            logger.error(f"Erro ao atualizar mensagem do Telegram: {str(e)}")
    
    async def work(self) -> Dict[str, Any]:
        """Método principal de trabalho"""
        try:
            logger.info("Iniciando análise ML automática")
            
            # 1. Obter jogos para análise
            games = await self._get_games_to_analyze()
            
            analysis_results = {
                "games_analyzed": 0,
                "signals_generated": 0,
                "analysis_errors": 0
            }
            
            # 2. Analisar cada jogo
            for game in games:
                try:
                    result = await self._analyze_game(game)
                    if result:
                        analysis_results["games_analyzed"] += 1
                        analysis_results["signals_generated"] += result["signals_generated"]
                        
                        # Marcar jogo como processado
                        self.processed_games.add(game.id)
                        
                        # Pequeno delay entre análises
                        await asyncio.sleep(0.5)
                    else:
                        analysis_results["analysis_errors"] += 1
                        
                except Exception as e:
                    logger.error(f"Erro ao analisar jogo {game.id}: {str(e)}")
                    analysis_results["analysis_errors"] += 1
            
            # 3. Enviar sinais pendentes
            send_results = await self._send_pending_signals()
            analysis_results.update(send_results)
            
            # 4. Atualizar resultados dos sinais
            update_results = await self._update_signal_results()
            analysis_results.update(update_results)
            
            # 5. Atualizar métricas
            metrics_collector.update_daily_signals(analysis_results["signals_generated"])
            
            logger.info(f"Análise ML concluída: {analysis_results}")
            
            # Alertar se houver muitos erros
            if analysis_results["analysis_errors"] > 5:
                alert_manager.create_alert(
                    alert_type=AlertType.ML,
                    severity=AlertSeverity.MEDIUM,
                    title="Muitos Erros na Análise ML",
                    message=f"Erros na análise: {analysis_results['analysis_errors']}",
                    source="ml_analysis_worker"
                )
            
            return analysis_results
            
        except Exception as e:
            logger.error(f"Erro no worker de análise ML: {str(e)}")
            
            # Criar alerta de erro crítico
            alert_manager.create_alert(
                alert_type=AlertType.ML,
                severity=AlertSeverity.CRITICAL,
                title="Falha Crítica na Análise ML",
                message=f"Worker de análise ML falhou: {str(e)}",
                source="ml_analysis_worker"
            )
            
            raise
    
    async def close(self):
        """Fechar recursos do worker"""
        await self.telegram_service.close()
        await super().stop()

"""
Serviço para gestão de sinais
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload

from app.core.logging import get_logger
from app.core.cache import cache_manager
from app.core.exceptions import SignalNotFoundException
from app.models.signal import Signal
from app.models.game import Game
from app.models.model import Model
from app.schemas.signal import SignalResponse, SignalStatsResponse, SignalExplainResponse
from app.services.telegram_service import TelegramService

logger = get_logger("signal_service")


class SignalService:
    """Serviço para gestão de sinais"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.cache = cache_manager
        self.telegram_service = TelegramService()
    
    async def get_signals(
        self,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 100,
        offset: int = 0
    ) -> Tuple[List[SignalResponse], int]:
        """Obter lista de sinais com filtros"""
        try:
            # Construir query base
            query = select(Signal).options(
                selectinload(Signal.game),
                selectinload(Signal.model)
            )
            count_query = select(func.count(Signal.id))
            
            # Aplicar filtros
            conditions = []
            
            if filters:
                if filters.get("status"):
                    conditions.append(Signal.status == filters["status"])
                
                if filters.get("module"):
                    conditions.append(Signal.module == filters["module"])
                
                if filters.get("sent") is not None:
                    conditions.append(Signal.sent == filters["sent"])
                
                if filters.get("hit") is not None:
                    conditions.append(Signal.hit == filters["hit"])
                
                if filters.get("game_id"):
                    conditions.append(Signal.game_id == filters["game_id"])
                
                if filters.get("model_id"):
                    conditions.append(Signal.model_id == filters["model_id"])
                
                if filters.get("date_from"):
                    conditions.append(Signal.created_at >= filters["date_from"])
                
                if filters.get("date_to"):
                    conditions.append(Signal.created_at <= filters["date_to"])
            
            if conditions:
                query = query.where(and_(*conditions))
                count_query = count_query.where(and_(*conditions))
            
            # Aplicar ordenação e paginação
            query = query.order_by(Signal.created_at.desc()).offset(offset).limit(limit)
            
            # Executar queries
            result = await self.db.execute(query)
            signals = result.scalars().all()
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()
            
            # Converter para response
            signal_responses = [self._signal_to_response(signal) for signal in signals]
            
            logger.info("Sinais obtidos", count=len(signals), total=total, filters=filters)
            
            return signal_responses, total
            
        except Exception as e:
            logger.error("Erro ao obter sinais", error=str(e))
            raise
    
    async def get_signal_by_id(self, signal_id: str) -> Optional[SignalResponse]:
        """Obter sinal por ID"""
        try:
            # Verificar cache primeiro
            cache_key = f"signal:{signal_id}"
            cached_signal = await self.cache.get(cache_key)
            if cached_signal:
                return SignalResponse(**cached_signal)
            
            # Obter da base de dados
            result = await self.db.execute(
                select(Signal).options(
                    selectinload(Signal.game),
                    selectinload(Signal.model)
                ).where(Signal.signal_id == signal_id)
            )
            signal = result.scalar_one_or_none()
            
            if not signal:
                return None
            
            # Converter para response
            signal_response = self._signal_to_response(signal)
            
            # Cache por 5 minutos
            await self.cache.set(cache_key, signal_response.dict(), ttl=300)
            
            logger.info("Sinal obtido", signal_id=signal_id)
            return signal_response
            
        except Exception as e:
            logger.error("Erro ao obter sinal", signal_id=signal_id, error=str(e))
            raise
    
    async def update_signal(self, signal_id: str, updates: Dict[str, Any]) -> Optional[SignalResponse]:
        """Atualizar sinal"""
        try:
            # Obter sinal
            result = await self.db.execute(
                select(Signal).where(Signal.signal_id == signal_id)
            )
            signal = result.scalar_one_or_none()
            
            if not signal:
                raise SignalNotFoundException(signal_id)
            
            # Aplicar atualizações
            for key, value in updates.items():
                if hasattr(signal, key):
                    setattr(signal, key, value)
            
            # Salvar
            await self.db.commit()
            await self.db.refresh(signal)
            
            # Invalidar cache
            await self.cache.delete(f"signal:{signal_id}")
            
            logger.info("Sinal atualizado", signal_id=signal_id, updates=list(updates.keys()))
            
            return self._signal_to_response(signal)
            
        except SignalNotFoundException:
            raise
        except Exception as e:
            logger.error("Erro ao atualizar sinal", signal_id=signal_id, error=str(e))
            await self.db.rollback()
            raise
    
    async def send_to_telegram(self, signal_id: str, custom_message: Optional[str] = None) -> Dict[str, Any]:
        """Enviar sinal para Telegram"""
        try:
            # Obter sinal
            result = await self.db.execute(
                select(Signal).options(
                    selectinload(Signal.game)
                ).where(Signal.signal_id == signal_id)
            )
            signal = result.scalar_one_or_none()
            
            if not signal:
                return {"success": False, "message": "Sinal não encontrado"}
            
            if signal.sent:
                return {"success": False, "message": "Sinal já foi enviado"}
            
            # Preparar mensagem
            message = custom_message or signal.get_telegram_message()
            if not message:
                message = self._generate_default_message(signal)
            
            # Enviar para Telegram
            telegram_result = await self.telegram_service.send_signal(message, signal)
            
            if telegram_result["success"]:
                # Marcar como enviado
                signal.mark_as_sent(telegram_result.get("message_id"))
                await self.db.commit()
                
                # Invalidar cache
                await self.cache.delete(f"signal:{signal_id}")
                
                logger.info("Sinal enviado para Telegram", signal_id=signal_id, message_id=telegram_result.get("message_id"))
                
                return {
                    "success": True,
                    "message": "Sinal enviado com sucesso",
                    "telegram_message_id": telegram_result.get("message_id")
                }
            else:
                # Marcar como falhado
                signal.mark_as_failed(telegram_result.get("error"))
                await self.db.commit()
                
                return {
                    "success": False,
                    "message": f"Erro ao enviar para Telegram: {telegram_result.get('error')}"
                }
                
        except Exception as e:
            logger.error("Erro ao enviar sinal para Telegram", signal_id=signal_id, error=str(e))
            return {"success": False, "message": str(e)}
    
    async def get_signal_explanation(self, signal_id: str) -> Optional[SignalExplainResponse]:
        """Obter explicação SHAP do sinal"""
        try:
            # Obter sinal
            result = await self.db.execute(
                select(Signal).options(
                    selectinload(Signal.model)
                ).where(Signal.signal_id == signal_id)
            )
            signal = result.scalar_one_or_none()
            
            if not signal:
                return None
            
            # Extrair features SHAP
            shap_features = signal.get_shap_features()
            explanation_text = signal.get_shap_explanation()
            
            return SignalExplainResponse(
                signal_id=signal.signal_id,
                features=shap_features,
                explanation_text=explanation_text,
                model_name=signal.model.name if signal.model else "Unknown",
                module=signal.module
            )
            
        except Exception as e:
            logger.error("Erro ao obter explicação do sinal", signal_id=signal_id, error=str(e))
            return None
    
    async def verify_result(self, signal_id: str, hit: bool) -> Dict[str, Any]:
        """Verificar resultado do sinal"""
        try:
            # Obter sinal
            result = await self.db.execute(
                select(Signal).where(Signal.signal_id == signal_id)
            )
            signal = result.scalar_one_or_none()
            
            if not signal:
                return {"success": False, "message": "Sinal não encontrado"}
            
            # Verificar resultado
            signal.verify_result(hit)
            await self.db.commit()
            
            # Invalidar cache
            await self.cache.delete(f"signal:{signal_id}")
            
            logger.info("Resultado do sinal verificado", signal_id=signal_id, hit=hit)
            
            return {"success": True, "message": "Resultado verificado com sucesso"}
            
        except Exception as e:
            logger.error("Erro ao verificar resultado do sinal", signal_id=signal_id, error=str(e))
            await self.db.rollback()
            return {"success": False, "message": str(e)}
    
    async def update_telegram_message(self, signal_id: str, new_message: str) -> Dict[str, Any]:
        """Atualizar mensagem do Telegram"""
        try:
            # Obter sinal
            result = await self.db.execute(
                select(Signal).where(Signal.signal_id == signal_id)
            )
            signal = result.scalar_one_or_none()
            
            if not signal:
                return {"success": False, "message": "Sinal não encontrado"}
            
            # Atualizar mensagem
            signal.set_telegram_message(new_message)
            await self.db.commit()
            
            # Invalidar cache
            await self.cache.delete(f"signal:{signal_id}")
            
            logger.info("Mensagem do Telegram atualizada", signal_id=signal_id)
            
            return {"success": True, "message": "Mensagem atualizada com sucesso"}
            
        except Exception as e:
            logger.error("Erro ao atualizar mensagem do Telegram", signal_id=signal_id, error=str(e))
            await self.db.rollback()
            return {"success": False, "message": str(e)}
    
    async def get_signals_stats(self, days: int = 7) -> SignalStatsResponse:
        """Obter estatísticas de sinais"""
        try:
            # Data limite
            date_limit = datetime.utcnow() - timedelta(days=days)
            
            # Query para estatísticas
            result = await self.db.execute(
                select(
                    func.count(Signal.id).label('total_signals'),
                    func.sum(func.case([(Signal.sent == True, 1)], else_=0)).label('sent_signals'),
                    func.sum(func.case([(Signal.hit == True, 1)], else_=0)).label('successful_signals'),
                    func.sum(func.case([(Signal.hit == False, 1)], else_=0)).label('failed_signals'),
                    func.sum(func.case([(Signal.hit.is_(None), 1)], else_=0)).label('pending_verification'),
                    func.avg(Signal.confidence).label('avg_confidence'),
                    func.avg(Signal.probability).label('avg_probability')
                ).where(Signal.created_at >= date_limit)
            )
            
            stats = result.first()
            
            # Calcular taxas
            total_verified = (stats.successful_signals or 0) + (stats.failed_signals or 0)
            accuracy_rate = (stats.successful_signals or 0) / total_verified if total_verified > 0 else 0.0
            success_rate = (stats.successful_signals or 0) / (stats.total_signals or 1)
            
            return SignalStatsResponse(
                total_signals=stats.total_signals or 0,
                sent_signals=stats.sent_signals or 0,
                successful_signals=stats.successful_signals or 0,
                failed_signals=stats.failed_signals or 0,
                pending_verification=stats.pending_verification or 0,
                accuracy_rate=round(accuracy_rate * 100, 2),
                success_rate=round(success_rate * 100, 2),
                avg_confidence=round(stats.avg_confidence or 0.0, 2),
                avg_probability=round(stats.avg_probability or 0.0, 2)
            )
            
        except Exception as e:
            logger.error("Erro ao obter estatísticas de sinais", error=str(e))
            # Retornar estatísticas vazias em caso de erro
            return SignalStatsResponse(
                total_signals=0,
                sent_signals=0,
                successful_signals=0,
                failed_signals=0,
                pending_verification=0,
                accuracy_rate=0.0,
                success_rate=0.0,
                avg_confidence=0.0,
                avg_probability=0.0
            )
    
    async def export_signals(self, format: str = "csv", filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Exportar sinais"""
        try:
            # Obter sinais com filtros
            signals, _ = await self.get_signals(filters=filters, limit=10000)
            
            # Preparar dados para exportação
            export_data = []
            for signal in signals:
                export_data.append({
                    "ID": signal.signal_id,
                    "Data": signal.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                    "Módulo": signal.module,
                    "Previsão": signal.prediction,
                    "Probabilidade": f"{signal.probability:.2%}",
                    "Confiança": f"{signal.confidence:.2%}",
                    "Status": signal.status,
                    "Enviado": "Sim" if signal.sent else "Não",
                    "Resultado": "Acertou" if signal.hit is True else "Errou" if signal.hit is False else "Pendente"
                })
            
            # Aqui seria implementada a geração do ficheiro CSV/Excel
            # Por agora, retornamos os dados
            
            logger.info("Sinais exportados", format=format, count=len(export_data))
            
            return {
                "success": True,
                "data": export_data,
                "format": format,
                "count": len(export_data)
            }
            
        except Exception as e:
            logger.error("Erro ao exportar sinais", error=str(e))
            return {"success": False, "message": str(e)}
    
    def _signal_to_response(self, signal: Signal) -> SignalResponse:
        """Converter Signal para SignalResponse"""
        return SignalResponse(
            id=signal.id,
            signal_id=signal.signal_id,
            game_id=signal.game_id,
            model_id=signal.model_id,
            module=signal.module,
            prediction_type=signal.prediction_type,
            prediction=signal.prediction,
            probability=signal.probability,
            confidence=signal.confidence,
            expected_value=signal.expected_value,
            status=signal.status,
            sent=signal.sent,
            sent_at=signal.sent_at,
            payload_json=signal.payload_json or {},
            telegram_message_id=signal.telegram_message_id,
            explain_shap=signal.explain_shap or {},
            hit=signal.hit,
            hit_checked_at=signal.hit_checked_at,
            created_at=signal.created_at,
            updated_at=signal.updated_at
        )
    
    def _generate_default_message(self, signal: Signal) -> str:
        """Gerar mensagem padrão para o sinal"""
        game = signal.game
        confidence_percent = int(signal.confidence * 100)
        
        message = f"""🎯 **Alert@Postas**
⚽ {game.home_team} vs {game.away_team}
🏆 {signal.prediction}
📊 Confiança: {confidence_percent}%
🤖 Módulo: {signal.module}"""
        
        return message

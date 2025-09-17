"""
Serviço para métricas e KPIs
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.core.logging import get_logger
from app.core.cache import cache_manager
from app.models.signal import Signal
from app.models.game import Game
from app.models.model import Model

logger = get_logger("metrics_service")


class MetricsService:
    """Serviço para métricas e KPIs"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.cache = cache_manager
    
    async def get_kpis(self) -> Dict[str, Any]:
        """Obter KPIs básicos"""
        try:
            # Verificar cache primeiro
            cached_kpis = await self.cache.get("kpis:dashboard")
            if cached_kpis:
                return cached_kpis
            
            # Calcular KPIs
            today = datetime.utcnow().date()
            
            # Sinais hoje
            signals_today = await self._get_signals_count(today)
            
            # Taxa de acerto 7 dias
            accuracy_7d = await self._get_accuracy_rate(days=7)
            
            # ROI estimado
            roi_estimated = await self._get_estimated_roi()
            
            # Modelo ativo
            active_model = await self._get_active_model_info()
            
            kpis = {
                "signals_today": signals_today,
                "accuracy_7d": accuracy_7d,
                "roi_estimated": roi_estimated,
                "active_model": active_model,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Cache por 5 minutos
            await self.cache.set("kpis:dashboard", kpis, ttl=300)
            
            logger.info("KPIs calculados", signals_today=signals_today, accuracy_7d=accuracy_7d)
            
            return kpis
            
        except Exception as e:
            logger.error("Erro ao calcular KPIs", error=str(e))
            return {
                "signals_today": 0,
                "accuracy_7d": 0.0,
                "roi_estimated": 0.0,
                "active_model": None,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def get_signals_today(self) -> Dict[str, Any]:
        """Obter sinais de hoje"""
        try:
            today = datetime.utcnow().date()
            
            # Total de sinais hoje
            result = await self.db.execute(
                select(func.count(Signal.id)).where(
                    func.date(Signal.created_at) == today
                )
            )
            total = result.scalar() or 0
            
            # Sinais enviados hoje
            result = await self.db.execute(
                select(func.count(Signal.id)).where(
                    and_(
                        func.date(Signal.created_at) == today,
                        Signal.sent == True
                    )
                )
            )
            sent = result.scalar() or 0
            
            # Sinais com resultado hoje
            result = await self.db.execute(
                select(func.count(Signal.id)).where(
                    and_(
                        func.date(Signal.created_at) == today,
                        Signal.hit.isnot(None)
                    )
                )
            )
            verified = result.scalar() or 0
            
            # Sinais que acertaram hoje
            result = await self.db.execute(
                select(func.count(Signal.id)).where(
                    and_(
                        func.date(Signal.created_at) == today,
                        Signal.hit == True
                    )
                )
            )
            successful = result.scalar() or 0
            
            # Taxa de acerto hoje
            accuracy_today = (successful / verified * 100) if verified > 0 else 0.0
            
            return {
                "total": total,
                "sent": sent,
                "verified": verified,
                "successful": successful,
                "accuracy_rate": round(accuracy_today, 2),
                "date": today.isoformat()
            }
            
        except Exception as e:
            logger.error("Erro ao obter sinais de hoje", error=str(e))
            return {
                "total": 0,
                "sent": 0,
                "verified": 0,
                "successful": 0,
                "accuracy_rate": 0.0,
                "date": datetime.utcnow().date().isoformat()
            }
    
    async def get_accuracy_period(self, days: int = 7) -> Dict[str, Any]:
        """Obter taxa de acerto de um período"""
        try:
            date_limit = datetime.utcnow() - timedelta(days=days)
            
            # Total de sinais verificados no período
            result = await self.db.execute(
                select(func.count(Signal.id)).where(
                    and_(
                        Signal.created_at >= date_limit,
                        Signal.hit.isnot(None)
                    )
                )
            )
            total_verified = result.scalar() or 0
            
            # Sinais que acertaram no período
            result = await self.db.execute(
                select(func.count(Signal.id)).where(
                    and_(
                        Signal.created_at >= date_limit,
                        Signal.hit == True
                    )
                )
            )
            successful = result.scalar() or 0
            
            # Taxa de acerto
            accuracy_rate = (successful / total_verified * 100) if total_verified > 0 else 0.0
            
            return {
                "period_days": days,
                "total_verified": total_verified,
                "successful": successful,
                "failed": total_verified - successful,
                "accuracy_rate": round(accuracy_rate, 2),
                "date_from": date_limit.date().isoformat(),
                "date_to": datetime.utcnow().date().isoformat()
            }
            
        except Exception as e:
            logger.error("Erro ao calcular taxa de acerto", days=days, error=str(e))
            return {
                "period_days": days,
                "total_verified": 0,
                "successful": 0,
                "failed": 0,
                "accuracy_rate": 0.0,
                "date_from": (datetime.utcnow() - timedelta(days=days)).date().isoformat(),
                "date_to": datetime.utcnow().date().isoformat()
            }
    
    async def get_estimated_roi(self) -> Dict[str, Any]:
        """Obter ROI estimado"""
        try:
            # Período de 30 dias para cálculo do ROI
            date_limit = datetime.utcnow() - timedelta(days=30)
            
            # Obter sinais com resultado no período
            result = await self.db.execute(
                select(
                    Signal.probability,
                    Signal.confidence,
                    Signal.hit,
                    Signal.payload_json
                ).where(
                    and_(
                        Signal.created_at >= date_limit,
                        Signal.hit.isnot(None)
                    )
                )
            )
            signals = result.fetchall()
            
            total_stake = 0.0
            total_payout = 0.0
            
            for signal in signals:
                # Stake baseado na confiança (exemplo: 1% do bankroll por sinal)
                stake = signal.confidence * 0.01
                total_stake += stake
                
                if signal.hit:
                    # Obter odds do payload
                    odds = signal.payload_json.get("odds", 1.5) if signal.payload_json else 1.5
                    payout = stake * odds
                    total_payout += payout
            
            # Calcular ROI
            roi_percentage = ((total_payout - total_stake) / total_stake * 100) if total_stake > 0 else 0.0
            
            return {
                "period_days": 30,
                "total_signals": len(signals),
                "total_stake": round(total_stake, 2),
                "total_payout": round(total_payout, 2),
                "profit_loss": round(total_payout - total_stake, 2),
                "roi_percentage": round(roi_percentage, 2),
                "date_from": date_limit.date().isoformat(),
                "date_to": datetime.utcnow().date().isoformat()
            }
            
        except Exception as e:
            logger.error("Erro ao calcular ROI estimado", error=str(e))
            return {
                "period_days": 30,
                "total_signals": 0,
                "total_stake": 0.0,
                "total_payout": 0.0,
                "profit_loss": 0.0,
                "roi_percentage": 0.0,
                "date_from": (datetime.utcnow() - timedelta(days=30)).date().isoformat(),
                "date_to": datetime.utcnow().date().isoformat()
            }
    
    async def get_active_model(self) -> Dict[str, Any]:
        """Obter modelo ativo"""
        try:
            # Obter modelo ativo
            result = await self.db.execute(
                select(Model).where(Model.is_active == True).limit(1)
            )
            model = result.scalar_one_or_none()
            
            if model:
                return {
                    "id": model.id,
                    "name": model.name,
                    "module": model.module,
                    "version": model.version,
                    "accuracy": model.accuracy,
                    "last_trained": model.last_trained_at.isoformat() if model.last_trained_at else None,
                    "is_training": model.is_training
                }
            else:
                return {
                    "id": None,
                    "name": "Nenhum modelo ativo",
                    "module": None,
                    "version": None,
                    "accuracy": 0.0,
                    "last_trained": None,
                    "is_training": False
                }
                
        except Exception as e:
            logger.error("Erro ao obter modelo ativo", error=str(e))
            return {
                "id": None,
                "name": "Erro ao obter modelo",
                "module": None,
                "version": None,
                "accuracy": 0.0,
                "last_trained": None,
                "is_training": False
            }
    
    async def get_dashboard_data(self) -> Dict[str, Any]:
        """Obter dados completos do dashboard"""
        try:
            # Obter todos os KPIs em paralelo
            kpis = await self.get_kpis()
            signals_today = await self.get_signals_today()
            accuracy_7d = await self.get_accuracy_period(7)
            roi_estimated = await self.get_estimated_roi()
            active_model = await self.get_active_model()
            live_games = await self.get_live_games_count()
            
            return {
                "kpis": kpis,
                "signals_today": signals_today,
                "accuracy_7d": accuracy_7d,
                "roi_estimated": roi_estimated,
                "active_model": active_model,
                "live_games": live_games,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error("Erro ao obter dados do dashboard", error=str(e))
            return {
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def get_performance_trend(self, days: int = 30) -> Dict[str, Any]:
        """Obter tendência de performance"""
        try:
            # Calcular performance por dia
            trend_data = []
            
            for i in range(days):
                date = datetime.utcnow().date() - timedelta(days=i)
                date_start = datetime.combine(date, datetime.min.time())
                date_end = datetime.combine(date, datetime.max.time())
                
                # Sinais verificados no dia
                result = await self.db.execute(
                    select(func.count(Signal.id)).where(
                        and_(
                            Signal.created_at >= date_start,
                            Signal.created_at <= date_end,
                            Signal.hit.isnot(None)
                        )
                    )
                )
                total_verified = result.scalar() or 0
                
                # Sinais que acertaram no dia
                result = await self.db.execute(
                    select(func.count(Signal.id)).where(
                        and_(
                            Signal.created_at >= date_start,
                            Signal.created_at <= date_end,
                            Signal.hit == True
                        )
                    )
                )
                successful = result.scalar() or 0
                
                accuracy = (successful / total_verified * 100) if total_verified > 0 else 0.0
                
                trend_data.append({
                    "date": date.isoformat(),
                    "total_signals": total_verified,
                    "successful": successful,
                    "accuracy_rate": round(accuracy, 2)
                })
            
            # Inverter para ter ordem cronológica
            trend_data.reverse()
            
            return {
                "period_days": days,
                "trend_data": trend_data,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error("Erro ao obter tendência de performance", days=days, error=str(e))
            return {
                "period_days": days,
                "trend_data": [],
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def get_live_games_count(self) -> Dict[str, Any]:
        """Obter número de jogos ao vivo"""
        try:
            # Jogos ao vivo
            result = await self.db.execute(
                select(func.count(Game.id)).where(Game.status == "live")
            )
            live_count = result.scalar() or 0
            
            # Jogos incluídos para análise
            result = await self.db.execute(
                select(func.count(Game.id)).where(
                    and_(Game.status == "live", Game.include_for_analysis == True)
                )
            )
            analyzed_count = result.scalar() or 0
            
            return {
                "live_games": live_count,
                "analyzed_games": analyzed_count,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error("Erro ao obter jogos ao vivo", error=str(e))
            return {
                "live_games": 0,
                "analyzed_games": 0,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def get_modules_status(self) -> Dict[str, Any]:
        """Obter status dos módulos"""
        try:
            # Aqui seria feita a verificação real do status dos módulos
            # Por agora, retornamos status simulado
            
            modules = {
                "telegram": {
                    "status": "active",
                    "uptime": 3600,
                    "last_error": None
                },
                "ml_pipeline": {
                    "status": "active",
                    "uptime": 3600,
                    "last_error": None
                },
                "api_fetcher": {
                    "status": "active",
                    "uptime": 3600,
                    "last_error": None
                }
            }
            
            return {
                "modules": modules,
                "overall_status": "running",
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error("Erro ao obter status dos módulos", error=str(e))
            return {
                "modules": {},
                "overall_status": "error",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def _get_signals_count(self, date) -> int:
        """Obter contagem de sinais para uma data"""
        try:
            result = await self.db.execute(
                select(func.count(Signal.id)).where(
                    func.date(Signal.created_at) == date
                )
            )
            return result.scalar() or 0
        except Exception as e:
            logger.error("Erro ao obter contagem de sinais", date=date, error=str(e))
            return 0
    
    async def _get_accuracy_rate(self, days: int) -> float:
        """Obter taxa de acerto para um período"""
        try:
            accuracy_data = await self.get_accuracy_period(days)
            return accuracy_data.get("accuracy_rate", 0.0)
        except Exception as e:
            logger.error("Erro ao obter taxa de acerto", days=days, error=str(e))
            return 0.0
    
    async def _get_estimated_roi(self) -> float:
        """Obter ROI estimado"""
        try:
            roi_data = await self.get_estimated_roi()
            return roi_data.get("roi_percentage", 0.0)
        except Exception as e:
            logger.error("Erro ao obter ROI estimado", error=str(e))
            return 0.0
    
    async def _get_active_model_info(self) -> Dict[str, Any]:
        """Obter informações do modelo ativo"""
        try:
            return await self.get_active_model()
        except Exception as e:
            logger.error("Erro ao obter informações do modelo ativo", error=str(e))
            return {
                "id": None,
                "name": "Erro ao obter modelo",
                "module": None,
                "version": None,
                "accuracy": 0.0,
                "last_trained": None,
                "is_training": False
            }

"""
Serviço para gestão do bot Alert@Postas
"""

import asyncio
from typing import Dict, Any, List
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.logging import get_logger
from app.core.cache import cache_manager
from app.schemas.bot import BotStatus, BotControlResponse, BotStatusEnum, ModuleInfo, ModuleStatusEnum
from app.models.user import User

logger = get_logger("bot_service")


class BotService:
    """Serviço para gestão do bot"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.cache = cache_manager
    
    async def get_status(self) -> BotStatus:
        """Obter status atual do bot"""
        try:
            # Verificar cache primeiro
            cached_status = await self.cache.get("bot:status")
            if cached_status:
                return BotStatus(**cached_status)
            
            # Obter status real dos módulos
            modules = await self._get_modules_status()
            
            # Determinar status geral
            overall_status = BotStatusEnum.RUNNING
            if any(module.status == ModuleStatusEnum.ERROR for module in modules):
                overall_status = BotStatusEnum.ERROR
            elif not any(module.status == ModuleStatusEnum.ACTIVE for module in modules):
                overall_status = BotStatusEnum.STOPPED
            
            # Obter uptime
            uptime = await self._get_bot_uptime()
            
            status = BotStatus(
                status=overall_status,
                uptime=uptime,
                modules=modules,
                last_restart=await self._get_last_restart(),
                version="3.0.0"
            )
            
            # Cache por 30 segundos
            await self.cache.set("bot:status", status.dict(), ttl=30)
            
            return status
            
        except Exception as e:
            logger.error("Erro ao obter status do bot", error=str(e))
            return BotStatus(
                status=BotStatusEnum.ERROR,
                modules=[],
                version="3.0.0"
            )
    
    async def start(self) -> BotControlResponse:
        """Iniciar bot"""
        try:
            logger.info("Iniciando bot")
            
            # Iniciar módulos principais
            await self._start_module("telegram")
            await self._start_module("ml_pipeline")
            await self._start_module("api_fetcher")
            
            # Atualizar status
            await self._update_bot_status(BotStatusEnum.RUNNING)
            
            logger.info("Bot iniciado com sucesso")
            
            return BotControlResponse(
                success=True,
                message="Bot iniciado com sucesso",
                new_status=BotStatusEnum.RUNNING
            )
            
        except Exception as e:
            logger.error("Erro ao iniciar bot", error=str(e))
            await self._update_bot_status(BotStatusEnum.ERROR)
            
            return BotControlResponse(
                success=False,
                message=f"Erro ao iniciar bot: {str(e)}",
                new_status=BotStatusEnum.ERROR
            )
    
    async def stop(self) -> BotControlResponse:
        """Parar bot"""
        try:
            logger.info("Parando bot")
            
            # Parar módulos
            await self._stop_module("telegram")
            await self._stop_module("ml_pipeline")
            await self._stop_module("api_fetcher")
            
            # Atualizar status
            await self._update_bot_status(BotStatusEnum.STOPPED)
            
            logger.info("Bot parado com sucesso")
            
            return BotControlResponse(
                success=True,
                message="Bot parado com sucesso",
                new_status=BotStatusEnum.STOPPED
            )
            
        except Exception as e:
            logger.error("Erro ao parar bot", error=str(e))
            
            return BotControlResponse(
                success=False,
                message=f"Erro ao parar bot: {str(e)}",
                new_status=BotStatusEnum.ERROR
            )
    
    async def restart(self) -> BotControlResponse:
        """Reiniciar bot"""
        try:
            logger.info("Reiniciando bot")
            
            # Parar primeiro
            stop_result = await self.stop()
            if not stop_result.success:
                return stop_result
            
            # Aguardar um pouco
            await asyncio.sleep(2)
            
            # Iniciar novamente
            start_result = await self.start()
            
            # Atualizar timestamp de restart
            await self._set_last_restart(datetime.utcnow())
            
            logger.info("Bot reiniciado com sucesso")
            
            return BotControlResponse(
                success=start_result.success,
                message="Bot reiniciado com sucesso" if start_result.success else f"Erro ao reiniciar bot: {start_result.message}",
                new_status=start_result.new_status
            )
            
        except Exception as e:
            logger.error("Erro ao reiniciar bot", error=str(e))
            
            return BotControlResponse(
                success=False,
                message=f"Erro ao reiniciar bot: {str(e)}",
                new_status=BotStatusEnum.ERROR
            )
    
    async def get_modules_status(self) -> List[ModuleInfo]:
        """Obter status dos módulos"""
        return await self._get_modules_status()
    
    async def restart_module(self, module_name: str) -> Dict[str, Any]:
        """Reiniciar módulo específico"""
        try:
            logger.info("Reiniciando módulo", module=module_name)
            
            # Parar módulo
            await self._stop_module(module_name)
            await asyncio.sleep(1)
            
            # Iniciar módulo
            await self._start_module(module_name)
            
            # Invalidar cache
            await self.cache.delete("bot:status")
            
            logger.info("Módulo reiniciado", module=module_name)
            
            return {
                "success": True,
                "message": f"Módulo {module_name} reiniciado com sucesso",
                "module": module_name
            }
            
        except Exception as e:
            logger.error("Erro ao reiniciar módulo", module=module_name, error=str(e))
            
            return {
                "success": False,
                "message": f"Erro ao reiniciar módulo {module_name}: {str(e)}",
                "module": module_name
            }
    
    async def _get_modules_status(self) -> List[ModuleInfo]:
        """Obter status interno dos módulos"""
        modules = []
        
        # Telegram module
        telegram_status = await self._get_module_status("telegram")
        modules.append(ModuleInfo(
            name="telegram",
            status=telegram_status["status"],
            uptime=telegram_status["uptime"],
            last_error=telegram_status["last_error"],
            metrics=telegram_status["metrics"]
        ))
        
        # ML Pipeline module
        ml_status = await self._get_module_status("ml_pipeline")
        modules.append(ModuleInfo(
            name="ml_pipeline",
            status=ml_status["status"],
            uptime=ml_status["uptime"],
            last_error=ml_status["last_error"],
            metrics=ml_status["metrics"]
        ))
        
        # API Fetcher module
        api_status = await self._get_module_status("api_fetcher")
        modules.append(ModuleInfo(
            name="api_fetcher",
            status=api_status["status"],
            uptime=api_status["uptime"],
            last_error=api_status["last_error"],
            metrics=api_status["metrics"]
        ))
        
        return modules
    
    async def _get_module_status(self, module_name: str) -> Dict[str, Any]:
        """Obter status de um módulo específico"""
        try:
            # Verificar se o módulo está ativo
            is_active = await self.cache.get(f"bot:module:{module_name}:active")
            
            if is_active:
                uptime = await self.cache.get(f"bot:module:{module_name}:uptime")
                last_error = await self.cache.get(f"bot:module:{module_name}:last_error")
                metrics = await self.cache.get(f"bot:module:{module_name}:metrics") or {}
                
                return {
                    "status": ModuleStatusEnum.ACTIVE,
                    "uptime": uptime,
                    "last_error": last_error,
                    "metrics": metrics
                }
            else:
                return {
                    "status": ModuleStatusEnum.INACTIVE,
                    "uptime": None,
                    "last_error": None,
                    "metrics": {}
                }
                
        except Exception as e:
            logger.error("Erro ao obter status do módulo", module=module_name, error=str(e))
            return {
                "status": ModuleStatusEnum.ERROR,
                "uptime": None,
                "last_error": str(e),
                "metrics": {}
            }
    
    async def _start_module(self, module_name: str):
        """Iniciar módulo específico"""
        await self.cache.set(f"bot:module:{module_name}:active", True, ttl=3600)
        await self.cache.set(f"bot:module:{module_name}:start_time", datetime.utcnow().timestamp(), ttl=3600)
        await self.cache.delete(f"bot:module:{module_name}:last_error")
        
        logger.info("Módulo iniciado", module=module_name)
    
    async def _stop_module(self, module_name: str):
        """Parar módulo específico"""
        await self.cache.delete(f"bot:module:{module_name}:active")
        await self.cache.delete(f"bot:module:{module_name}:start_time")
        await self.cache.delete(f"bot:module:{module_name}:uptime")
        
        logger.info("Módulo parado", module=module_name)
    
    async def _get_bot_uptime(self) -> int:
        """Obter uptime do bot em segundos"""
        start_time = await self.cache.get("bot:start_time")
        if start_time:
            return int(datetime.utcnow().timestamp() - start_time)
        return 0
    
    async def _get_last_restart(self) -> datetime:
        """Obter timestamp do último restart"""
        last_restart = await self.cache.get("bot:last_restart")
        if last_restart:
            return datetime.fromtimestamp(last_restart)
        return None
    
    async def _set_last_restart(self, timestamp: datetime):
        """Definir timestamp do último restart"""
        await self.cache.set("bot:last_restart", timestamp.timestamp(), ttl=86400)
    
    async def _update_bot_status(self, status: BotStatusEnum):
        """Atualizar status do bot"""
        await self.cache.set("bot:status:current", status.value, ttl=3600)
        
        if status == BotStatusEnum.RUNNING:
            await self.cache.set("bot:start_time", datetime.utcnow().timestamp(), ttl=86400)

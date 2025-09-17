"""
Worker base para Alert@Postas
"""

import asyncio
import signal
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import time

from app.core.logging import get_logger
from app.core.config import settings
from app.core.alerts import alert_manager, AlertType, AlertSeverity

logger = get_logger("worker_base")


class BaseWorker(ABC):
    """Classe base para todos os workers"""
    
    def __init__(self, name: str, interval: int = 60):
        self.name = name
        self.interval = interval
        self.running = False
        self.last_run = None
        self.next_run = None
        self.task = None
        self.start_time = None
        
    @abstractmethod
    async def work(self) -> Dict[str, Any]:
        """Método principal de trabalho - deve ser implementado pelas subclasses"""
        pass
    
    async def run_once(self) -> Dict[str, Any]:
        """Executar worker uma única vez"""
        try:
            logger.info(f"Iniciando execução do worker: {self.name}")
            start_time = time.time()
            
            result = await self.work()
            
            duration = time.time() - start_time
            self.last_run = datetime.utcnow()
            self.next_run = self.last_run + timedelta(seconds=self.interval)
            
            logger.info(
                f"Worker {self.name} executado com sucesso",
                duration=duration,
                result=result
            )
            
            return {
                "success": True,
                "worker": self.name,
                "duration": duration,
                "result": result,
                "timestamp": self.last_run.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Erro no worker {self.name}: {str(e)}")
            
            # Criar alerta de erro
            alert_manager.create_alert(
                alert_type=AlertType.SYSTEM,
                severity=AlertSeverity.HIGH,
                title=f"Erro no Worker {self.name}",
                message=f"Worker {self.name} falhou: {str(e)}",
                source=f"worker:{self.name}",
                metadata={"error": str(e), "worker": self.name}
            )
            
            return {
                "success": False,
                "worker": self.name,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def start(self):
        """Iniciar worker em loop contínuo"""
        if self.running:
            logger.warning(f"Worker {self.name} já está em execução")
            return
        
        self.running = True
        self.start_time = datetime.utcnow()
        
        logger.info(f"Iniciando worker: {self.name} (intervalo: {self.interval}s)")
        
        # Criar task assíncrona
        self.task = asyncio.create_task(self._run_loop())
        
        return self.task
    
    async def stop(self):
        """Parar worker"""
        if not self.running:
            logger.warning(f"Worker {self.name} não está em execução")
            return
        
        logger.info(f"Parando worker: {self.name}")
        self.running = False
        
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
        
        logger.info(f"Worker {self.name} parado")
    
    async def _run_loop(self):
        """Loop principal do worker"""
        try:
            while self.running:
                # Executar trabalho
                result = await self.run_once()
                
                # Aguardar próximo ciclo
                if self.running:
                    await asyncio.sleep(self.interval)
                    
        except asyncio.CancelledError:
            logger.info(f"Worker {self.name} cancelado")
        except Exception as e:
            logger.error(f"Erro no loop do worker {self.name}: {str(e)}")
            self.running = False
    
    def get_status(self) -> Dict[str, Any]:
        """Obter status do worker"""
        return {
            "name": self.name,
            "running": self.running,
            "interval": self.interval,
            "last_run": self.last_run.isoformat() if self.last_run else None,
            "next_run": self.next_run.isoformat() if self.next_run else None,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "uptime": (datetime.utcnow() - self.start_time).total_seconds() if self.start_time else 0
        }
    
    def set_interval(self, interval: int):
        """Alterar intervalo do worker"""
        if interval <= 0:
            raise ValueError("Intervalo deve ser maior que 0")
        
        old_interval = self.interval
        self.interval = interval
        
        logger.info(f"Intervalo do worker {self.name} alterado de {old_interval}s para {interval}s")

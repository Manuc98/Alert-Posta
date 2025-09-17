"""
Gerenciador de workers para Alert@Postas
"""

import asyncio
import signal
from typing import Dict, Any, List, Optional
from datetime import datetime
import json

from app.core.logging import get_logger
from app.core.alerts import AlertType, AlertSeverity, alert_manager
from app.workers.base import BaseWorker
from app.workers.football_api_worker import FootballAPIWorker
from app.workers.ml_analysis_worker import MLAnalysisWorker

logger = get_logger("worker_manager")


class WorkerManager:
    """Gerenciador central de todos os workers"""
    
    def __init__(self):
        self.workers: Dict[str, BaseWorker] = {}
        self.running = False
        self.start_time = None
        self.shutdown_event = asyncio.Event()
        
        # Registrar workers
        self._register_workers()
        
        # Configurar handlers de sinal para shutdown graceful
        self._setup_signal_handlers()
    
    def _register_workers(self):
        """Registrar todos os workers disponíveis"""
        self.workers = {
            "football_api": FootballAPIWorker(),
            "ml_analysis": MLAnalysisWorker()
        }
        
        logger.info(f"Workers registrados: {list(self.workers.keys())}")
    
    def _setup_signal_handlers(self):
        """Configurar handlers para shutdown graceful"""
        def signal_handler(signum, frame):
            logger.info(f"Sinal {signum} recebido, iniciando shutdown graceful")
            asyncio.create_task(self.shutdown())
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
    
    async def start_all(self):
        """Iniciar todos os workers"""
        if self.running:
            logger.warning("WorkerManager já está em execução")
            return
        
        self.running = True
        self.start_time = datetime.utcnow()
        
        logger.info("Iniciando WorkerManager com todos os workers")
        
        # Iniciar cada worker
        tasks = []
        for name, worker in self.workers.items():
            try:
                task = await worker.start()
                tasks.append(task)
                logger.info(f"Worker {name} iniciado com sucesso")
            except Exception as e:
                logger.error(f"Erro ao iniciar worker {name}: {str(e)}")
                
                # Criar alerta de erro
                alert_manager.create_alert(
                    alert_type=AlertType.SYSTEM,
                    severity=AlertSeverity.HIGH,
                    title=f"Falha ao Iniciar Worker {name}",
                    message=f"Erro ao iniciar worker {name}: {str(e)}",
                    source="worker_manager"
                )
        
        # Aguardar shutdown signal
        await self.shutdown_event.wait()
        
        # Parar todos os workers
        await self.stop_all()
        
        logger.info("WorkerManager encerrado")
    
    async def stop_all(self):
        """Parar todos os workers"""
        if not self.running:
            logger.warning("WorkerManager não está em execução")
            return
        
        logger.info("Parando todos os workers")
        
        # Parar cada worker
        for name, worker in self.workers.items():
            try:
                await worker.stop()
                logger.info(f"Worker {name} parado com sucesso")
            except Exception as e:
                logger.error(f"Erro ao parar worker {name}: {str(e)}")
        
        self.running = False
        
        logger.info("Todos os workers parados")
    
    async def restart_worker(self, worker_name: str):
        """Reiniciar um worker específico"""
        if worker_name not in self.workers:
            raise ValueError(f"Worker {worker_name} não encontrado")
        
        worker = self.workers[worker_name]
        
        logger.info(f"Reiniciando worker {worker_name}")
        
        # Parar worker
        await worker.stop()
        
        # Aguardar um pouco
        await asyncio.sleep(2)
        
        # Iniciar worker novamente
        await worker.start()
        
        logger.info(f"Worker {worker_name} reiniciado com sucesso")
    
    async def get_worker_status(self, worker_name: str = None) -> Dict[str, Any]:
        """Obter status de um worker ou todos os workers"""
        if worker_name:
            if worker_name not in self.workers:
                raise ValueError(f"Worker {worker_name} não encontrado")
            
            return self.workers[worker_name].get_status()
        
        # Status de todos os workers
        status = {
            "manager": {
                "running": self.running,
                "start_time": self.start_time.isoformat() if self.start_time else None,
                "uptime": (datetime.utcnow() - self.start_time).total_seconds() if self.start_time else 0,
                "total_workers": len(self.workers)
            },
            "workers": {}
        }
        
        for name, worker in self.workers.items():
            status["workers"][name] = worker.get_status()
        
        return status
    
    async def set_worker_interval(self, worker_name: str, interval: int):
        """Alterar intervalo de um worker"""
        if worker_name not in self.workers:
            raise ValueError(f"Worker {worker_name} não encontrado")
        
        worker = self.workers[worker_name]
        worker.set_interval(interval)
        
        logger.info(f"Intervalo do worker {worker_name} alterado para {interval}s")
    
    async def run_worker_once(self, worker_name: str) -> Dict[str, Any]:
        """Executar um worker uma única vez"""
        if worker_name not in self.workers:
            raise ValueError(f"Worker {worker_name} não encontrado")
        
        worker = self.workers[worker_name]
        
        logger.info(f"Executando worker {worker_name} uma única vez")
        
        result = await worker.run_once()
        
        logger.info(f"Worker {worker_name} executado: {result}")
        
        return result
    
    async def shutdown(self):
        """Iniciar processo de shutdown"""
        logger.info("Iniciando processo de shutdown")
        self.shutdown_event.set()
    
    def get_available_workers(self) -> List[str]:
        """Obter lista de workers disponíveis"""
        return list(self.workers.keys())
    
    async def health_check(self) -> Dict[str, Any]:
        """Verificar saúde de todos os workers"""
        health_status = {
            "healthy": True,
            "timestamp": datetime.utcnow().isoformat(),
            "workers": {}
        }
        
        for name, worker in self.workers.items():
            try:
                status = worker.get_status()
                
                # Considerar worker saudável se estiver rodando e teve execução recente
                is_healthy = (
                    status["running"] and
                    status["last_run"] is not None
                )
                
                health_status["workers"][name] = {
                    "healthy": is_healthy,
                    "status": status
                }
                
                if not is_healthy:
                    health_status["healthy"] = False
                    
            except Exception as e:
                logger.error(f"Erro ao verificar saúde do worker {name}: {str(e)}")
                health_status["workers"][name] = {
                    "healthy": False,
                    "error": str(e)
                }
                health_status["healthy"] = False
        
        # Criar alerta se sistema não estiver saudável
        if not health_status["healthy"]:
            unhealthy_workers = [
                name for name, info in health_status["workers"].items()
                if not info.get("healthy", False)
            ]
            
            alert_manager.create_alert(
                alert_type=AlertType.SYSTEM,
                severity=AlertSeverity.HIGH,
                title="Workers Não Saudáveis",
                message=f"Workers com problemas: {', '.join(unhealthy_workers)}",
                source="worker_manager"
            )
        
        return health_status


# Instância global do gerenciador de workers
worker_manager = WorkerManager()


async def start_workers():
    """Função para iniciar todos os workers"""
    await worker_manager.start_all()


async def stop_workers():
    """Função para parar todos os workers"""
    await worker_manager.stop_all()


async def get_workers_status():
    """Função para obter status de todos os workers"""
    return await worker_manager.get_worker_status()

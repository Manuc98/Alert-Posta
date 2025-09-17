"""
Sistema de logging avançado com integração Loki para Alert@Postas
"""

import json
import logging
import time
from typing import Dict, Any, Optional, List
from datetime import datetime
import asyncio
import aiohttp
from enum import Enum

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("loki_logger")


class LogLevel(Enum):
    """Níveis de log"""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class LogCategory(Enum):
    """Categorias de log"""
    SYSTEM = "system"
    ML = "ml"
    API = "api"
    DATABASE = "database"
    TELEGRAM = "telegram"
    SECURITY = "security"
    AUDIT = "audit"
    PERFORMANCE = "performance"


class LokiLogger:
    """Logger avançado com integração Loki"""
    
    def __init__(self):
        self.loki_url = settings.LOKI_URL if hasattr(settings, 'LOKI_URL') else "http://localhost:3100"
        self.service_name = "alertpostas"
        self.environment = settings.ENVIRONMENT
        self.session = None
        self.log_buffer: List[Dict[str, Any]] = []
        self.buffer_size = 100
        self.flush_interval = 30  # segundos
        
    async def _get_session(self) -> aiohttp.ClientSession:
        """Obter sessão HTTP reutilizável"""
        if self.session is None or self.session.closed:
            timeout = aiohttp.ClientTimeout(total=30)
            self.session = aiohttp.ClientSession(timeout=timeout)
        return self.session
    
    async def _send_to_loki(self, logs: List[Dict[str, Any]]):
        """Enviar logs para Loki"""
        try:
            if not logs:
                return
            
            session = await self._get_session()
            
            # Preparar payload para Loki
            streams = []
            
            for log in logs:
                # Extrair timestamp (nanosegundos)
                timestamp = int(log.get('timestamp', time.time()) * 1e9)
                
                # Preparar labels
                labels = {
                    "service": self.service_name,
                    "environment": self.environment,
                    "level": log.get('level', 'INFO'),
                    "category": log.get('category', 'system'),
                    "module": log.get('module', 'unknown')
                }
                
                # Adicionar labels extras se disponíveis
                if 'user_id' in log:
                    labels['user_id'] = str(log['user_id'])
                if 'request_id' in log:
                    labels['request_id'] = log['request_id']
                if 'game_id' in log:
                    labels['game_id'] = str(log['game_id'])
                if 'signal_id' in log:
                    labels['signal_id'] = str(log['signal_id'])
                
                # Preparar entrada de log
                log_entry = {
                    "stream": labels,
                    "values": [[str(timestamp), json.dumps(log)]]
                }
                
                streams.append(log_entry)
            
            # Payload final para Loki
            payload = {"streams": streams}
            
            # Enviar para Loki
            url = f"{self.loki_url}/loki/api/v1/push"
            headers = {"Content-Type": "application/json"}
            
            async with session.post(url, json=payload, headers=headers) as response:
                if response.status == 204:
                    logger.debug(f"Enviados {len(logs)} logs para Loki")
                else:
                    logger.error(f"Erro ao enviar logs para Loki: {response.status}")
                    
        except Exception as e:
            logger.error(f"Erro ao enviar logs para Loki: {str(e)}")
    
    def _format_log_message(self, level: LogLevel, message: str, **kwargs) -> str:
        """Formatar mensagem de log no padrão Alert@Postas"""
        timestamp = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
        
        # Formato: YYYY-MM-DD HH:MM:SS [LEVEL] (betbot) | [module] message
        module = kwargs.get('module', 'system')
        formatted_message = f"{timestamp} [{level.value}] (betbot) | [{module}] {message}"
        
        return formatted_message
    
    async def log(self, level: LogLevel, message: str, category: LogCategory = LogCategory.SYSTEM, **kwargs):
        """Registrar log"""
        try:
            # Preparar dados do log
            log_data = {
                'timestamp': time.time(),
                'level': level.value,
                'category': category.value,
                'message': message,
                'module': kwargs.get('module', 'system'),
                'service': self.service_name,
                'environment': self.environment
            }
            
            # Adicionar dados extras
            for key, value in kwargs.items():
                if key not in ['module'] and value is not None:
                    log_data[key] = value
            
            # Formatar mensagem para console
            formatted_message = self._format_log_message(level, message, **kwargs)
            
            # Log para console
            if level == LogLevel.DEBUG:
                logging.debug(formatted_message)
            elif level == LogLevel.INFO:
                logging.info(formatted_message)
            elif level == LogLevel.WARNING:
                logging.warning(formatted_message)
            elif level == LogLevel.ERROR:
                logging.error(formatted_message)
            elif level == LogLevel.CRITICAL:
                logging.critical(formatted_message)
            
            # Adicionar ao buffer
            self.log_buffer.append(log_data)
            
            # Enviar para Loki se buffer estiver cheio
            if len(self.log_buffer) >= self.buffer_size:
                await self.flush()
                
        except Exception as e:
            # Fallback para logging básico
            logging.error(f"Erro no sistema de logging: {str(e)}")
    
    async def debug(self, message: str, **kwargs):
        """Log de debug"""
        await self.log(LogLevel.DEBUG, message, **kwargs)
    
    async def info(self, message: str, **kwargs):
        """Log de informação"""
        await self.log(LogLevel.INFO, message, **kwargs)
    
    async def warning(self, message: str, **kwargs):
        """Log de aviso"""
        await self.log(LogLevel.WARNING, message, **kwargs)
    
    async def error(self, message: str, **kwargs):
        """Log de erro"""
        await self.log(LogLevel.ERROR, message, **kwargs)
    
    async def critical(self, message: str, **kwargs):
        """Log crítico"""
        await self.log(LogLevel.CRITICAL, message, **kwargs)
    
    async def log_ml_inference(self, model_name: str, duration: float, prediction: Any, confidence: float, **kwargs):
        """Log específico para inferência ML"""
        await self.info(
            f"Inferência ML concluída: {model_name}",
            category=LogCategory.ML,
            module=model_name,
            model_name=model_name,
            duration=duration,
            prediction=prediction,
            confidence=confidence,
            **kwargs
        )
    
    async def log_signal_generated(self, signal_id: str, game_id: str, signal_type: str, probability: float, **kwargs):
        """Log específico para sinais gerados"""
        await self.info(
            f"Sinal gerado: {signal_type} para jogo {game_id}",
            category=LogCategory.ML,
            module="signal_generator",
            signal_id=signal_id,
            game_id=game_id,
            signal_type=signal_type,
            probability=probability,
            **kwargs
        )
    
    async def log_signal_sent(self, signal_id: str, telegram_message_id: str, **kwargs):
        """Log específico para sinais enviados"""
        await self.info(
            f"Sinal enviado via Telegram: {signal_id}",
            category=LogCategory.TELEGRAM,
            module="telegram_service",
            signal_id=signal_id,
            telegram_message_id=telegram_message_id,
            **kwargs
        )
    
    async def log_api_request(self, method: str, endpoint: str, status_code: int, duration: float, user_id: str = None, **kwargs):
        """Log específico para requisições API"""
        await self.info(
            f"API Request: {method} {endpoint} - {status_code}",
            category=LogCategory.API,
            module="api",
            method=method,
            endpoint=endpoint,
            status_code=status_code,
            duration=duration,
            user_id=user_id,
            **kwargs
        )
    
    async def log_security_event(self, event_type: str, user_id: str = None, ip_address: str = None, **kwargs):
        """Log específico para eventos de segurança"""
        await self.warning(
            f"Evento de segurança: {event_type}",
            category=LogCategory.SECURITY,
            module="security",
            event_type=event_type,
            user_id=user_id,
            ip_address=ip_address,
            **kwargs
        )
    
    async def log_audit_event(self, action: str, resource: str, user_id: str, **kwargs):
        """Log específico para eventos de auditoria"""
        await self.info(
            f"Auditoria: {action} em {resource}",
            category=LogCategory.AUDIT,
            module="audit",
            action=action,
            resource=resource,
            user_id=user_id,
            **kwargs
        )
    
    async def log_performance_metric(self, metric_name: str, value: float, unit: str = None, **kwargs):
        """Log específico para métricas de performance"""
        await self.debug(
            f"Métrica de performance: {metric_name} = {value}",
            category=LogCategory.PERFORMANCE,
            module="metrics",
            metric_name=metric_name,
            value=value,
            unit=unit,
            **kwargs
        )
    
    async def flush(self):
        """Enviar buffer de logs para Loki"""
        if self.log_buffer:
            logs_to_send = self.log_buffer.copy()
            self.log_buffer.clear()
            await self._send_to_loki(logs_to_send)
    
    async def start_periodic_flush(self):
        """Iniciar flush periódico"""
        while True:
            await asyncio.sleep(self.flush_interval)
            await self.flush()
    
    async def close(self):
        """Fechar logger e enviar logs restantes"""
        await self.flush()
        if self.session and not self.session.closed:
            await self.session.close()


# Instância global do logger
loki_logger = LokiLogger()


# Função de conveniência para logging assíncrono
async def log_async(level: LogLevel, message: str, **kwargs):
    """Função de conveniência para logging assíncrono"""
    await loki_logger.log(level, message, **kwargs)


# Context manager para logging de operações
class LogContext:
    """Context manager para logging de operações"""
    
    def __init__(self, operation: str, **context):
        self.operation = operation
        self.context = context
        self.start_time = None
    
    async def __aenter__(self):
        self.start_time = time.time()
        await loki_logger.info(
            f"Iniciando operação: {self.operation}",
            **self.context
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        duration = time.time() - self.start_time
        
        if exc_type is None:
            await loki_logger.info(
                f"Operação concluída: {self.operation}",
                duration=duration,
                **self.context
            )
        else:
            await loki_logger.error(
                f"Operação falhou: {self.operation}",
                duration=duration,
                error=str(exc_val),
                **self.context
            )

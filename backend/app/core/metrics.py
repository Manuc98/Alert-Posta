"""
Sistema de métricas Prometheus para Alert@Postas
"""

from prometheus_client import Counter, Histogram, Gauge, Info, CollectorRegistry, generate_latest
from typing import Dict, Any
import time
from functools import wraps

# Registry personalizado
registry = CollectorRegistry()

# Métricas de requisições HTTP
http_requests_total = Counter(
    'http_requests_total',
    'Total de requisições HTTP',
    ['method', 'endpoint', 'status_code'],
    registry=registry
)

http_request_duration_seconds = Histogram(
    'http_request_duration_seconds',
    'Duração das requisições HTTP em segundos',
    ['method', 'endpoint'],
    registry=registry
)

# Métricas do sistema de ML
ml_model_inference_duration = Histogram(
    'ml_model_inference_duration_seconds',
    'Duração da inferência dos modelos ML',
    ['model_name', 'model_version'],
    registry=registry
)

ml_model_accuracy = Gauge(
    'ml_model_accuracy_percent',
    'Precisão dos modelos ML (%)',
    ['model_name', 'model_version'],
    registry=registry
)

ml_signals_generated_total = Counter(
    'ml_signals_generated_total',
    'Total de sinais gerados pelos modelos',
    ['model_name', 'signal_type'],
    registry=registry
)

ml_signals_sent_total = Counter(
    'ml_signals_sent_total',
    'Total de sinais enviados via Telegram',
    ['signal_type', 'status'],
    registry=registry
)

# Métricas de jogos
active_games_count = Gauge(
    'active_games_count',
    'Número de jogos ativos sendo analisados',
    registry=registry
)

games_analyzed_total = Counter(
    'games_analyzed_total',
    'Total de jogos analisados',
    ['league', 'status'],
    registry=registry
)

# Métricas de performance
api_response_time = Histogram(
    'api_response_time_seconds',
    'Tempo de resposta da API',
    ['endpoint'],
    registry=registry
)

database_connection_pool = Gauge(
    'database_connection_pool_active',
    'Conexões ativas no pool da base de dados',
    registry=registry
)

redis_connection_pool = Gauge(
    'redis_connection_pool_active',
    'Conexões ativas no pool do Redis',
    registry=registry
)

# Métricas de negócio
signals_accuracy_last7d = Gauge(
    'signals_accuracy_last7d_percent',
    'Taxa de acerto dos sinais nos últimos 7 dias (%)',
    registry=registry
)

estimated_roi = Gauge(
    'estimated_roi_percent',
    'ROI estimado do sistema (%)',
    registry=registry
)

daily_signals_count = Gauge(
    'daily_signals_count',
    'Número de sinais enviados hoje',
    registry=registry
)

# Métricas de sistema
system_info = Info(
    'system_info',
    'Informações do sistema',
    registry=registry
)

system_uptime = Gauge(
    'system_uptime_seconds',
    'Tempo de atividade do sistema em segundos',
    registry=registry
)

# Métricas de erro
error_count = Counter(
    'error_count_total',
    'Total de erros por tipo',
    ['error_type', 'module'],
    registry=registry
)

# Métricas de recursos
memory_usage = Gauge(
    'memory_usage_bytes',
    'Uso de memória em bytes',
    registry=registry
)

cpu_usage = Gauge(
    'cpu_usage_percent',
    'Uso de CPU (%)',
    registry=registry
)


class MetricsCollector:
    """Coletor de métricas personalizado"""
    
    def __init__(self):
        self.start_time = time.time()
        self._setup_system_info()
    
    def _setup_system_info(self):
        """Configurar informações do sistema"""
        import platform
        import sys
        
        system_info.info({
            'python_version': sys.version,
            'platform': platform.platform(),
            'architecture': platform.architecture()[0],
            'system': platform.system(),
            'processor': platform.processor(),
            'app_name': 'Alert@Postas',
            'app_version': '3.0.0'
        })
    
    def update_uptime(self):
        """Atualizar tempo de atividade"""
        uptime = time.time() - self.start_time
        system_uptime.set(uptime)
    
    def record_ml_inference(self, model_name: str, model_version: str, duration: float):
        """Registrar inferência de modelo ML"""
        ml_model_inference_duration.labels(
            model_name=model_name,
            model_version=model_version
        ).observe(duration)
    
    def update_model_accuracy(self, model_name: str, model_version: str, accuracy: float):
        """Atualizar precisão do modelo"""
        ml_model_accuracy.labels(
            model_name=model_name,
            model_version=model_version
        ).set(accuracy)
    
    def increment_signals_generated(self, model_name: str, signal_type: str):
        """Incrementar contador de sinais gerados"""
        ml_signals_generated_total.labels(
            model_name=model_name,
            signal_type=signal_type
        ).inc()
    
    def increment_signals_sent(self, signal_type: str, status: str):
        """Incrementar contador de sinais enviados"""
        ml_signals_sent_total.labels(
            signal_type=signal_type,
            status=status
        ).inc()
    
    def update_active_games(self, count: int):
        """Atualizar número de jogos ativos"""
        active_games_count.set(count)
    
    def increment_games_analyzed(self, league: str, status: str):
        """Incrementar contador de jogos analisados"""
        games_analyzed_total.labels(
            league=league,
            status=status
        ).inc()
    
    def update_signals_accuracy(self, accuracy: float):
        """Atualizar taxa de acerto dos sinais"""
        signals_accuracy_last7d.set(accuracy)
    
    def update_roi(self, roi: float):
        """Atualizar ROI estimado"""
        estimated_roi.set(roi)
    
    def update_daily_signals(self, count: int):
        """Atualizar contador diário de sinais"""
        daily_signals_count.set(count)
    
    def increment_error(self, error_type: str, module: str):
        """Incrementar contador de erros"""
        error_count.labels(
            error_type=error_type,
            module=module
        ).inc()
    
    def update_memory_usage(self, bytes_used: int):
        """Atualizar uso de memória"""
        memory_usage.set(bytes_used)
    
    def update_cpu_usage(self, percent: float):
        """Atualizar uso de CPU"""
        cpu_usage.set(percent)


# Instância global do coletor
metrics_collector = MetricsCollector()


def track_request_duration(endpoint: str):
    """Decorator para rastrear duração de requisições"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                return result
            finally:
                duration = time.time() - start_time
                http_request_duration_seconds.labels(
                    method="POST",  # ou GET conforme necessário
                    endpoint=endpoint
                ).observe(duration)
        return wrapper
    return decorator


def track_ml_inference(model_name: str, model_version: str = "1.0"):
    """Decorator para rastrear inferência de modelos ML"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                return result
            finally:
                duration = time.time() - start_time
                metrics_collector.record_ml_inference(model_name, model_version, duration)
        return wrapper
    return decorator


def get_metrics() -> str:
    """Obter métricas em formato Prometheus"""
    # Atualizar métricas dinâmicas
    metrics_collector.update_uptime()
    
    return generate_latest(registry).decode('utf-8')


def get_metrics_summary() -> Dict[str, Any]:
    """Obter resumo das métricas"""
    return {
        "system_uptime": system_uptime._value._value,
        "active_games": active_games_count._value._value,
        "daily_signals": daily_signals_count._value._value,
        "accuracy_7d": signals_accuracy_last7d._value._value,
        "estimated_roi": estimated_roi._value._value,
        "memory_usage": memory_usage._value._value,
        "cpu_usage": cpu_usage._value._value
    }

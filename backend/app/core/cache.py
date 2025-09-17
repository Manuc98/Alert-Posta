"""
Sistema de cache Redis para Alert@Postas V3
"""

import json
import asyncio
from typing import Any, Optional, Dict, List
import redis.asyncio as redis
from redis.asyncio import Redis

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("cache")

# Pool de conexões Redis
redis_pool: Optional[redis.ConnectionPool] = None
redis_client: Optional[Redis] = None


async def init_redis():
    """Inicializar conexão Redis"""
    global redis_pool, redis_client
    
    try:
        redis_pool = redis.ConnectionPool.from_url(
            settings.REDIS_URL,
            max_connections=20,
            retry_on_timeout=True
        )
        
        redis_client = Redis(connection_pool=redis_pool)
        
        # Testar conexão
        await redis_client.ping()
        logger.info("Redis conectado com sucesso")
        
    except Exception as e:
        logger.error("Erro ao conectar Redis", error=str(e))
        raise


async def get_redis() -> Redis:
    """Obter cliente Redis"""
    if not redis_client:
        await init_redis()
    return redis_client


class CacheManager:
    """Gestor de cache Redis"""
    
    def __init__(self):
        self.redis: Optional[Redis] = None
        self.default_ttl = settings.REDIS_CACHE_TTL
    
    async def get_client(self) -> Redis:
        """Obter cliente Redis"""
        if not self.redis:
            self.redis = await get_redis()
        return self.redis
    
    async def get(self, key: str) -> Optional[Any]:
        """Obter valor do cache"""
        try:
            client = await self.get_client()
            value = await client.get(key)
            
            if value:
                return json.loads(value)
            return None
            
        except Exception as e:
            logger.error("Erro ao obter do cache", key=key, error=str(e))
            return None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Definir valor no cache"""
        try:
            client = await self.get_client()
            ttl = ttl or self.default_ttl
            
            serialized_value = json.dumps(value, default=str)
            await client.setex(key, ttl, serialized_value)
            return True
            
        except Exception as e:
            logger.error("Erro ao definir no cache", key=key, error=str(e))
            return False
    
    async def delete(self, key: str) -> bool:
        """Eliminar valor do cache"""
        try:
            client = await self.get_client()
            result = await client.delete(key)
            return result > 0
            
        except Exception as e:
            logger.error("Erro ao eliminar do cache", key=key, error=str(e))
            return False
    
    async def exists(self, key: str) -> bool:
        """Verificar se chave existe"""
        try:
            client = await self.get_client()
            return await client.exists(key) > 0
            
        except Exception as e:
            logger.error("Erro ao verificar existência no cache", key=key, error=str(e))
            return False
    
    async def get_or_set(self, key: str, factory_func, ttl: Optional[int] = None) -> Any:
        """Obter do cache ou executar função e guardar"""
        value = await self.get(key)
        if value is not None:
            return value
        
        # Executar função se for callable
        if callable(factory_func):
            if asyncio.iscoroutinefunction(factory_func):
                value = await factory_func()
            else:
                value = factory_func()
        else:
            value = factory_func
        
        # Guardar no cache
        await self.set(key, value, ttl)
        return value
    
    async def invalidate_pattern(self, pattern: str) -> int:
        """Invalidar chaves por padrão"""
        try:
            client = await self.get_client()
            keys = await client.keys(pattern)
            
            if keys:
                deleted = await client.delete(*keys)
                logger.info("Chaves invalidadas", pattern=pattern, count=deleted)
                return deleted
            
            return 0
            
        except Exception as e:
            logger.error("Erro ao invalidar padrão", pattern=pattern, error=str(e))
            return 0
    
    async def get_multiple(self, keys: List[str]) -> Dict[str, Any]:
        """Obter múltiplos valores"""
        try:
            client = await self.get_client()
            values = await client.mget(keys)
            
            result = {}
            for key, value in zip(keys, values):
                if value:
                    result[key] = json.loads(value)
            
            return result
            
        except Exception as e:
            logger.error("Erro ao obter múltiplos valores", keys=keys, error=str(e))
            return {}
    
    async def set_multiple(self, data: Dict[str, Any], ttl: Optional[int] = None) -> bool:
        """Definir múltiplos valores"""
        try:
            client = await self.get_client()
            ttl = ttl or self.default_ttl
            
            pipe = client.pipeline()
            for key, value in data.items():
                serialized_value = json.dumps(value, default=str)
                pipe.setex(key, ttl, serialized_value)
            
            await pipe.execute()
            return True
            
        except Exception as e:
            logger.error("Erro ao definir múltiplos valores", error=str(e))
            return False


# Instância global do gestor de cache
cache_manager = CacheManager()


# Decorators para cache
def cache_key(*args, **kwargs):
    """Gerar chave de cache"""
    key_parts = []
    
    for arg in args:
        if hasattr(arg, 'id'):
            key_parts.append(f"{arg.__class__.__name__}:{arg.id}")
        else:
            key_parts.append(str(arg))
    
    for key, value in sorted(kwargs.items()):
        key_parts.append(f"{key}:{value}")
    
    return ":".join(key_parts)


async def cached(ttl: int = None, key_prefix: str = ""):
    """Decorator para cache automático"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Gerar chave de cache
            cache_key_str = f"{key_prefix}:{func.__name__}:{cache_key(*args, **kwargs)}"
            
            # Tentar obter do cache
            cached_value = await cache_manager.get(cache_key_str)
            if cached_value is not None:
                logger.debug("Cache hit", key=cache_key_str, function=func.__name__)
                return cached_value
            
            # Executar função e guardar resultado
            logger.debug("Cache miss", key=cache_key_str, function=func.__name__)
            result = await func(*args, **kwargs)
            await cache_manager.set(cache_key_str, result, ttl)
            
            return result
        
        return wrapper
    return decorator

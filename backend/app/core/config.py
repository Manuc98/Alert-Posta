"""
Configurações do Alert@Postas V3
"""

import os
from typing import List, Optional
from pydantic import BaseSettings, validator
from functools import lru_cache


class Settings(BaseSettings):
    """Configurações da aplicação"""
    
    # Aplicação
    APP_NAME: str = "Alert@Postas V3"
    VERSION: str = "3.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # API
    API_V1_STR: str = "/api/v1"
    
    # Segurança
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001"]
    ALLOWED_HOSTS: List[str] = ["localhost", "127.0.0.1"]
    
    # Base de Dados
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/alertpostas"
    DATABASE_TEST_URL: str = "sqlite:///./test.db"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_CACHE_TTL: int = 3600  # 1 hora
    
    # MLflow
    MLFLOW_TRACKING_URI: str = "http://localhost:5000"
    MLFLOW_EXPERIMENT_NAME: str = "alertpostas-predictions"
    
    # Telegram
    TELEGRAM_BOT_TOKEN: str = "8031960776:AAFmB-UhPTfj3YauD6PPkjQW2VTsngJ3AIU"
    TELEGRAM_CHAT_ID: str = "-1002937302746"
    
    # API Football
    FOOTBALL_API_KEY: str = "623ead667fb69f339d1e8f9a366de721"
    API_FOOTBALL_KEY: str = "623ead667fb69f339d1e8f9a366de721"
    
    # Cloudflare Worker
    CLOUDFLARE_WORKER_URL: Optional[str] = None
    CLOUDFLARE_API_TOKEN: Optional[str] = None
    FOOTBALL_API_URL: str = "https://v3.football.api-sports.io"
    
    # Observabilidade
    SENTRY_DSN: Optional[str] = None
    PROMETHEUS_PORT: int = 9090
    
    # Modelos ML
    MODELS_PATH: str = "./models"
    DATASETS_PATH: str = "./datasets"
    
    # Configurações de negócio
    MIN_CONFIDENCE_THRESHOLD: float = 0.6
    MIN_PROBABILITY_THRESHOLD: float = 0.55
    VALUE_BET_THRESHOLD: float = 0.05  # 5% EV mínimo
    
    @validator("CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v):
        if isinstance(v, str):
            return [i.strip() for i in v.split(",")]
        return v
    
    @validator("ALLOWED_HOSTS", pre=True)
    def assemble_allowed_hosts(cls, v):
        if isinstance(v, str):
            return [i.strip() for i in v.split(",")]
        return v
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Obter configurações (cached)"""
    return Settings()


# Instância global das configurações
settings = get_settings()

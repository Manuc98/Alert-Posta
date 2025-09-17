"""
Alert@Postas V3 - Main FastAPI Application
Sistema completo de previsões desportivas com IA
"""

import logging
import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os
from datetime import datetime

from app.core.config import settings
from app.core.database import init_db
from app.core.logging import setup_logging
from app.api.v1.api import api_router
from app.core.exceptions import AlertPostasException


# Configurar logging estruturado
setup_logging()
logger = structlog.get_logger("betbot")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle management para FastAPI"""
    # Startup
    logger.info("Iniciando Alert@Postas V3", module="main")
    
    # Inicializar base de dados
    await init_db()
    logger.info("Base de dados inicializada", module="database")
    
    # Inicializar Redis
    from app.core.cache import init_redis
    await init_redis()
    logger.info("Redis inicializado", module="cache")
    
    # Inicializar MLflow
    from app.core.mlflow_client import init_mlflow
    init_mlflow()
    logger.info("MLflow inicializado", module="mlflow")
    
    # Inicializar Workers
    from app.workers.worker_manager import worker_manager
    import asyncio
    asyncio.create_task(worker_manager.start_all())
    logger.info("Workers automáticos iniciados", module="workers")
    
    yield
    
    # Shutdown
    logger.info("A encerrar Alert@Postas V3", module="main")
    
    # Parar Workers
    from app.workers.worker_manager import worker_manager
    await worker_manager.stop_all()
    logger.info("Workers parados", module="workers")


# Criar aplicação FastAPI
app = FastAPI(
    title="Alert@Postas V3",
    description="Sistema completo de previsões desportivas com IA",
    version="3.0.0",
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
    lifespan=lifespan
)

# Middleware de segurança
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=settings.ALLOWED_HOSTS
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handlers
@app.exception_handler(AlertPostasException)
async def alert_postas_exception_handler(request, exc: AlertPostasException):
    """Handler para exceções customizadas"""
    logger.error(
        "Exceção Alert@Postas",
        module=exc.module,
        error=exc.message,
        details=exc.details
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.message,
            "module": exc.module,
            "timestamp": datetime.utcnow().isoformat()
        }
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    """Handler para exceções HTTP"""
    logger.error(
        "Exceção HTTP",
        module="main",
        status_code=exc.status_code,
        detail=exc.detail
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
            "timestamp": datetime.utcnow().isoformat()
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc: Exception):
    """Handler para exceções gerais"""
    logger.error(
        "Exceção não tratada",
        module="main",
        error=str(exc),
        exc_info=True
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": "Erro interno do servidor",
            "timestamp": datetime.utcnow().isoformat()
        }
    )


# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Alert@Postas V3",
        "version": "3.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


# Incluir rotas da API
app.include_router(api_router, prefix="/api/v1")


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Alert@Postas V3 - Sistema de Previsões Desportivas",
        "version": "3.0.0",
        "docs": "/docs" if settings.ENVIRONMENT != "production" else "disabled"
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.ENVIRONMENT == "development",
        log_level="info"
    )

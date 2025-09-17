"""
Configuração da base de dados para Alert@Postas V3
"""

from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import asyncio
from typing import AsyncGenerator

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("database")

# Base para modelos SQLAlchemy
Base = declarative_base()

# Metadata para migrations
metadata = MetaData()

# Engine síncrono para desenvolvimento
engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True
)

# Engine assíncrono para produção
async_engine = create_async_engine(
    settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://"),
    echo=settings.DEBUG,
    pool_pre_ping=True
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Async session factory
AsyncSessionLocal = sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False
)


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency para obter sessão assíncrona da base de dados"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            logger.error("Erro na sessão da base de dados", error=str(e))
            raise
        finally:
            await session.close()


def get_sync_session():
    """Dependency para obter sessão síncrona da base de dados"""
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        db.rollback()
        logger.error("Erro na sessão da base de dados", error=str(e))
        raise
    finally:
        db.close()


async def init_db():
    """Inicializar base de dados"""
    try:
        # Importar todos os modelos para garantir que são registados
        from app.models import user, tenant, game, signal, model, dataset, audit_log, alert
        
        # Criar todas as tabelas
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        logger.info("Base de dados inicializada com sucesso")
        
    except Exception as e:
        logger.error("Erro ao inicializar base de dados", error=str(e))
        raise


async def close_db():
    """Fechar conexões da base de dados"""
    await async_engine.dispose()
    engine.dispose()
    logger.info("Conexões da base de dados fechadas")

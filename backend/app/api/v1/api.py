"""
Router principal da API v1 para Alert@Postas V3
"""

from fastapi import APIRouter

from app.api.v1.endpoints import bot, games, signals, models, metrics, auth, users

api_router = APIRouter()

# Incluir todos os routers
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(bot.router, prefix="/bot", tags=["bot"])
api_router.include_router(games.router, prefix="/games", tags=["games"])
api_router.include_router(signals.router, prefix="/signals", tags=["signals"])
api_router.include_router(models.router, prefix="/models", tags=["models"])
api_router.include_router(metrics.router, prefix="/metrics", tags=["metrics"])

"""
Endpoints para gestão de jogos
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
from datetime import datetime

from app.core.database import get_async_session
from app.core.logging import get_logger
from app.core.auth import get_current_user
from app.models.user import User
from app.services.game_service import GameService
from app.schemas.game import GameResponse, GameListResponse, GameUpdate

router = APIRouter()
logger = get_logger("games_api")


@router.get("", response_model=GameListResponse)
async def get_games(
    live: Optional[bool] = Query(None, description="Filtrar jogos ao vivo"),
    league: Optional[str] = Query(None, description="Filtrar por liga"),
    include_analysis: Optional[bool] = Query(None, description="Filtrar por análise incluída"),
    limit: int = Query(100, ge=1, le=1000, description="Limite de resultados"),
    offset: int = Query(0, ge=0, description="Offset para paginação"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Obter lista de jogos"""
    try:
        game_service = GameService(db)
        
        filters = {
            "live": live,
            "league": league,
            "include_analysis": include_analysis
        }
        
        games, total = await game_service.get_games(
            filters=filters,
            limit=limit,
            offset=offset
        )
        
        logger.info(
            "Jogos obtidos",
            user_id=current_user.id,
            count=len(games),
            total=total,
            filters=filters
        )
        
        return GameListResponse(
            games=games,
            total=total,
            limit=limit,
            offset=offset
        )
        
    except Exception as e:
        logger.error("Erro ao obter jogos", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao obter jogos"
        )


@router.get("/{game_id}", response_model=GameResponse)
async def get_game(
    game_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Obter jogo específico"""
    try:
        game_service = GameService(db)
        game = await game_service.get_game_by_id(game_id)
        
        if not game:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Jogo não encontrado"
            )
        
        logger.info("Jogo obtido", user_id=current_user.id, game_id=game_id)
        return game
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erro ao obter jogo", game_id=game_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao obter jogo"
        )


@router.patch("/{game_id}", response_model=GameResponse)
async def update_game(
    game_id: int,
    game_update: GameUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Atualizar jogo"""
    try:
        game_service = GameService(db)
        game = await game_service.update_game(game_id, game_update.dict(exclude_unset=True))
        
        if not game:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Jogo não encontrado"
            )
        
        logger.info("Jogo atualizado", user_id=current_user.id, game_id=game_id, updates=game_update.dict())
        return game
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erro ao atualizar jogo", game_id=game_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao atualizar jogo"
        )


@router.patch("/{game_id}/toggle-analysis", response_model=GameResponse)
async def toggle_game_analysis(
    game_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Toggle para incluir/excluir jogo da análise"""
    try:
        game_service = GameService(db)
        game = await game_service.toggle_analysis(game_id)
        
        if not game:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Jogo não encontrado"
            )
        
        logger.info(
            "Análise do jogo alterada",
            user_id=current_user.id,
            game_id=game_id,
            include_analysis=game.include_for_analysis
        )
        
        return game
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erro ao alterar análise do jogo", game_id=game_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao alterar análise do jogo"
        )


@router.post("/{game_id}/refresh")
async def refresh_game_data(
    game_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Atualizar dados do jogo a partir da API externa"""
    try:
        game_service = GameService(db)
        success = await game_service.refresh_game_data(game_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Jogo não encontrado ou erro ao atualizar"
            )
        
        logger.info("Dados do jogo atualizados", user_id=current_user.id, game_id=game_id)
        
        return {"success": True, "message": "Dados do jogo atualizados com sucesso"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erro ao atualizar dados do jogo", game_id=game_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao atualizar dados do jogo"
        )


@router.post("/bulk-toggle-analysis")
async def bulk_toggle_analysis(
    game_ids: List[int],
    include_analysis: bool,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Toggle em massa para análise de jogos"""
    try:
        game_service = GameService(db)
        updated_count = await game_service.bulk_toggle_analysis(game_ids, include_analysis)
        
        logger.info(
            "Análise em massa alterada",
            user_id=current_user.id,
            game_ids=game_ids,
            include_analysis=include_analysis,
            updated_count=updated_count
        )
        
        return {
            "success": True,
            "message": f"{updated_count} jogos atualizados",
            "updated_count": updated_count
        }
        
    except Exception as e:
        logger.error("Erro na atualização em massa", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro na atualização em massa"
        )


@router.get("/{game_id}/signals")
async def get_game_signals(
    game_id: int,
    limit: int = Query(50, ge=1, le=200, description="Limite de resultados"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Obter sinais de um jogo específico"""
    try:
        game_service = GameService(db)
        signals = await game_service.get_game_signals(game_id, limit=limit)
        
        logger.info("Sinais do jogo obtidos", user_id=current_user.id, game_id=game_id, count=len(signals))
        
        return {"signals": signals}
        
    except Exception as e:
        logger.error("Erro ao obter sinais do jogo", game_id=game_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao obter sinais do jogo"
        )

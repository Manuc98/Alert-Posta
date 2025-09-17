"""
Serviço para gestão de jogos
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload

from app.core.logging import get_logger
from app.core.cache import cache_manager
from app.core.exceptions import GameNotFoundException
from app.models.game import Game
from app.schemas.game import GameResponse, GameFilters

logger = get_logger("game_service")


class GameService:
    """Serviço para gestão de jogos"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.cache = cache_manager
    
    async def get_games(
        self,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 100,
        offset: int = 0
    ) -> Tuple[List[GameResponse], int]:
        """Obter lista de jogos com filtros"""
        try:
            # Construir query base
            query = select(Game)
            count_query = select(func.count(Game.id))
            
            # Aplicar filtros
            conditions = []
            
            if filters:
                if filters.get("live") is not None:
                    if filters["live"]:
                        conditions.append(Game.status == "live")
                    else:
                        conditions.append(Game.status != "live")
                
                if filters.get("league"):
                    conditions.append(Game.league_id == filters["league"])
                
                if filters.get("include_analysis") is not None:
                    conditions.append(Game.include_for_analysis == filters["include_analysis"])
                
                if filters.get("status"):
                    conditions.append(Game.status == filters["status"])
                
                if filters.get("date_from"):
                    conditions.append(Game.start_time >= filters["date_from"])
                
                if filters.get("date_to"):
                    conditions.append(Game.start_time <= filters["date_to"])
            
            if conditions:
                query = query.where(and_(*conditions))
                count_query = count_query.where(and_(*conditions))
            
            # Aplicar ordenação e paginação
            query = query.order_by(Game.start_time.desc()).offset(offset).limit(limit)
            
            # Executar queries
            result = await self.db.execute(query)
            games = result.scalars().all()
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()
            
            # Converter para response
            game_responses = [self._game_to_response(game) for game in games]
            
            logger.info("Jogos obtidos", count=len(games), total=total, filters=filters)
            
            return game_responses, total
            
        except Exception as e:
            logger.error("Erro ao obter jogos", error=str(e))
            raise
    
    async def get_game_by_id(self, game_id: int) -> Optional[GameResponse]:
        """Obter jogo por ID"""
        try:
            # Verificar cache primeiro
            cache_key = f"game:{game_id}"
            cached_game = await self.cache.get(cache_key)
            if cached_game:
                return GameResponse(**cached_game)
            
            # Obter da base de dados
            result = await self.db.execute(
                select(Game).where(Game.id == game_id)
            )
            game = result.scalar_one_or_none()
            
            if not game:
                return None
            
            # Converter para response
            game_response = self._game_to_response(game)
            
            # Cache por 5 minutos
            await self.cache.set(cache_key, game_response.dict(), ttl=300)
            
            logger.info("Jogo obtido", game_id=game_id)
            return game_response
            
        except Exception as e:
            logger.error("Erro ao obter jogo", game_id=game_id, error=str(e))
            raise
    
    async def update_game(self, game_id: int, updates: Dict[str, Any]) -> Optional[GameResponse]:
        """Atualizar jogo"""
        try:
            # Obter jogo
            result = await self.db.execute(
                select(Game).where(Game.id == game_id)
            )
            game = result.scalar_one_or_none()
            
            if not game:
                raise GameNotFoundException(str(game_id))
            
            # Aplicar atualizações
            for key, value in updates.items():
                if hasattr(game, key):
                    setattr(game, key, value)
            
            # Salvar
            await self.db.commit()
            await self.db.refresh(game)
            
            # Invalidar cache
            await self.cache.delete(f"game:{game_id}")
            
            logger.info("Jogo atualizado", game_id=game_id, updates=list(updates.keys()))
            
            return self._game_to_response(game)
            
        except GameNotFoundException:
            raise
        except Exception as e:
            logger.error("Erro ao atualizar jogo", game_id=game_id, error=str(e))
            await self.db.rollback()
            raise
    
    async def toggle_analysis(self, game_id: int) -> Optional[GameResponse]:
        """Toggle para incluir/excluir da análise"""
        try:
            # Obter jogo
            result = await self.db.execute(
                select(Game).where(Game.id == game_id)
            )
            game = result.scalar_one_or_none()
            
            if not game:
                raise GameNotFoundException(str(game_id))
            
            # Toggle
            game.include_for_analysis = not game.include_for_analysis
            
            # Salvar
            await self.db.commit()
            await self.db.refresh(game)
            
            # Invalidar cache
            await self.cache.delete(f"game:{game_id}")
            
            logger.info("Análise do jogo alterada", game_id=game_id, include_analysis=game.include_for_analysis)
            
            return self._game_to_response(game)
            
        except GameNotFoundException:
            raise
        except Exception as e:
            logger.error("Erro ao alterar análise do jogo", game_id=game_id, error=str(e))
            await self.db.rollback()
            raise
    
    async def bulk_toggle_analysis(self, game_ids: List[int], include_analysis: bool) -> int:
        """Toggle em massa para análise"""
        try:
            # Atualizar em massa
            result = await self.db.execute(
                select(Game).where(Game.id.in_(game_ids))
            )
            games = result.scalars().all()
            
            updated_count = 0
            for game in games:
                if game.include_for_analysis != include_analysis:
                    game.include_for_analysis = include_analysis
                    updated_count += 1
            
            # Salvar
            await self.db.commit()
            
            # Invalidar cache dos jogos afetados
            for game_id in game_ids:
                await self.cache.delete(f"game:{game_id}")
            
            logger.info("Análise em massa alterada", game_ids=game_ids, include_analysis=include_analysis, updated_count=updated_count)
            
            return updated_count
            
        except Exception as e:
            logger.error("Erro na atualização em massa", error=str(e))
            await self.db.rollback()
            raise
    
    async def refresh_game_data(self, game_id: int) -> bool:
        """Atualizar dados do jogo a partir da API externa"""
        try:
            # Obter jogo
            result = await self.db.execute(
                select(Game).where(Game.id == game_id)
            )
            game = result.scalar_one_or_none()
            
            if not game:
                return False
            
            # Aqui seria feita a chamada à API Football
            # Por agora, vamos simular uma atualização
            
            # Invalidar cache
            await self.cache.delete(f"game:{game_id}")
            
            logger.info("Dados do jogo atualizados", game_id=game_id)
            
            return True
            
        except Exception as e:
            logger.error("Erro ao atualizar dados do jogo", game_id=game_id, error=str(e))
            return False
    
    async def get_game_signals(self, game_id: int, limit: int = 50) -> List[Dict[str, Any]]:
        """Obter sinais de um jogo"""
        try:
            # Verificar se o jogo existe
            result = await self.db.execute(
                select(Game).where(Game.id == game_id)
            )
            game = result.scalar_one_or_none()
            
            if not game:
                return []
            
            # Aqui seria feita a query para obter os sinais
            # Por agora, retornamos uma lista vazia
            
            logger.info("Sinais do jogo obtidos", game_id=game_id, limit=limit)
            
            return []
            
        except Exception as e:
            logger.error("Erro ao obter sinais do jogo", game_id=game_id, error=str(e))
            return []
    
    def _game_to_response(self, game: Game) -> GameResponse:
        """Converter Game para GameResponse"""
        return GameResponse(
            id=game.id,
            external_id=game.external_id,
            league_id=game.league_id,
            season=game.season,
            home_team=game.home_team,
            away_team=game.away_team,
            league_name=game.league_name,
            start_time=game.start_time,
            status=game.status,
            minute=game.minute,
            odds_json=game.odds_json or {},
            implied_probabilities=game.implied_probabilities or {},
            include_for_analysis=game.include_for_analysis,
            meta_json=game.meta_json or {},
            home_score=game.home_score,
            away_score=game.away_score,
            result=game.result,
            created_at=game.created_at,
            updated_at=game.updated_at
        )

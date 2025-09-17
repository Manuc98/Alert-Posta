"""
Worker para buscar dados da API Football automaticamente
"""

import asyncio
import httpx
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import json

from app.core.logging import get_logger
from app.core.config import settings
from app.core.database import get_db_session
from app.models.game import Game
from app.models.signal import Signal
from app.workers.base import BaseWorker
from app.core.alerts import AlertType, AlertSeverity, alert_manager
from app.core.metrics import metrics_collector

logger = get_logger("football_api_worker")


class FootballAPIWorker(BaseWorker):
    """Worker para buscar dados da API Football"""
    
    def __init__(self):
        super().__init__("football_api", interval=300)  # 5 minutos
        self.api_key = settings.API_FOOTBALL_KEY
        self.base_url = "https://v3.football.api-sports.io"
        self.client = None
        self.leagues = [
            39,  # Premier League
            140, # La Liga
            78,  # Bundesliga
            61,  # Ligue 1
            135, # Serie A
            88,  # Eredivisie
            94,  # Primeira Liga
            203, # Super Lig
        ]
        
    async def _get_client(self) -> httpx.AsyncClient:
        """Obter cliente HTTP"""
        if self.client is None or self.client.is_closed:
            timeout = httpx.Timeout(30.0)
            headers = {
                "X-RapidAPI-Key": self.api_key,
                "X-RapidAPI-Host": "v3.football.api-sports.io"
            }
            self.client = httpx.AsyncClient(timeout=timeout, headers=headers)
        return self.client
    
    async def _fetch_fixtures(self, league_id: int, date: str = None) -> List[Dict[str, Any]]:
        """Buscar jogos de uma liga"""
        try:
            client = await self._get_client()
            
            params = {
                "league": league_id,
                "season": 2024,
                "timezone": "Europe/Lisbon"
            }
            
            if date:
                params["date"] = date
            
            response = await client.get(f"{self.base_url}/fixtures", params=params)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("response"):
                    logger.info(f"Jogos obtidos para liga {league_id}: {len(data['response'])}")
                    return data["response"]
                else:
                    logger.warning(f"Nenhum jogo encontrado para liga {league_id}")
                    return []
            else:
                logger.error(f"Erro API Football: {response.status_code} - {response.text}")
                return []
                
        except Exception as e:
            logger.error(f"Erro ao buscar jogos da liga {league_id}: {str(e)}")
            return []
    
    async def _fetch_odds(self, fixture_id: int) -> Dict[str, Any]:
        """Buscar odds de um jogo"""
        try:
            client = await self._get_client()
            
            params = {
                "fixture": fixture_id
            }
            
            response = await client.get(f"{self.base_url}/odds", params=params)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("response"):
                    return data["response"][0] if data["response"] else {}
                else:
                    return {}
            else:
                logger.error(f"Erro ao buscar odds: {response.status_code}")
                return {}
                
        except Exception as e:
            logger.error(f"Erro ao buscar odds do jogo {fixture_id}: {str(e)}")
            return {}
    
    async def _process_fixture(self, fixture: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Processar um jogo e salvar na base de dados"""
        try:
            fixture_id = fixture["fixture"]["id"]
            home_team = fixture["teams"]["home"]["name"]
            away_team = fixture["teams"]["away"]["name"]
            league_name = fixture["league"]["name"]
            league_id = fixture["league"]["id"]
            
            # Converter timestamp para datetime
            fixture_date = datetime.fromtimestamp(fixture["fixture"]["timestamp"])
            
            # Buscar odds
            odds_data = await self._fetch_odds(fixture_id)
            
            # Preparar dados do jogo
            game_data = {
                "id": str(fixture_id),
                "league": league_name,
                "league_id": league_id,
                "home_team": home_team,
                "away_team": away_team,
                "start_time": fixture_date,
                "status": fixture["fixture"]["status"]["short"],
                "odds_json": self._extract_odds(odds_data),
                "include_for_analysis": self._should_include_game(fixture),
                "meta_json": {
                    "fixture_data": fixture,
                    "odds_data": odds_data,
                    "last_updated": datetime.utcnow().isoformat()
                }
            }
            
            # Salvar/atualizar na base de dados
            async with get_db_session() as db:
                existing_game = await db.query(Game).filter(Game.id == str(fixture_id)).first()
                
                if existing_game:
                    # Atualizar jogo existente
                    for key, value in game_data.items():
                        if key != "id":
                            setattr(existing_game, key, value)
                    existing_game.updated_at = datetime.utcnow()
                else:
                    # Criar novo jogo
                    new_game = Game(**game_data)
                    db.add(new_game)
                
                await db.commit()
                
                logger.debug(f"Jogo processado: {home_team} vs {away_team}")
                return game_data
                
        except Exception as e:
            logger.error(f"Erro ao processar jogo: {str(e)}")
            return None
    
    def _extract_odds(self, odds_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extrair odds relevantes dos dados da API"""
        try:
            if not odds_data or "bookmakers" not in odds_data:
                return {}
            
            bookmaker = odds_data["bookmakers"][0] if odds_data["bookmakers"] else {}
            if "bets" not in bookmaker:
                return {}
            
            extracted_odds = {}
            
            for bet in bookmaker["bets"]:
                bet_type = bet.get("name", "")
                
                if bet_type == "Match Winner":
                    # Odds 1X2
                    for outcome in bet.get("values", []):
                        extracted_odds[f"winner_{outcome.get('value', '').lower()}"] = outcome.get("odd", 0)
                
                elif bet_type == "Goals Over/Under":
                    # Odds Over/Under
                    for outcome in bet.get("values", []):
                        if "Over" in outcome.get("value", ""):
                            extracted_odds["over_goals"] = outcome.get("odd", 0)
                        elif "Under" in outcome.get("value", ""):
                            extracted_odds["under_goals"] = outcome.get("odd", 0)
                
                elif bet_type == "Both Teams Score":
                    # BTTS
                    for outcome in bet.get("values", []):
                        if "Yes" in outcome.get("value", ""):
                            extracted_odds["btts_yes"] = outcome.get("odd", 0)
                        elif "No" in outcome.get("value", ""):
                            extracted_odds["btts_no"] = outcome.get("odd", 0)
            
            return extracted_odds
            
        except Exception as e:
            logger.error(f"Erro ao extrair odds: {str(e)}")
            return {}
    
    def _should_include_game(self, fixture: Dict[str, Any]) -> bool:
        """Determinar se o jogo deve ser incluído na análise"""
        try:
            # Incluir jogos que:
            # 1. Ainda não começaram (NS - Not Started)
            # 2. Estão em andamento (1H, 2H, HT)
            # 3. São de ligas importantes
            
            status = fixture["fixture"]["status"]["short"]
            league_id = fixture["league"]["id"]
            
            valid_statuses = ["NS", "1H", "2H", "HT"]
            important_leagues = [39, 140, 78, 61, 135]  # Top 5 ligas
            
            return status in valid_statuses and league_id in important_leagues
            
        except Exception as e:
            logger.error(f"Erro ao determinar se incluir jogo: {str(e)}")
            return False
    
    async def work(self) -> Dict[str, Any]:
        """Método principal de trabalho"""
        try:
            logger.info("Iniciando busca de dados da API Football")
            
            total_games = 0
            processed_games = 0
            errors = 0
            
            # Buscar jogos para hoje e próximos 3 dias
            dates_to_check = [
                datetime.now().strftime("%Y-%m-%d"),
                (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d"),
                (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d"),
                (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")
            ]
            
            for date in dates_to_check:
                for league_id in self.leagues:
                    try:
                        # Buscar jogos da liga
                        fixtures = await self._fetch_fixtures(league_id, date)
                        total_games += len(fixtures)
                        
                        # Processar cada jogo
                        for fixture in fixtures:
                            try:
                                result = await self._process_fixture(fixture)
                                if result:
                                    processed_games += 1
                                else:
                                    errors += 1
                                
                                # Pequeno delay para não sobrecarregar a API
                                await asyncio.sleep(0.1)
                                
                            except Exception as e:
                                logger.error(f"Erro ao processar jogo individual: {str(e)}")
                                errors += 1
                        
                        # Delay entre ligas
                        await asyncio.sleep(0.5)
                        
                    except Exception as e:
                        logger.error(f"Erro ao processar liga {league_id}: {str(e)}")
                        errors += 1
            
            # Atualizar métricas
            metrics_collector.update_active_games(processed_games)
            metrics_collector.increment_games_analyzed("api_football", "processed")
            
            result = {
                "total_games_found": total_games,
                "games_processed": processed_games,
                "errors": errors,
                "success_rate": (processed_games / total_games * 100) if total_games > 0 else 0,
                "leagues_checked": len(self.leagues),
                "dates_checked": len(dates_to_check)
            }
            
            logger.info(f"Busca da API Football concluída: {result}")
            
            # Alertar se taxa de erro for muito alta
            if errors > 0 and (errors / total_games) > 0.1:
                alert_manager.create_alert(
                    alert_type=AlertType.API,
                    severity=AlertSeverity.MEDIUM,
                    title="Alta Taxa de Erro na API Football",
                    message=f"Taxa de erro: {errors/total_games:.1%} ({errors}/{total_games} jogos)",
                    source="football_api_worker"
                )
            
            return result
            
        except Exception as e:
            logger.error(f"Erro no worker da API Football: {str(e)}")
            
            # Criar alerta de erro crítico
            alert_manager.create_alert(
                alert_type=AlertType.API,
                severity=AlertSeverity.CRITICAL,
                title="Falha Crítica na API Football",
                message=f"Worker da API Football falhou: {str(e)}",
                source="football_api_worker"
            )
            
            raise
    
    async def close(self):
        """Fechar recursos do worker"""
        if self.client and not self.client.is_closed:
            await self.client.aclose()
        await super().stop()

"""
Schemas Pydantic para Games
"""

from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime


class GameResponse(BaseModel):
    """Resposta de jogo"""
    id: int
    external_id: str
    league_id: str
    season: str
    home_team: str
    away_team: str
    league_name: str
    start_time: datetime
    status: str
    minute: Optional[int] = None
    odds_json: Dict[str, Any] = Field(default_factory=dict)
    implied_probabilities: Dict[str, Any] = Field(default_factory=dict)
    include_for_analysis: bool
    meta_json: Dict[str, Any] = Field(default_factory=dict)
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    result: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    @property
    def display_name(self) -> str:
        return f"{self.home_team} vs {self.away_team}"
    
    @property
    def is_live(self) -> bool:
        return self.status == "live"
    
    @property
    def is_finished(self) -> bool:
        return self.status == "finished"
    
    @property
    def is_upcoming(self) -> bool:
        return self.status == "scheduled"


class GameUpdate(BaseModel):
    """Atualização de jogo"""
    include_for_analysis: Optional[bool] = None
    odds_json: Optional[Dict[str, Any]] = None
    meta_json: Optional[Dict[str, Any]] = None
    status: Optional[str] = None
    minute: Optional[int] = None
    home_score: Optional[int] = None
    away_score: Optional[int] = None


class GameListResponse(BaseModel):
    """Resposta de lista de jogos"""
    games: List[GameResponse]
    total: int
    limit: int
    offset: int


class GameFilters(BaseModel):
    """Filtros para jogos"""
    live: Optional[bool] = None
    league: Optional[str] = None
    include_analysis: Optional[bool] = None
    status: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None

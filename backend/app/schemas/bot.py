"""
Schemas Pydantic para Bot
"""

from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime
from enum import Enum


class BotStatusEnum(str, Enum):
    """Status do bot"""
    RUNNING = "running"
    STOPPED = "stopped"
    ERROR = "error"
    STARTING = "starting"
    STOPPING = "stopping"


class ModuleStatusEnum(str, Enum):
    """Status dos módulos"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    LOADING = "loading"


class ModuleInfo(BaseModel):
    """Informação de um módulo"""
    name: str
    status: ModuleStatusEnum
    uptime: Optional[int] = None  # segundos
    last_error: Optional[str] = None
    metrics: Dict[str, Any] = Field(default_factory=dict)


class BotStatus(BaseModel):
    """Status do bot"""
    status: BotStatusEnum
    uptime: Optional[int] = None  # segundos desde o último start
    modules: List[ModuleInfo] = Field(default_factory=list)
    last_restart: Optional[datetime] = None
    version: str = "3.0.0"


class BotControlResponse(BaseModel):
    """Resposta de controlo do bot"""
    success: bool
    message: str
    new_status: BotStatusEnum
    timestamp: datetime = Field(default_factory=datetime.utcnow)

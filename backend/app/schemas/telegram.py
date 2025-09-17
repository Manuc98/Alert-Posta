"""
Schemas para integração com Telegram - Alert@Postas
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class TelegramTestResponse(BaseModel):
    """Resposta do teste de conexão Telegram"""
    success: bool
    bot_info: Optional[Dict[str, Any]] = None
    test_message_sent: bool = False
    error: Optional[str] = None


class TelegramSignalRequest(BaseModel):
    """Request para enviar sinal via Telegram"""
    signal_data: Dict[str, Any] = Field(
        ...,
        description="Dados completos do sinal a ser enviado"
    )


class TelegramSignalResponse(BaseModel):
    """Resposta do envio de sinal via Telegram"""
    success: bool
    message_id: Optional[str] = None
    sent_at: Optional[str] = None
    error: Optional[str] = None


class TelegramTemplateUpdate(BaseModel):
    """Request para atualizar template do Telegram"""
    template: str = Field(
        ...,
        description="Novo template customizável",
        min_length=10,
        max_length=4000
    )


class TelegramTemplateResponse(BaseModel):
    """Resposta da atualização de template"""
    success: bool
    message: str
    template_type: str


class TelegramHistoryResponse(BaseModel):
    """Resposta do histórico de mensagens"""
    success: bool
    history: Dict[str, Any]
    total_messages: int


class TelegramBulkRequest(BaseModel):
    """Request para envio em massa"""
    messages: List[str] = Field(
        ...,
        description="Lista de mensagens para enviar",
        min_items=1,
        max_items=10
    )


class TelegramBulkResponse(BaseModel):
    """Resposta do envio em massa"""
    success: bool
    total_sent: int
    total_attempted: int
    results: List[Dict[str, Any]]


class TelegramStatusRequest(BaseModel):
    """Request para envio de status"""
    status: str = Field(
        ...,
        description="Status do bot (running, stopped, error, starting, stopping)"
    )
    details: Optional[str] = Field(
        None,
        description="Detalhes adicionais do status"
    )


class TelegramErrorRequest(BaseModel):
    """Request para envio de notificação de erro"""
    error_type: str = Field(
        ...,
        description="Tipo do erro"
    )
    error_message: str = Field(
        ...,
        description="Mensagem de erro"
    )
    module: Optional[str] = Field(
        None,
        description="Módulo onde ocorreu o erro"
    )


class TelegramDailyStatsRequest(BaseModel):
    """Request para envio de resumo diário"""
    total_signals: int = Field(default=0, description="Total de sinais hoje")
    sent_signals: int = Field(default=0, description="Sinais enviados")
    successful_signals: int = Field(default=0, description="Sinais com acerto")
    failed_signals: int = Field(default=0, description="Sinais com erro")
    accuracy_rate: float = Field(default=0.0, description="Taxa de acerto (%)")
    estimated_roi: float = Field(default=0.0, description="ROI estimado (%)")
    best_model: str = Field(default="N/A", description="Melhor modelo do dia")
    games_analyzed: int = Field(default=0, description="Jogos analisados")


class TelegramMessageTemplate(BaseModel):
    """Template de mensagem customizável"""
    template_type: str = Field(
        ...,
        description="Tipo do template (signal, result, summary)"
    )
    template_content: str = Field(
        ...,
        description="Conteúdo do template com variáveis {variable}"
    )
    variables: List[str] = Field(
        ...,
        description="Lista de variáveis disponíveis no template"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class TelegramBotInfo(BaseModel):
    """Informações do bot Telegram"""
    id: int
    is_bot: bool
    first_name: str
    username: Optional[str] = None
    can_join_groups: bool = False
    can_read_all_group_messages: bool = False
    supports_inline_queries: bool = False


class TelegramConnectionStatus(BaseModel):
    """Status da conexão com Telegram"""
    connected: bool
    bot_info: Optional[TelegramBotInfo] = None
    last_test: Optional[datetime] = None
    error_message: Optional[str] = None
    rate_limit_remaining: Optional[int] = None


class TelegramMessageHistory(BaseModel):
    """Histórico de mensagem individual"""
    message_id: str
    signal_data: Dict[str, Any]
    result_data: Optional[Dict[str, Any]] = None
    sent_at: datetime
    updated_at: Optional[datetime] = None
    message_type: str = Field(default="signal")


class TelegramAnalytics(BaseModel):
    """Analytics das mensagens Telegram"""
    total_messages_sent: int = 0
    successful_messages: int = 0
    failed_messages: int = 0
    success_rate: float = 0.0
    messages_today: int = 0
    messages_this_week: int = 0
    messages_this_month: int = 0
    average_response_time: float = 0.0
    last_message_sent: Optional[datetime] = None


class TelegramConfig(BaseModel):
    """Configuração do Telegram"""
    bot_token: str = Field(..., description="Token do bot Telegram")
    chat_id: str = Field(..., description="ID do chat/grupo")
    enabled: bool = Field(default=True, description="Se Telegram está habilitado")
    rate_limit_per_minute: int = Field(default=20, description="Limite de mensagens por minuto")
    auto_retry: bool = Field(default=True, description="Tentar reenviar em caso de erro")
    max_retries: int = Field(default=3, description="Máximo de tentativas")
    retry_delay: int = Field(default=5, description="Delay entre tentativas (segundos)")
    templates: Dict[str, str] = Field(default_factory=dict, description="Templates customizados")

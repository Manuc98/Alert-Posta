"""
Exceções customizadas para Alert@Postas V3
"""

from typing import Any, Dict, Optional


class AlertPostasException(Exception):
    """Exceção base para Alert@Postas"""
    
    def __init__(
        self,
        message: str,
        module: str = "main",
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.module = module
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class DatabaseException(AlertPostasException):
    """Exceções relacionadas com base de dados"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            module="database",
            status_code=500,
            details=details
        )


class AuthenticationException(AlertPostasException):
    """Exceções de autenticação"""
    
    def __init__(self, message: str = "Credenciais inválidas", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            module="auth",
            status_code=401,
            details=details
        )


class AuthorizationException(AlertPostasException):
    """Exceções de autorização"""
    
    def __init__(self, message: str = "Acesso negado", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            module="auth",
            status_code=403,
            details=details
        )


class ValidationException(AlertPostasException):
    """Exceções de validação"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            module="validation",
            status_code=422,
            details=details
        )


class ExternalAPIException(AlertPostasException):
    """Exceções de APIs externas"""
    
    def __init__(self, message: str, api_name: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=f"Erro na API {api_name}: {message}",
            module="external_api",
            status_code=502,
            details=details
        )


class MLModelException(AlertPostasException):
    """Exceções de modelos ML"""
    
    def __init__(self, message: str, model_name: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=f"Erro no modelo {model_name}: {message}",
            module="ml_model",
            status_code=500,
            details=details
        )


class TelegramException(AlertPostasException):
    """Exceções do Telegram"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=f"Erro Telegram: {message}",
            module="telegram",
            status_code=502,
            details=details
        )


class GameNotFoundException(AlertPostasException):
    """Jogo não encontrado"""
    
    def __init__(self, game_id: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=f"Jogo {game_id} não encontrado",
            module="games",
            status_code=404,
            details=details
        )


class SignalNotFoundException(AlertPostasException):
    """Sinal não encontrado"""
    
    def __init__(self, signal_id: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=f"Sinal {signal_id} não encontrado",
            module="signals",
            status_code=404,
            details=details
        )


class ModelNotFoundException(AlertPostasException):
    """Modelo não encontrado"""
    
    def __init__(self, model_id: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=f"Modelo {model_id} não encontrado",
            module="models",
            status_code=404,
            details=details
        )

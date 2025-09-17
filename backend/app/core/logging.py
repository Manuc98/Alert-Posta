"""
Sistema de logging estruturado para Alert@Postas V3
Formato: YYYY-MM-DD HH:MM:SS [LEVEL] (betbot) | [module]
"""

import logging
import sys
from datetime import datetime
import structlog
from structlog.stdlib import LoggerFactory
import colorama
from colorama import Fore, Style

# Inicializar colorama para Windows
colorama.init()


class ColoredFormatter(logging.Formatter):
    """Formatter com cores para diferentes níveis de log"""
    
    COLORS = {
        'DEBUG': Fore.CYAN,
        'INFO': Fore.GREEN,
        'WARNING': Fore.YELLOW,
        'ERROR': Fore.RED,
        'CRITICAL': Fore.RED + Style.BRIGHT,
    }
    
    def format(self, record):
        # Adicionar cor baseada no nível
        color = self.COLORS.get(record.levelname, '')
        record.levelname = f"{color}{record.levelname}{Style.RESET_ALL}"
        
        # Formatar mensagem com cor
        if hasattr(record, 'module'):
            record.msg = f"{color}(betbot) | [{record.module}] {record.msg}{Style.RESET_ALL}"
        else:
            record.msg = f"{color}(betbot) | {record.msg}{Style.RESET_ALL}"
        
        return super().format(record)


def setup_logging():
    """Configurar sistema de logging estruturado"""
    
    # Configurar structlog
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer() if sys.stdout.isatty() is False else structlog.dev.ConsoleRenderer(colors=True)
        ],
        context_class=dict,
        logger_factory=LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
    
    # Configurar logging padrão
    logging.basicConfig(
        format="%(asctime)s [%(levelname)s] %(message)s",
        level=logging.INFO,
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    # Formatter customizado com cores
    colored_formatter = ColoredFormatter(
        fmt="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    
    # Aplicar formatter aos handlers
    for handler in logging.getLogger().handlers:
        handler.setFormatter(colored_formatter)
    
    # Configurar nível de log por módulo
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)


def get_logger(module: str = "main"):
    """Obter logger estruturado para um módulo específico"""
    return structlog.get_logger("betbot").bind(module=module)


class LoggerMixin:
    """Mixin para adicionar logging a classes"""
    
    @property
    def logger(self):
        module_name = self.__class__.__module__.split('.')[-1]
        return get_logger(module_name)

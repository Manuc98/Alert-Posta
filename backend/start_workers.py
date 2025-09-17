#!/usr/bin/env python3
"""
Script para iniciar workers independentemente
"""

import asyncio
import signal
import sys
from app.workers.worker_manager import worker_manager
from app.core.logging import setup_logging, get_logger

# Configurar logging
setup_logging()
logger = get_logger("start_workers")


async def main():
    """Função principal"""
    logger.info("Iniciando workers Alert@Postas")
    
    try:
        # Iniciar todos os workers
        await worker_manager.start_all()
        
    except KeyboardInterrupt:
        logger.info("Interrupção recebida, parando workers...")
    except Exception as e:
        logger.error(f"Erro ao executar workers: {str(e)}")
    finally:
        logger.info("Encerrando workers...")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Workers encerrados pelo utilizador")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Erro fatal: {str(e)}")
        sys.exit(1)

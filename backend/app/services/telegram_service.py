"""
Serviço para integração com Telegram
"""

import asyncio
from typing import Dict, Any, Optional
import httpx
from datetime import datetime

from app.core.config import settings
from app.core.logging import get_logger
from app.core.exceptions import TelegramException

logger = get_logger("telegram_service")


class TelegramService:
    """Serviço para integração com Telegram"""
    
    def __init__(self):
        self.bot_token = settings.TELEGRAM_BOT_TOKEN
        self.chat_id = settings.TELEGRAM_CHAT_ID
        self.base_url = f"https://api.telegram.org/bot{self.bot_token}"
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def send_signal(self, message: str, signal_data: Any = None) -> Dict[str, Any]:
        """Enviar sinal para o Telegram"""
        try:
            # Preparar payload
            payload = {
                "chat_id": self.chat_id,
                "text": message,
                "parse_mode": "Markdown",
                "disable_web_page_preview": True
            }
            
            # Enviar mensagem
            response = await self.client.post(
                f"{self.base_url}/sendMessage",
                json=payload
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("ok"):
                    message_id = result["result"]["message_id"]
                    
                    logger.info("Mensagem enviada para Telegram", message_id=message_id)
                    
                    return {
                        "success": True,
                        "message_id": str(message_id),
                        "sent_at": datetime.utcnow().isoformat()
                    }
                else:
                    error_msg = result.get("description", "Erro desconhecido")
                    logger.error("Erro na API do Telegram", error=error_msg)
                    
                    return {
                        "success": False,
                        "error": error_msg
                    }
            else:
                logger.error("Erro HTTP ao enviar para Telegram", status_code=response.status_code)
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}"
                }
                
        except Exception as e:
            logger.error("Erro ao enviar mensagem para Telegram", error=str(e))
            return {
                "success": False,
                "error": str(e)
            }
    
    async def edit_message(self, message_id: str, new_text: str) -> Dict[str, Any]:
        """Editar mensagem existente no Telegram"""
        try:
            payload = {
                "chat_id": self.chat_id,
                "message_id": int(message_id),
                "text": new_text,
                "parse_mode": "Markdown",
                "disable_web_page_preview": True
            }
            
            response = await self.client.post(
                f"{self.base_url}/editMessageText",
                json=payload
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("ok"):
                    logger.info("Mensagem editada no Telegram", message_id=message_id)
                    
                    return {
                        "success": True,
                        "edited_at": datetime.utcnow().isoformat()
                    }
                else:
                    error_msg = result.get("description", "Erro desconhecido")
                    logger.error("Erro ao editar mensagem no Telegram", error=error_msg)
                    
                    return {
                        "success": False,
                        "error": error_msg
                    }
            else:
                logger.error("Erro HTTP ao editar mensagem no Telegram", status_code=response.status_code)
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}"
                }
                
        except Exception as e:
            logger.error("Erro ao editar mensagem no Telegram", error=str(e))
            return {
                "success": False,
                "error": str(e)
            }
    
    async def send_status_message(self, status: str, details: Optional[str] = None) -> Dict[str, Any]:
        """Enviar mensagem de status do bot"""
        try:
            emoji = {
                "running": "🟢",
                "stopped": "🔴",
                "error": "🟡",
                "starting": "🟡",
                "stopping": "🟡"
            }.get(status, "⚪")
            
            message = f"{emoji} **Alert@Postas Status**\n\nStatus: {status.title()}"
            
            if details:
                message += f"\nDetalhes: {details}"
            
            message += f"\n\n⏰ {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}"
            
            return await self.send_signal(message)
            
        except Exception as e:
            logger.error("Erro ao enviar mensagem de status", error=str(e))
            return {
                "success": False,
                "error": str(e)
            }
    
    async def send_error_notification(self, error_type: str, error_message: str, module: str = None) -> Dict[str, Any]:
        """Enviar notificação de erro"""
        try:
            message = f"🚨 **Erro Alert@Postas**\n\n"
            message += f"Tipo: {error_type}\n"
            
            if module:
                message += f"Módulo: {module}\n"
            
            message += f"Erro: {error_message}\n"
            message += f"\n⏰ {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}"
            
            return await self.send_signal(message)
            
        except Exception as e:
            logger.error("Erro ao enviar notificação de erro", error=str(e))
            return {
                "success": False,
                "error": str(e)
            }
    
    async def send_daily_summary(self, stats: Dict[str, Any]) -> Dict[str, Any]:
        """Enviar resumo diário"""
        try:
            message = f"📊 **Resumo Diário Alert@Postas**\n\n"
            
            message += f"🎯 Total de Sinais: {stats.get('total_signals', 0)}\n"
            message += f"📤 Enviados: {stats.get('sent_signals', 0)}\n"
            message += f"✅ Acertos: {stats.get('successful_signals', 0)}\n"
            message += f"❌ Erros: {stats.get('failed_signals', 0)}\n"
            message += f"📈 Taxa de Acerto: {stats.get('accuracy_rate', 0)}%\n"
            
            message += f"\n⏰ {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}"
            
            return await self.send_signal(message)
            
        except Exception as e:
            logger.error("Erro ao enviar resumo diário", error=str(e))
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_bot_info(self) -> Dict[str, Any]:
        """Obter informações do bot"""
        try:
            response = await self.client.get(f"{self.base_url}/getMe")
            
            if response.status_code == 200:
                result = response.json()
                if result.get("ok"):
                    return {
                        "success": True,
                        "bot_info": result["result"]
                    }
                else:
                    return {
                        "success": False,
                        "error": result.get("description", "Erro desconhecido")
                    }
            else:
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}"
                }
                
        except Exception as e:
            logger.error("Erro ao obter informações do bot", error=str(e))
            return {
                "success": False,
                "error": str(e)
            }
    
    async def test_connection(self) -> Dict[str, Any]:
        """Testar conexão com o Telegram"""
        try:
            # Tentar obter informações do bot
            bot_info = await self.get_bot_info()
            
            if bot_info["success"]:
                # Tentar enviar mensagem de teste
                test_message = "🧪 Teste de conexão Alert@Postas"
                test_result = await self.send_signal(test_message)
                
                return {
                    "success": test_result["success"],
                    "bot_info": bot_info["bot_info"],
                    "test_message_sent": test_result["success"],
                    "error": test_result.get("error") if not test_result["success"] else None
                }
            else:
                return {
                    "success": False,
                    "error": bot_info["error"]
                }
                
        except Exception as e:
            logger.error("Erro ao testar conexão com Telegram", error=str(e))
            return {
                "success": False,
                "error": str(e)
            }
    
    async def close(self):
        """Fechar cliente HTTP"""
        await self.client.aclose()

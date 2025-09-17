"""
Serviço para integração com Telegram - Alert@Postas
"""

import asyncio
import json
from typing import Dict, Any, Optional, List
import httpx
from datetime import datetime, timedelta
from enum import Enum

from app.core.config import settings
from app.core.logging import get_logger
from app.core.exceptions import TelegramException

logger = get_logger("telegram_service")


class SignalType(Enum):
    """Tipos de sinais disponíveis"""
    WINNER = "winner"
    NEXT_GOAL = "next_goal"
    OVER_UNDER = "over_under"
    MULTIPLE = "multiple"
    VALUE_BET = "value_bet"


class MessageTemplate:
    """Templates de mensagens customizáveis"""
    
    # Template base para sinais
    SIGNAL_TEMPLATE = """
🎯 **Alert@Postas - Sinal Detectado**

🏆 **{game}**
📊 **Tipo**: {signal_type}
🎲 **Predição**: {prediction}
📈 **Probabilidade**: {probability}%
💎 **Confiança**: {confidence}%
💰 **Odds**: {odds}

🔍 **Explicação**: {explanation}

⏰ **Horário**: {timestamp}
🤖 **Modelo**: {model_name}
"""

    # Template para resultado (hit/miss)
    RESULT_TEMPLATE = """
{emoji} **Resultado - {game}**

🎯 **Sinal**: {prediction}
📊 **Resultado**: {actual_result}
{hit_status}

📈 **Estatísticas**:
• Probabilidade: {probability}%
• Confiança: {confidence}%
• ROI: {roi}%

⏰ **Verificado em**: {timestamp}
"""

    # Template para resumo diário
    DAILY_SUMMARY_TEMPLATE = """
📊 **Resumo Diário Alert@Postas**

🎯 **Sinais Hoje**: {total_signals}
📤 **Enviados**: {sent_signals}
✅ **Acertos**: {successful_signals}
❌ **Erros**: {failed_signals}
📈 **Taxa de Acerto**: {accuracy_rate}%
💰 **ROI Estimado**: {estimated_roi}%

🏆 **Melhor Modelo**: {best_model}
📊 **Jogos Analisados**: {games_analyzed}

⏰ **Período**: {date}
"""


class TelegramService:
    """Serviço para integração com Telegram - Alert@Postas"""
    
    def __init__(self):
        self.bot_token = settings.TELEGRAM_BOT_TOKEN
        self.chat_id = settings.TELEGRAM_CHAT_ID
        self.base_url = f"https://api.telegram.org/bot{self.bot_token}"
        self.client = httpx.AsyncClient(timeout=30.0)
        self.message_history: Dict[str, Any] = {}
        self.custom_templates = self._load_custom_templates()
    
    def _load_custom_templates(self) -> Dict[str, str]:
        """Carregar templates customizados do banco de dados ou arquivo"""
        try:
            # Por enquanto usar templates padrão
            # TODO: Implementar carregamento do banco de dados
            return {
                "signal": MessageTemplate.SIGNAL_TEMPLATE,
                "result": MessageTemplate.RESULT_TEMPLATE,
                "summary": MessageTemplate.DAILY_SUMMARY_TEMPLATE
            }
        except Exception as e:
            logger.warning("Erro ao carregar templates customizados", error=str(e))
            return {
                "signal": MessageTemplate.SIGNAL_TEMPLATE,
                "result": MessageTemplate.RESULT_TEMPLATE,
                "summary": MessageTemplate.DAILY_SUMMARY_TEMPLATE
            }
    
    def format_signal_message(self, signal_data: Dict[str, Any]) -> str:
        """Formatar mensagem de sinal usando template customizável"""
        try:
            template = self.custom_templates.get("signal", MessageTemplate.SIGNAL_TEMPLATE)
            
            # Preparar dados para o template
            game_name = f"{signal_data.get('home_team', 'Time A')} vs {signal_data.get('away_team', 'Time B')}"
            
            # Mapear tipo de sinal para texto amigável
            signal_type_map = {
                SignalType.WINNER.value: "Vencedor (1X2)",
                SignalType.NEXT_GOAL.value: "Próximo Golo",
                SignalType.OVER_UNDER.value: "Over/Under",
                SignalType.MULTIPLE.value: "Múltipla",
                SignalType.VALUE_BET.value: "Value Bet"
            }
            
            signal_type_text = signal_type_map.get(signal_data.get('type', ''), signal_data.get('type', ''))
            
            # Formatação da probabilidade
            probability = signal_data.get('probability', 0)
            confidence = signal_data.get('confidence', 0)
            
            # Explicação baseada em SHAP se disponível
            explanation = "Análise baseada em dados históricos e estatísticas do jogo."
            if signal_data.get('explain_shap'):
                shap_data = signal_data.get('explain_shap', {})
                if isinstance(shap_data, dict) and shap_data.get('text'):
                    explanation = shap_data['text']
            
            # Formatar mensagem
            formatted_message = template.format(
                game=game_name,
                signal_type=signal_type_text,
                prediction=signal_data.get('prediction', 'N/A'),
                probability=f"{probability:.1f}",
                confidence=f"{confidence:.1f}",
                odds=signal_data.get('odds', 'N/A'),
                explanation=explanation,
                timestamp=datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'),
                model_name=signal_data.get('model_name', 'Alert@Postas ML')
            )
            
            return formatted_message
            
        except Exception as e:
            logger.error("Erro ao formatar mensagem de sinal", error=str(e))
            # Fallback para mensagem simples
            return f"🎯 Alert@Postas - Novo sinal detectado: {signal_data.get('prediction', 'N/A')}"
    
    def format_result_message(self, signal_data: Dict[str, Any], result_data: Dict[str, Any]) -> str:
        """Formatar mensagem de resultado (hit/miss)"""
        try:
            template = self.custom_templates.get("result", MessageTemplate.RESULT_TEMPLATE)
            
            # Determinar emoji e status
            hit = result_data.get('hit', False)
            emoji = "✅" if hit else "❌"
            hit_status = "🎉 **ACERTO!**" if hit else "😔 **Erro**"
            
            # Calcular ROI se disponível
            roi = result_data.get('roi', 0)
            roi_text = f"{roi:.2f}%" if roi != 0 else "N/A"
            
            game_name = f"{signal_data.get('home_team', 'Time A')} vs {signal_data.get('away_team', 'Time B')}"
            
            formatted_message = template.format(
                emoji=emoji,
                game=game_name,
                prediction=signal_data.get('prediction', 'N/A'),
                actual_result=result_data.get('actual_result', 'N/A'),
                hit_status=hit_status,
                probability=signal_data.get('probability', 0),
                confidence=signal_data.get('confidence', 0),
                roi=roi_text,
                timestamp=datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
            )
            
            return formatted_message
            
        except Exception as e:
            logger.error("Erro ao formatar mensagem de resultado", error=str(e))
            return f"🎯 Resultado: {'✅' if result_data.get('hit') else '❌'}"
    
    async def send_formatted_signal(self, signal_data: Dict[str, Any]) -> Dict[str, Any]:
        """Enviar sinal formatado com template customizável"""
        try:
            # Formatar mensagem
            formatted_message = self.format_signal_message(signal_data)
            
            # Enviar mensagem
            result = await self.send_signal(formatted_message, signal_data)
            
            if result.get('success'):
                # Armazenar histórico para possível edição posterior
                message_id = result.get('message_id')
                if message_id:
                    self.message_history[message_id] = {
                        'signal_data': signal_data,
                        'sent_at': datetime.utcnow(),
                        'type': 'signal'
                    }
            
            return result
            
        except Exception as e:
            logger.error("Erro ao enviar sinal formatado", error=str(e))
            return {
                "success": False,
                "error": str(e)
            }
    
    async def update_signal_result(self, message_id: str, signal_data: Dict[str, Any], result_data: Dict[str, Any]) -> Dict[str, Any]:
        """Atualizar mensagem de sinal com resultado"""
        try:
            if message_id not in self.message_history:
                logger.warning("Mensagem não encontrada no histórico", message_id=message_id)
                return {
                    "success": False,
                    "error": "Mensagem não encontrada no histórico"
                }
            
            # Formatar nova mensagem com resultado
            formatted_message = self.format_result_message(signal_data, result_data)
            
            # Editar mensagem existente
            result = await self.edit_message(message_id, formatted_message)
            
            if result.get('success'):
                # Atualizar histórico
                self.message_history[message_id]['result_data'] = result_data
                self.message_history[message_id]['updated_at'] = datetime.utcnow()
            
            return result
            
        except Exception as e:
            logger.error("Erro ao atualizar resultado do sinal", error=str(e))
            return {
                "success": False,
                "error": str(e)
            }
    
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
    
    async def send_daily_summary_formatted(self, stats: Dict[str, Any]) -> Dict[str, Any]:
        """Enviar resumo diário formatado"""
        try:
            template = self.custom_templates.get("summary", MessageTemplate.DAILY_SUMMARY_TEMPLATE)
            
            # Formatar mensagem
            formatted_message = template.format(
                total_signals=stats.get('total_signals', 0),
                sent_signals=stats.get('sent_signals', 0),
                successful_signals=stats.get('successful_signals', 0),
                failed_signals=stats.get('failed_signals', 0),
                accuracy_rate=stats.get('accuracy_rate', 0),
                estimated_roi=stats.get('estimated_roi', 0),
                best_model=stats.get('best_model', 'N/A'),
                games_analyzed=stats.get('games_analyzed', 0),
                date=datetime.utcnow().strftime('%Y-%m-%d')
            )
            
            return await self.send_signal(formatted_message)
            
        except Exception as e:
            logger.error("Erro ao enviar resumo diário formatado", error=str(e))
            return {
                "success": False,
                "error": str(e)
            }
    
    async def update_custom_template(self, template_type: str, new_template: str) -> Dict[str, Any]:
        """Atualizar template customizável"""
        try:
            if template_type not in ["signal", "result", "summary"]:
                return {
                    "success": False,
                    "error": "Tipo de template inválido"
                }
            
            # Validar template (verificar se tem as variáveis necessárias)
            if not self._validate_template(template_type, new_template):
                return {
                    "success": False,
                    "error": "Template inválido - variáveis obrigatórias em falta"
                }
            
            # Atualizar template
            self.custom_templates[template_type] = new_template
            
            # TODO: Salvar no banco de dados
            # await self._save_templates_to_db()
            
            logger.info("Template customizado atualizado", template_type=template_type)
            
            return {
                "success": True,
                "message": f"Template {template_type} atualizado com sucesso"
            }
            
        except Exception as e:
            logger.error("Erro ao atualizar template customizado", error=str(e))
            return {
                "success": False,
                "error": str(e)
            }
    
    def _validate_template(self, template_type: str, template: str) -> bool:
        """Validar se template tem variáveis obrigatórias"""
        try:
            required_vars = {
                "signal": ["game", "signal_type", "prediction", "probability", "confidence", "odds"],
                "result": ["emoji", "game", "prediction", "actual_result", "hit_status"],
                "summary": ["total_signals", "sent_signals", "successful_signals", "accuracy_rate"]
            }
            
            vars_needed = required_vars.get(template_type, [])
            
            for var in vars_needed:
                if f"{{{var}}}" not in template:
                    return False
            
            return True
            
        except Exception:
            return False
    
    async def get_message_history(self) -> Dict[str, Any]:
        """Obter histórico de mensagens"""
        try:
            # Limpar histórico antigo (mais de 7 dias)
            cutoff_date = datetime.utcnow() - timedelta(days=7)
            
            cleaned_history = {}
            for msg_id, data in self.message_history.items():
                if data.get('sent_at', datetime.utcnow()) > cutoff_date:
                    cleaned_history[msg_id] = data
            
            self.message_history = cleaned_history
            
            return {
                "success": True,
                "history": self.message_history,
                "total_messages": len(self.message_history)
            }
            
        except Exception as e:
            logger.error("Erro ao obter histórico de mensagens", error=str(e))
            return {
                "success": False,
                "error": str(e)
            }
    
    async def send_bulk_notification(self, messages: List[str]) -> Dict[str, Any]:
        """Enviar múltiplas notificações"""
        try:
            results = []
            
            for message in messages:
                result = await self.send_signal(message)
                results.append(result)
                
                # Pequeno delay entre mensagens para evitar rate limiting
                await asyncio.sleep(0.5)
            
            successful = sum(1 for r in results if r.get('success'))
            
            return {
                "success": True,
                "total_sent": successful,
                "total_attempted": len(messages),
                "results": results
            }
            
        except Exception as e:
            logger.error("Erro ao enviar notificações em massa", error=str(e))
            return {
                "success": False,
                "error": str(e)
            }
    
    async def close(self):
        """Fechar cliente HTTP"""
        await self.client.aclose()

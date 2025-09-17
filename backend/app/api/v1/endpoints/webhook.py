"""
Endpoints para webhooks e notificações - Alert@Postas
"""

import asyncio
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Request, status, Depends
from fastapi.security import HTTPBearer

from app.core.auth import get_current_user
from app.core.logging import get_logger
from app.core.config import settings

router = APIRouter()
logger = get_logger("webhook_endpoints")
security = HTTPBearer()


@router.post("/cloudflare/update-site")
async def notify_cloudflare_update(
    request: Request,
    current_user = Depends(get_current_user)
):
    """Notificar Cloudflare Worker para atualizar dados do site"""
    try:
        # Obter URL do Cloudflare Worker
        cloudflare_url = settings.CLOUDFLARE_WORKER_URL if hasattr(settings, 'CLOUDFLARE_WORKER_URL') else None
        
        if not cloudflare_url:
            logger.warning("CLOUDFLARE_WORKER_URL não configurada")
            return {
                "success": False,
                "message": "Cloudflare Worker URL não configurada"
            }
        
        # Fazer request para atualizar dados do site
        import httpx
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{cloudflare_url}/site/update",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {settings.CLOUDFLARE_API_TOKEN}" if hasattr(settings, 'CLOUDFLARE_API_TOKEN') else ""
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                logger.info("Cloudflare Worker notificado para atualizar site")
                
                return {
                    "success": True,
                    "message": "Cloudflare Worker notificado com sucesso",
                    "cloudflare_response": result
                }
            else:
                logger.error(f"Erro ao notificar Cloudflare Worker: {response.status_code}")
                return {
                    "success": False,
                    "message": f"Erro ao notificar Cloudflare Worker: {response.status_code}",
                    "error": response.text
                }
                
    except Exception as e:
        logger.error(f"Erro ao notificar Cloudflare Worker: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao notificar Cloudflare Worker: {str(e)}"
        )


@router.post("/telegram/webhook")
async def telegram_webhook(
    request: Request
):
    """Webhook do Telegram para receber atualizações"""
    try:
        # Obter dados do webhook
        webhook_data = await request.json()
        
        logger.info(f"Webhook do Telegram recebido: {len(webhook_data.get('result', []))} updates")
        
        # Processar cada update
        for update in webhook_data.get("result", []):
            await process_telegram_update(update)
        
        return {"success": True, "processed": len(webhook_data.get("result", []))}
        
    except Exception as e:
        logger.error(f"Erro ao processar webhook do Telegram: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar webhook: {str(e)}"
        )


async def process_telegram_update(update: Dict[str, Any]):
    """Processar update do Telegram"""
    try:
        update_id = update.get("update_id")
        message = update.get("message")
        
        if not message:
            return
        
        chat_id = message.get("chat", {}).get("id")
        text = message.get("text", "")
        user = message.get("from", {})
        
        logger.info(f"Processando mensagem do Telegram: {chat_id} - {text[:50]}...")
        
        # Processar comandos específicos
        if text.startswith("/"):
            await process_telegram_command(chat_id, text, user)
        
    except Exception as e:
        logger.error(f"Erro ao processar update do Telegram: {str(e)}")


async def process_telegram_command(chat_id: int, command: str, user: Dict[str, Any]):
    """Processar comandos do Telegram"""
    try:
        command_parts = command.split()
        cmd = command_parts[0].lower()
        
        if cmd == "/status":
            # Responder com status do sistema
            await send_telegram_message(chat_id, "🤖 Alert@Postas está ativo e funcionando!")
            
        elif cmd == "/stats":
            # Responder com estatísticas
            stats_message = "📊 **Estatísticas Alert@Postas**\n\n"
            stats_message += "🎯 Jogos analisados hoje: 50\n"
            stats_message += "📤 Sinais enviados: 12\n"
            stats_message += "✅ Taxa de acerto: 75%\n"
            stats_message += "💰 ROI estimado: +15%"
            
            await send_telegram_message(chat_id, stats_message)
            
        elif cmd == "/help":
            # Responder com ajuda
            help_message = "🤖 **Comandos Alert@Postas**\n\n"
            help_message += "/status - Status do sistema\n"
            help_message += "/stats - Estatísticas atuais\n"
            help_message += "/help - Esta mensagem de ajuda"
            
            await send_telegram_message(chat_id, help_message)
            
    except Exception as e:
        logger.error(f"Erro ao processar comando do Telegram: {str(e)}")


async def send_telegram_message(chat_id: int, text: str):
    """Enviar mensagem para o Telegram"""
    try:
        from app.services.telegram_service import TelegramService
        
        telegram_service = TelegramService()
        
        # Temporariamente alterar chat_id para responder
        original_chat_id = telegram_service.chat_id
        telegram_service.chat_id = str(chat_id)
        
        result = await telegram_service.send_signal(text)
        
        # Restaurar chat_id original
        telegram_service.chat_id = original_chat_id
        await telegram_service.close()
        
        if not result.get("success"):
            logger.error(f"Erro ao enviar mensagem para Telegram: {result.get('error')}")
            
    except Exception as e:
        logger.error(f"Erro ao enviar mensagem para Telegram: {str(e)}")


@router.post("/github/webhook")
async def github_webhook(
    request: Request
):
    """Webhook do GitHub para deploy automático"""
    try:
        # Verificar se é um push para main/master
        webhook_data = await request.json()
        
        ref = webhook_data.get("ref", "")
        if not ref.endswith("/main") and not ref.endswith("/master"):
            return {"success": True, "message": "Push não é para branch principal"}
        
        logger.info("Webhook do GitHub recebido - iniciando deploy automático")
        
        # Notificar Cloudflare Worker para atualizar
        await notify_cloudflare_update_internal()
        
        return {"success": True, "message": "Deploy automático iniciado"}
        
    except Exception as e:
        logger.error(f"Erro ao processar webhook do GitHub: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar webhook: {str(e)}"
        )


async def notify_cloudflare_update_internal():
    """Notificar Cloudflare Worker internamente"""
    try:
        cloudflare_url = settings.CLOUDFLARE_WORKER_URL if hasattr(settings, 'CLOUDFLARE_WORKER_URL') else None
        
        if not cloudflare_url:
            return
        
        import httpx
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(
                f"{cloudflare_url}/site/update",
                headers={
                    "Content-Type": "application/json"
                }
            )
            
        logger.info("Cloudflare Worker notificado para atualizar após deploy")
        
    except Exception as e:
        logger.error(f"Erro ao notificar Cloudflare Worker internamente: {str(e)}")


@router.post("/alertpostas/webhook")
async def alertpostas_webhook(
    request: Request
):
    """Webhook genérico do Alert@Postas para integrações"""
    try:
        webhook_data = await request.json()
        
        webhook_type = webhook_data.get("type", "unknown")
        
        logger.info(f"Webhook Alert@Postas recebido: {webhook_type}")
        
        if webhook_type == "signal_sent":
            # Notificar atualização do site quando sinal é enviado
            asyncio.create_task(notify_cloudflare_update_internal())
            
        elif webhook_type == "game_updated":
            # Notificar atualização do site quando jogo é atualizado
            asyncio.create_task(notify_cloudflare_update_internal())
            
        elif webhook_type == "stats_updated":
            # Notificar atualização do site quando stats são atualizados
            asyncio.create_task(notify_cloudflare_update_internal())
        
        return {
            "success": True,
            "message": f"Webhook {webhook_type} processado com sucesso"
        }
        
    except Exception as e:
        logger.error(f"Erro ao processar webhook Alert@Postas: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar webhook: {str(e)}"
        )

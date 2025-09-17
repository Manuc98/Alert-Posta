"""
Endpoints para gerenciamento do Telegram - Alert@Postas
"""

from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer

from app.core.auth import get_current_user
from app.core.logging import get_logger
from app.services.telegram_service import TelegramService
from app.schemas.telegram import (
    TelegramTestResponse,
    TelegramSignalRequest,
    TelegramSignalResponse,
    TelegramTemplateUpdate,
    TelegramTemplateResponse,
    TelegramHistoryResponse,
    TelegramBulkRequest,
    TelegramBulkResponse
)

router = APIRouter()
logger = get_logger("telegram_endpoints")
security = HTTPBearer()


@router.get("/test", response_model=TelegramTestResponse)
async def test_telegram_connection(
    current_user = Depends(get_current_user)
):
    """Testar conexão com o Telegram"""
    try:
        telegram_service = TelegramService()
        
        # Testar conexão
        result = await telegram_service.test_connection()
        
        await telegram_service.close()
        
        return TelegramTestResponse(
            success=result.get("success", False),
            bot_info=result.get("bot_info"),
            test_message_sent=result.get("test_message_sent", False),
            error=result.get("error")
        )
        
    except Exception as e:
        logger.error("Erro ao testar conexão Telegram", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao testar conexão: {str(e)}"
        )


@router.post("/send-signal", response_model=TelegramSignalResponse)
async def send_telegram_signal(
    signal_request: TelegramSignalRequest,
    current_user = Depends(get_current_user)
):
    """Enviar sinal formatado para o Telegram"""
    try:
        telegram_service = TelegramService()
        
        # Enviar sinal formatado
        result = await telegram_service.send_formatted_signal(signal_request.signal_data)
        
        await telegram_service.close()
        
        return TelegramSignalResponse(
            success=result.get("success", False),
            message_id=result.get("message_id"),
            sent_at=result.get("sent_at"),
            error=result.get("error")
        )
        
    except Exception as e:
        logger.error("Erro ao enviar sinal para Telegram", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao enviar sinal: {str(e)}"
        )


@router.post("/update-result/{message_id}")
async def update_signal_result(
    message_id: str,
    signal_data: Dict[str, Any],
    result_data: Dict[str, Any],
    current_user = Depends(get_current_user)
):
    """Atualizar mensagem de sinal com resultado"""
    try:
        telegram_service = TelegramService()
        
        # Atualizar resultado
        result = await telegram_service.update_signal_result(
            message_id, signal_data, result_data
        )
        
        await telegram_service.close()
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Erro ao atualizar resultado")
            )
        
        return {
            "success": True,
            "message": "Resultado atualizado com sucesso",
            "updated_at": result.get("edited_at")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erro ao atualizar resultado do sinal", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao atualizar resultado: {str(e)}"
        )


@router.get("/templates", response_model=Dict[str, str])
async def get_telegram_templates(
    current_user = Depends(get_current_user)
):
    """Obter templates customizáveis do Telegram"""
    try:
        telegram_service = TelegramService()
        
        templates = telegram_service.custom_templates
        
        await telegram_service.close()
        
        return templates
        
    except Exception as e:
        logger.error("Erro ao obter templates", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter templates: {str(e)}"
        )


@router.post("/templates/{template_type}", response_model=TelegramTemplateResponse)
async def update_telegram_template(
    template_type: str,
    template_update: TelegramTemplateUpdate,
    current_user = Depends(get_current_user)
):
    """Atualizar template customizável"""
    try:
        telegram_service = TelegramService()
        
        # Atualizar template
        result = await telegram_service.update_custom_template(
            template_type, template_update.template
        )
        
        await telegram_service.close()
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Erro ao atualizar template")
            )
        
        return TelegramTemplateResponse(
            success=True,
            message=result.get("message"),
            template_type=template_type
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erro ao atualizar template", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao atualizar template: {str(e)}"
        )


@router.get("/history", response_model=TelegramHistoryResponse)
async def get_telegram_history(
    current_user = Depends(get_current_user)
):
    """Obter histórico de mensagens do Telegram"""
    try:
        telegram_service = TelegramService()
        
        # Obter histórico
        result = await telegram_service.get_message_history()
        
        await telegram_service.close()
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Erro ao obter histórico")
            )
        
        return TelegramHistoryResponse(
            success=True,
            history=result.get("history", {}),
            total_messages=result.get("total_messages", 0)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erro ao obter histórico", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter histórico: {str(e)}"
        )


@router.post("/send-bulk", response_model=TelegramBulkResponse)
async def send_bulk_notifications(
    bulk_request: TelegramBulkRequest,
    current_user = Depends(get_current_user)
):
    """Enviar múltiplas notificações"""
    try:
        telegram_service = TelegramService()
        
        # Enviar notificações em massa
        result = await telegram_service.send_bulk_notification(bulk_request.messages)
        
        await telegram_service.close()
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Erro ao enviar notificações")
            )
        
        return TelegramBulkResponse(
            success=True,
            total_sent=result.get("total_sent", 0),
            total_attempted=result.get("total_attempted", 0),
            results=result.get("results", [])
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erro ao enviar notificações em massa", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao enviar notificações: {str(e)}"
        )


@router.post("/send-status/{status_type}")
async def send_status_message(
    status_type: str,
    details: str = None,
    current_user = Depends(get_current_user)
):
    """Enviar mensagem de status do bot"""
    try:
        telegram_service = TelegramService()
        
        # Enviar mensagem de status
        result = await telegram_service.send_status_message(status_type, details)
        
        await telegram_service.close()
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Erro ao enviar status")
            )
        
        return {
            "success": True,
            "message": "Status enviado com sucesso",
            "sent_at": result.get("sent_at")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erro ao enviar status", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao enviar status: {str(e)}"
        )


@router.post("/send-error")
async def send_error_notification(
    error_type: str,
    error_message: str,
    module: str = None,
    current_user = Depends(get_current_user)
):
    """Enviar notificação de erro"""
    try:
        telegram_service = TelegramService()
        
        # Enviar notificação de erro
        result = await telegram_service.send_error_notification(
            error_type, error_message, module
        )
        
        await telegram_service.close()
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Erro ao enviar notificação")
            )
        
        return {
            "success": True,
            "message": "Notificação de erro enviada com sucesso",
            "sent_at": result.get("sent_at")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erro ao enviar notificação de erro", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao enviar notificação: {str(e)}"
        )


@router.post("/send-daily-summary")
async def send_daily_summary(
    stats: Dict[str, Any],
    current_user = Depends(get_current_user)
):
    """Enviar resumo diário formatado"""
    try:
        telegram_service = TelegramService()
        
        # Enviar resumo diário formatado
        result = await telegram_service.send_daily_summary_formatted(stats)
        
        await telegram_service.close()
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Erro ao enviar resumo")
            )
        
        return {
            "success": True,
            "message": "Resumo diário enviado com sucesso",
            "sent_at": result.get("sent_at")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erro ao enviar resumo diário", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao enviar resumo: {str(e)}"
        )

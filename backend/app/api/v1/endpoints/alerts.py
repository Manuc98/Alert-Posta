"""
Endpoints para gerenciamento de alertas - Alert@Postas
"""

from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException, Request, status
from fastapi.security import HTTPBearer

from app.core.alerts import alert_manager, AlertType, AlertSeverity
from app.core.logging import get_logger

router = APIRouter()
logger = get_logger("alerts_endpoints")
security = HTTPBearer()


@router.post("/webhook")
async def alertmanager_webhook(request: Request):
    """Webhook para receber alertas do Alertmanager"""
    try:
        # Obter dados do webhook
        alert_data = await request.json()
        
        logger.info(f"Webhook do Alertmanager recebido: {len(alert_data.get('alerts', []))} alertas")
        
        # Processar cada alerta
        for alert in alert_data.get('alerts', []):
            alert_name = alert.get('labels', {}).get('alertname', 'unknown')
            status = alert.get('status', 'unknown')
            severity = alert.get('labels', {}).get('severity', 'medium')
            
            # Mapear severidade do Prometheus para nosso sistema
            severity_map = {
                'critical': AlertSeverity.CRITICAL,
                'high': AlertSeverity.HIGH,
                'medium': AlertSeverity.MEDIUM,
                'low': AlertSeverity.LOW,
                'warning': AlertSeverity.MEDIUM
            }
            
            alert_severity = severity_map.get(severity, AlertSeverity.MEDIUM)
            
            # Determinar tipo de alerta
            alert_type_map = {
                'system_offline': AlertType.SYSTEM,
                'high_error_rate': AlertType.API,
                'low_ml_accuracy': AlertType.ML,
                'telegram_send_failure': AlertType.TELEGRAM,
                'too_many_active_games': AlertType.PERFORMANCE
            }
            
            alert_type = alert_type_map.get(alert_name, AlertType.SYSTEM)
            
            if status == 'firing':
                # Criar alerta
                title = alert.get('annotations', {}).get('summary', alert_name)
                message = alert.get('annotations', {}).get('description', 'Alerta do sistema')
                
                alert_obj = alert_manager.create_alert(
                    alert_type=alert_type,
                    severity=alert_severity,
                    title=title,
                    message=message,
                    source="alertmanager",
                    metadata={
                        'alert_name': alert_name,
                        'labels': alert.get('labels', {}),
                        'annotations': alert.get('annotations', {}),
                        'generator_url': alert.get('generatorURL', ''),
                        'starts_at': alert.get('startsAt', ''),
                        'ends_at': alert.get('endsAt', '')
                    }
                )
                
                logger.info(f"Alerta criado via webhook: {alert_obj.id}")
                
            elif status == 'resolved':
                # Resolver alerta existente
                # TODO: Implementar lógica para encontrar e resolver alerta correspondente
                logger.info(f"Alerta resolvido via webhook: {alert_name}")
        
        return {"status": "success", "processed": len(alert_data.get('alerts', []))}
        
    except Exception as e:
        logger.error(f"Erro ao processar webhook do Alertmanager: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar webhook: {str(e)}"
        )


@router.get("/active")
async def get_active_alerts():
    """Obter alertas ativos"""
    try:
        active_alerts = alert_manager.get_active_alerts()
        
        return {
            "success": True,
            "alerts": [
                {
                    "id": alert.id,
                    "type": alert.alert_type.value,
                    "severity": alert.severity.value,
                    "title": alert.title,
                    "message": alert.message,
                    "source": alert.source,
                    "timestamp": alert.timestamp.isoformat(),
                    "metadata": alert.metadata
                }
                for alert in active_alerts
            ],
            "count": len(active_alerts)
        }
        
    except Exception as e:
        logger.error(f"Erro ao obter alertas ativos: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter alertas: {str(e)}"
        )


@router.get("/history")
async def get_alert_history(limit: int = 100):
    """Obter histórico de alertas"""
    try:
        history = alert_manager.get_alert_history(limit)
        
        return {
            "success": True,
            "alerts": [
                {
                    "id": alert.id,
                    "type": alert.alert_type.value,
                    "severity": alert.severity.value,
                    "title": alert.title,
                    "message": alert.message,
                    "source": alert.source,
                    "timestamp": alert.timestamp.isoformat(),
                    "resolved": alert.resolved,
                    "resolved_at": alert.resolved_at.isoformat() if alert.resolved_at else None,
                    "resolution_notes": alert.resolution_notes,
                    "metadata": alert.metadata
                }
                for alert in history
            ],
            "count": len(history)
        }
        
    except Exception as e:
        logger.error(f"Erro ao obter histórico de alertas: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter histórico: {str(e)}"
        )


@router.post("/resolve/{alert_id}")
async def resolve_alert(alert_id: str, resolution_notes: str = None):
    """Resolver alerta"""
    try:
        alert_manager.resolve_alert(alert_id, resolution_notes)
        
        return {
            "success": True,
            "message": f"Alerta {alert_id} resolvido com sucesso"
        }
        
    except Exception as e:
        logger.error(f"Erro ao resolver alerta {alert_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao resolver alerta: {str(e)}"
        )


@router.post("/create")
async def create_manual_alert(
    alert_type: str,
    severity: str,
    title: str,
    message: str,
    source: str = "manual",
    metadata: Dict[str, Any] = None
):
    """Criar alerta manual"""
    try:
        # Validar tipo de alerta
        try:
            alert_type_enum = AlertType(alert_type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tipo de alerta inválido: {alert_type}"
            )
        
        # Validar severidade
        try:
            severity_enum = AlertSeverity(severity)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Severidade inválida: {severity}"
            )
        
        # Criar alerta
        alert = alert_manager.create_alert(
            alert_type=alert_type_enum,
            severity=severity_enum,
            title=title,
            message=message,
            source=source,
            metadata=metadata or {}
        )
        
        return {
            "success": True,
            "alert": {
                "id": alert.id,
                "type": alert.alert_type.value,
                "severity": alert.severity.value,
                "title": alert.title,
                "message": alert.message,
                "source": alert.source,
                "timestamp": alert.timestamp.isoformat(),
                "metadata": alert.metadata
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar alerta manual: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao criar alerta: {str(e)}"
        )


@router.get("/rules")
async def get_alert_rules():
    """Obter regras de alerta configuradas"""
    try:
        rules = []
        
        for rule in alert_manager.rules:
            rules.append({
                "name": rule.name,
                "alert_type": rule.alert_type.value,
                "severity": rule.severity.value,
                "title": rule.title,
                "message": rule.message,
                "channels": [ch.value for ch in rule.channels],
                "cooldown": rule.cooldown,
                "enabled": rule.enabled,
                "last_triggered": rule.last_triggered.isoformat() if rule.last_triggered else None
            })
        
        return {
            "success": True,
            "rules": rules,
            "count": len(rules)
        }
        
    except Exception as e:
        logger.error(f"Erro ao obter regras de alerta: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter regras: {str(e)}"
        )

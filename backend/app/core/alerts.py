"""
Sistema de alertas e monitoramento para Alert@Postas
"""

import asyncio
import json
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime, timedelta
from enum import Enum
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.core.config import settings
from app.core.logging import get_logger
from app.core.metrics import metrics_collector
from app.services.telegram_service import TelegramService

logger = get_logger("alerts")


class AlertSeverity(Enum):
    """Níveis de severidade dos alertas"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AlertType(Enum):
    """Tipos de alertas"""
    SYSTEM = "system"
    ML = "ml"
    API = "api"
    DATABASE = "database"
    TELEGRAM = "telegram"
    SECURITY = "security"
    PERFORMANCE = "performance"
    BUSINESS = "business"


class AlertChannel(Enum):
    """Canais de envio de alertas"""
    TELEGRAM = "telegram"
    EMAIL = "email"
    WEBHOOK = "webhook"
    LOG = "log"


class Alert:
    """Classe para representar um alerta"""
    
    def __init__(
        self,
        alert_type: AlertType,
        severity: AlertSeverity,
        title: str,
        message: str,
        source: str = None,
        metadata: Dict[str, Any] = None
    ):
        self.alert_type = alert_type
        self.severity = severity
        self.title = title
        self.message = message
        self.source = source
        self.metadata = metadata or {}
        self.timestamp = datetime.utcnow()
        self.id = f"{alert_type.value}_{int(self.timestamp.timestamp())}"
        self.resolved = False
        self.resolved_at = None
        self.resolution_notes = None


class AlertRule:
    """Regra para geração automática de alertas"""
    
    def __init__(
        self,
        name: str,
        condition: Callable[[], bool],
        alert_type: AlertType,
        severity: AlertSeverity,
        title: str,
        message: str,
        channels: List[AlertChannel],
        cooldown: int = 300,  # 5 minutos
        enabled: bool = True
    ):
        self.name = name
        self.condition = condition
        self.alert_type = alert_type
        self.severity = severity
        self.title = title
        self.message = message
        self.channels = channels
        self.cooldown = cooldown
        self.enabled = enabled
        self.last_triggered = None


class AlertManager:
    """Gerenciador de alertas centralizado"""
    
    def __init__(self):
        self.active_alerts: Dict[str, Alert] = {}
        self.alert_history: List[Alert] = []
        self.rules: List[AlertRule] = []
        self.channels: Dict[AlertChannel, Any] = {}
        self.telegram_service = TelegramService()
        
        # Configurar canais
        self._setup_channels()
        
        # Configurar regras padrão
        self._setup_default_rules()
    
    def _setup_channels(self):
        """Configurar canais de alerta"""
        self.channels[AlertChannel.TELEGRAM] = self.telegram_service
        self.channels[AlertChannel.EMAIL] = self._setup_email_channel()
        self.channels[AlertChannel.WEBHOOK] = self._setup_webhook_channel()
        self.channels[AlertChannel.LOG] = logger
    
    def _setup_email_channel(self):
        """Configurar canal de email"""
        # TODO: Implementar configuração de email
        return None
    
    def _setup_webhook_channel(self):
        """Configurar canal de webhook"""
        # TODO: Implementar webhook para Slack/Discord
        return None
    
    def _setup_default_rules(self):
        """Configurar regras de alerta padrão"""
        
        # Regra: Sistema offline
        self.add_rule(AlertRule(
            name="system_offline",
            condition=lambda: not self._is_system_healthy(),
            alert_type=AlertType.SYSTEM,
            severity=AlertSeverity.CRITICAL,
            title="🚨 Sistema Offline",
            message="O sistema Alert@Postas está offline ou não está respondendo",
            channels=[AlertChannel.TELEGRAM, AlertChannel.EMAIL],
            cooldown=600  # 10 minutos
        ))
        
        # Regra: Alta taxa de erro
        self.add_rule(AlertRule(
            name="high_error_rate",
            condition=lambda: self._get_error_rate() > 0.1,  # 10%
            alert_type=AlertType.API,
            severity=AlertSeverity.HIGH,
            title="⚠️ Alta Taxa de Erro",
            message=f"Taxa de erro da API está em {self._get_error_rate():.1%}",
            channels=[AlertChannel.TELEGRAM],
            cooldown=300
        ))
        
        # Regra: Modelo ML com baixa precisão
        self.add_rule(AlertRule(
            name="low_ml_accuracy",
            condition=lambda: self._get_ml_accuracy() < 0.6,  # 60%
            alert_type=AlertType.ML,
            severity=AlertSeverity.MEDIUM,
            title="📊 Baixa Precisão do Modelo",
            message=f"Precisão do modelo ML está em {self._get_ml_accuracy():.1%}",
            channels=[AlertChannel.TELEGRAM],
            cooldown=1800  # 30 minutos
        ))
        
        # Regra: Falha no envio de sinais
        self.add_rule(AlertRule(
            name="telegram_send_failure",
            condition=lambda: self._get_telegram_failure_rate() > 0.2,  # 20%
            alert_type=AlertType.TELEGRAM,
            severity=AlertSeverity.HIGH,
            title="📱 Falha no Telegram",
            message=f"Taxa de falha no envio para Telegram está em {self._get_telegram_failure_rate():.1%}",
            channels=[AlertChannel.EMAIL],
            cooldown=300
        ))
        
        # Regra: Muitos jogos ativos
        self.add_rule(AlertRule(
            name="too_many_active_games",
            condition=lambda: self._get_active_games_count() > 100,
            alert_type=AlertType.PERFORMANCE,
            severity=AlertSeverity.MEDIUM,
            title="🎮 Muitos Jogos Ativos",
            message=f"Sistema está analisando {self._get_active_games_count()} jogos simultaneamente",
            channels=[AlertChannel.TELEGRAM],
            cooldown=600
        ))
    
    def add_rule(self, rule: AlertRule):
        """Adicionar regra de alerta"""
        self.rules.append(rule)
        logger.info(f"Regra de alerta adicionada: {rule.name}")
    
    def remove_rule(self, rule_name: str):
        """Remover regra de alerta"""
        self.rules = [r for r in self.rules if r.name != rule_name]
        logger.info(f"Regra de alerta removida: {rule_name}")
    
    def create_alert(
        self,
        alert_type: AlertType,
        severity: AlertSeverity,
        title: str,
        message: str,
        source: str = None,
        metadata: Dict[str, Any] = None,
        channels: List[AlertChannel] = None
    ) -> Alert:
        """Criar novo alerta"""
        alert = Alert(alert_type, severity, title, message, source, metadata)
        
        # Adicionar à lista de alertas ativos
        self.active_alerts[alert.id] = alert
        
        # Adicionar ao histórico
        self.alert_history.append(alert)
        
        # Manter apenas últimos 1000 alertas no histórico
        if len(self.alert_history) > 1000:
            self.alert_history = self.alert_history[-1000:]
        
        # Enviar alerta pelos canais configurados
        asyncio.create_task(self._send_alert(alert, channels or [AlertChannel.TELEGRAM]))
        
        logger.warning(f"Alerta criado: {alert.title} ({alert.severity.value})")
        
        return alert
    
    async def _send_alert(self, alert: Alert, channels: List[AlertChannel]):
        """Enviar alerta pelos canais especificados"""
        for channel in channels:
            try:
                if channel == AlertChannel.TELEGRAM:
                    await self._send_telegram_alert(alert)
                elif channel == AlertChannel.EMAIL:
                    await self._send_email_alert(alert)
                elif channel == AlertChannel.WEBHOOK:
                    await self._send_webhook_alert(alert)
                elif channel == AlertChannel.LOG:
                    self._send_log_alert(alert)
                    
            except Exception as e:
                logger.error(f"Erro ao enviar alerta via {channel.value}: {str(e)}")
    
    async def _send_telegram_alert(self, alert: Alert):
        """Enviar alerta via Telegram"""
        try:
            # Formatar mensagem
            emoji_map = {
                AlertSeverity.LOW: "ℹ️",
                AlertSeverity.MEDIUM: "⚠️",
                AlertSeverity.HIGH: "🚨",
                AlertSeverity.CRITICAL: "🔥"
            }
            
            emoji = emoji_map.get(alert.severity, "📢")
            
            message = f"{emoji} **{alert.title}**\n\n"
            message += f"**Severidade**: {alert.severity.value.upper()}\n"
            message += f"**Tipo**: {alert.alert_type.value}\n"
            message += f"**Mensagem**: {alert.message}\n"
            
            if alert.source:
                message += f"**Origem**: {alert.source}\n"
            
            if alert.metadata:
                message += f"**Detalhes**: {json.dumps(alert.metadata, indent=2)}\n"
            
            message += f"\n⏰ **Horário**: {alert.timestamp.strftime('%Y-%m-%d %H:%M:%S')}"
            
            # Enviar mensagem
            result = await self.telegram_service.send_signal(message)
            
            if not result.get("success"):
                logger.error(f"Falha ao enviar alerta via Telegram: {result.get('error')}")
                
        except Exception as e:
            logger.error(f"Erro ao enviar alerta via Telegram: {str(e)}")
    
    async def _send_email_alert(self, alert: Alert):
        """Enviar alerta via email"""
        # TODO: Implementar envio de email
        pass
    
    async def _send_webhook_alert(self, alert: Alert):
        """Enviar alerta via webhook"""
        # TODO: Implementar webhook
        pass
    
    def _send_log_alert(self, alert: Alert):
        """Enviar alerta via log"""
        log_level = {
            AlertSeverity.LOW: logger.info,
            AlertSeverity.MEDIUM: logger.warning,
            AlertSeverity.HIGH: logger.error,
            AlertSeverity.CRITICAL: logger.critical
        }
        
        log_func = log_level.get(alert.severity, logger.warning)
        log_func(f"ALERTA: {alert.title} - {alert.message}")
    
    async def check_rules(self):
        """Verificar todas as regras de alerta"""
        for rule in self.rules:
            if not rule.enabled:
                continue
            
            # Verificar cooldown
            if rule.last_triggered:
                time_since_last = datetime.utcnow() - rule.last_triggered
                if time_since_last.total_seconds() < rule.cooldown:
                    continue
            
            try:
                # Verificar condição
                if rule.condition():
                    # Criar alerta
                    alert = self.create_alert(
                        rule.alert_type,
                        rule.severity,
                        rule.title,
                        rule.message,
                        source=f"rule:{rule.name}",
                        channels=rule.channels
                    )
                    
                    # Marcar como disparado
                    rule.last_triggered = datetime.utcnow()
                    
                    logger.info(f"Regra de alerta disparada: {rule.name}")
                    
            except Exception as e:
                logger.error(f"Erro ao verificar regra {rule.name}: {str(e)}")
    
    def resolve_alert(self, alert_id: str, resolution_notes: str = None):
        """Resolver alerta"""
        if alert_id in self.active_alerts:
            alert = self.active_alerts[alert_id]
            alert.resolved = True
            alert.resolved_at = datetime.utcnow()
            alert.resolution_notes = resolution_notes
            
            # Remover dos alertas ativos
            del self.active_alerts[alert_id]
            
            logger.info(f"Alerta resolvido: {alert.title}")
            
            # Enviar notificação de resolução
            asyncio.create_task(self._send_resolution_notification(alert))
    
    async def _send_resolution_notification(self, alert: Alert):
        """Enviar notificação de resolução do alerta"""
        try:
            message = f"✅ **Alerta Resolvido**\n\n"
            message += f"**Título**: {alert.title}\n"
            message += f"**Resolvido em**: {alert.resolved_at.strftime('%Y-%m-%d %H:%M:%S')}\n"
            
            if alert.resolution_notes:
                message += f"**Notas**: {alert.resolution_notes}\n"
            
            await self.telegram_service.send_signal(message)
            
        except Exception as e:
            logger.error(f"Erro ao enviar notificação de resolução: {str(e)}")
    
    def get_active_alerts(self) -> List[Alert]:
        """Obter alertas ativos"""
        return list(self.active_alerts.values())
    
    def get_alert_history(self, limit: int = 100) -> List[Alert]:
        """Obter histórico de alertas"""
        return self.alert_history[-limit:]
    
    # Métodos auxiliares para condições das regras
    def _is_system_healthy(self) -> bool:
        """Verificar se sistema está saudável"""
        # TODO: Implementar health check real
        return True
    
    def _get_error_rate(self) -> float:
        """Obter taxa de erro da API"""
        # TODO: Implementar cálculo real baseado em métricas
        return 0.05  # 5% placeholder
    
    def _get_ml_accuracy(self) -> float:
        """Obter precisão do modelo ML"""
        # TODO: Implementar cálculo real
        return 0.75  # 75% placeholder
    
    def _get_telegram_failure_rate(self) -> float:
        """Obter taxa de falha do Telegram"""
        # TODO: Implementar cálculo real
        return 0.02  # 2% placeholder
    
    def _get_active_games_count(self) -> int:
        """Obter número de jogos ativos"""
        # TODO: Implementar contagem real
        return 50  # placeholder
    
    async def start_monitoring(self):
        """Iniciar monitoramento contínuo"""
        logger.info("Iniciando sistema de monitoramento de alertas")
        
        while True:
            try:
                await self.check_rules()
                await asyncio.sleep(60)  # Verificar a cada minuto
                
            except Exception as e:
                logger.error(f"Erro no monitoramento de alertas: {str(e)}")
                await asyncio.sleep(60)


# Instância global do gerenciador de alertas
alert_manager = AlertManager()


# Funções de conveniência
def create_alert(
    alert_type: AlertType,
    severity: AlertSeverity,
    title: str,
    message: str,
    **kwargs
) -> Alert:
    """Criar alerta usando o gerenciador global"""
    return alert_manager.create_alert(alert_type, severity, title, message, **kwargs)


def resolve_alert(alert_id: str, notes: str = None):
    """Resolver alerta usando o gerenciador global"""
    alert_manager.resolve_alert(alert_id, notes)

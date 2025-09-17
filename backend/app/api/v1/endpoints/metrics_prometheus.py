"""
Endpoint para métricas Prometheus - Alert@Postas
"""

from fastapi import APIRouter, Response
from fastapi.responses import PlainTextResponse

from app.core.metrics import get_metrics, get_metrics_summary
from app.core.logging import get_logger

router = APIRouter()
logger = get_logger("metrics_endpoints")


@router.get("/metrics", response_class=PlainTextResponse)
async def get_prometheus_metrics():
    """Endpoint para métricas Prometheus"""
    try:
        metrics_data = get_metrics()
        return PlainTextResponse(content=metrics_data, media_type="text/plain")
        
    except Exception as e:
        logger.error(f"Erro ao obter métricas Prometheus: {str(e)}")
        return PlainTextResponse(
            content="# Erro ao obter métricas\n",
            status_code=500
        )


@router.get("/metrics/summary")
async def get_metrics_summary_endpoint():
    """Endpoint para resumo das métricas"""
    try:
        summary = get_metrics_summary()
        return summary
        
    except Exception as e:
        logger.error(f"Erro ao obter resumo das métricas: {str(e)}")
        return {
            "error": str(e),
            "summary": {}
        }

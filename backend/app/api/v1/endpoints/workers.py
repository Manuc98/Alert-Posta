"""
Endpoints para gerenciamento de workers - Alert@Postas
"""

from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException, status
from fastapi.security import HTTPBearer

from app.core.auth import get_current_user
from app.core.logging import get_logger
from app.workers.worker_manager import worker_manager

router = APIRouter()
logger = get_logger("workers_endpoints")
security = HTTPBearer()


@router.get("/status")
async def get_workers_status(
    current_user = Depends(get_current_user)
):
    """Obter status de todos os workers"""
    try:
        status = await worker_manager.get_worker_status()
        
        return {
            "success": True,
            "status": status
        }
        
    except Exception as e:
        logger.error(f"Erro ao obter status dos workers: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter status: {str(e)}"
        )


@router.get("/status/{worker_name}")
async def get_worker_status(
    worker_name: str,
    current_user = Depends(get_current_user)
):
    """Obter status de um worker específico"""
    try:
        worker_status = await worker_manager.get_worker_status(worker_name)
        
        return {
            "success": True,
            "worker": worker_name,
            "status": worker_status
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Erro ao obter status do worker {worker_name}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter status: {str(e)}"
        )


@router.post("/start/{worker_name}")
async def start_worker(
    worker_name: str,
    current_user = Depends(get_current_user)
):
    """Iniciar um worker específico"""
    try:
        if worker_name not in worker_manager.get_available_workers():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Worker {worker_name} não encontrado"
            )
        
        worker = worker_manager.workers[worker_name]
        
        if worker.running:
            return {
                "success": True,
                "message": f"Worker {worker_name} já está em execução",
                "worker": worker_name
            }
        
        await worker.start()
        
        logger.info(f"Worker {worker_name} iniciado manualmente")
        
        return {
            "success": True,
            "message": f"Worker {worker_name} iniciado com sucesso",
            "worker": worker_name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao iniciar worker {worker_name}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao iniciar worker: {str(e)}"
        )


@router.post("/stop/{worker_name}")
async def stop_worker(
    worker_name: str,
    current_user = Depends(get_current_user)
):
    """Parar um worker específico"""
    try:
        if worker_name not in worker_manager.get_available_workers():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Worker {worker_name} não encontrado"
            )
        
        worker = worker_manager.workers[worker_name]
        
        if not worker.running:
            return {
                "success": True,
                "message": f"Worker {worker_name} já está parado",
                "worker": worker_name
            }
        
        await worker.stop()
        
        logger.info(f"Worker {worker_name} parado manualmente")
        
        return {
            "success": True,
            "message": f"Worker {worker_name} parado com sucesso",
            "worker": worker_name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao parar worker {worker_name}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao parar worker: {str(e)}"
        )


@router.post("/restart/{worker_name}")
async def restart_worker(
    worker_name: str,
    current_user = Depends(get_current_user)
):
    """Reiniciar um worker específico"""
    try:
        await worker_manager.restart_worker(worker_name)
        
        logger.info(f"Worker {worker_name} reiniciado manualmente")
        
        return {
            "success": True,
            "message": f"Worker {worker_name} reiniciado com sucesso",
            "worker": worker_name
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Erro ao reiniciar worker {worker_name}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao reiniciar worker: {str(e)}"
        )


@router.post("/run/{worker_name}")
async def run_worker_once(
    worker_name: str,
    current_user = Depends(get_current_user)
):
    """Executar um worker uma única vez"""
    try:
        result = await worker_manager.run_worker_once(worker_name)
        
        logger.info(f"Worker {worker_name} executado manualmente uma vez")
        
        return {
            "success": True,
            "message": f"Worker {worker_name} executado com sucesso",
            "worker": worker_name,
            "result": result
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Erro ao executar worker {worker_name}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao executar worker: {str(e)}"
        )


@router.put("/interval/{worker_name}")
async def set_worker_interval(
    worker_name: str,
    interval: int,
    current_user = Depends(get_current_user)
):
    """Alterar intervalo de um worker"""
    try:
        if interval <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Intervalo deve ser maior que 0"
            )
        
        await worker_manager.set_worker_interval(worker_name, interval)
        
        logger.info(f"Intervalo do worker {worker_name} alterado para {interval}s")
        
        return {
            "success": True,
            "message": f"Intervalo do worker {worker_name} alterado para {interval}s",
            "worker": worker_name,
            "new_interval": interval
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao alterar intervalo do worker {worker_name}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao alterar intervalo: {str(e)}"
        )


@router.get("/list")
async def list_workers(
    current_user = Depends(get_current_user)
):
    """Listar todos os workers disponíveis"""
    try:
        workers = worker_manager.get_available_workers()
        
        return {
            "success": True,
            "workers": workers,
            "count": len(workers)
        }
        
    except Exception as e:
        logger.error(f"Erro ao listar workers: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao listar workers: {str(e)}"
        )


@router.get("/health")
async def workers_health_check(
    current_user = Depends(get_current_user)
):
    """Verificar saúde de todos os workers"""
    try:
        health = await worker_manager.health_check()
        
        return {
            "success": True,
            "health": health
        }
        
    except Exception as e:
        logger.error(f"Erro ao verificar saúde dos workers: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao verificar saúde: {str(e)}"
        )


@router.post("/start-all")
async def start_all_workers(
    current_user = Depends(get_current_user)
):
    """Iniciar todos os workers"""
    try:
        if worker_manager.running:
            return {
                "success": True,
                "message": "WorkerManager já está em execução"
            }
        
        # Iniciar workers em background
        import asyncio
        asyncio.create_task(worker_manager.start_all())
        
        logger.info("Todos os workers iniciados manualmente")
        
        return {
            "success": True,
            "message": "Todos os workers iniciados com sucesso"
        }
        
    except Exception as e:
        logger.error(f"Erro ao iniciar todos os workers: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao iniciar workers: {str(e)}"
        )


@router.post("/stop-all")
async def stop_all_workers(
    current_user = Depends(get_current_user)
):
    """Parar todos os workers"""
    try:
        await worker_manager.stop_all()
        
        logger.info("Todos os workers parados manualmente")
        
        return {
            "success": True,
            "message": "Todos os workers parados com sucesso"
        }
        
    except Exception as e:
        logger.error(f"Erro ao parar todos os workers: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao parar workers: {str(e)}"
        )

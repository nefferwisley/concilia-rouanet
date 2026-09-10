"""
backend/routes/processamento.py — Endpoints HTTP para orquestração assíncrona,
idempotente e auditável do pipeline contábil e de conciliação do Concilia Rouanet.
"""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from pydantic import BaseModel

from backend.services.processamento_service import (
    ProcessarRequest,
    JobStatusResponse,
    calcular_chave_idempotencia,
    buscar_job_por_idempotencia,
    criar_job,
    obter_job,
    obter_processamento_atual,
    executar_pipeline,
    STATUS_QUEUED,
    STATUS_RUNNING,
    STATUS_FAILED,
    STATUS_INTERRUPTED,
)
from backend.database import get_conn

router = APIRouter(prefix="/api/v1", tags=["Processamento e Conciliação"])


async def _require_project_access(conn, projeto_id: str) -> None:
    exists = await conn.fetchval("SELECT id FROM projetos WHERE id = $1", projeto_id)
    if not exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projeto não encontrado (ou sem permissão).")


class IniciarProcessamentoResponse(BaseModel):
    job_id: str
    projeto_id: str
    status: str
    stage: str
    progress: int
    message: str
    status_url: str
    idempotency_key: str
    reused: bool = False


@router.post(
    "/projetos/{projeto_id}/processar",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=IniciarProcessamentoResponse,
    summary="Inicia o pipeline contábil e de conciliação assíncrono para o projeto",
)
async def iniciar_processamento(
    projeto_id: str,
    payload: ProcessarRequest,
    background_tasks: BackgroundTasks,
    request: Request,
    dep=Depends(get_conn),
):
    """
    Inicia o processamento contábil e conciliação em segundo plano.
    O endpoint é estritamente idempotente. Se o mesmo manifesto ou chave for
    submetido repetidamente enquanto um job já existe ou está rodando, o job existente
    é retornado sem duplicar registros contábeis.
    """
    conn, user_id = dep
    await _require_project_access(conn, projeto_id)
    idempotency_key = calcular_chave_idempotencia(projeto_id, payload)

    # Se não for solicitado reprocessamento forçado, verifica se já existe
    if not getattr(payload, "reprocessar", False):
        job_existente = buscar_job_por_idempotencia(projeto_id, idempotency_key)
        if job_existente:
            resultado = job_existente.get("resultado") or {}
            return IniciarProcessamentoResponse(
                job_id=job_existente["id"],
                projeto_id=projeto_id,
                status=job_existente.get("status", STATUS_QUEUED),
                stage=resultado.get("stage", "queued"),
                progress=resultado.get("progress", 0),
                message="Job idempotente já registrado para este lote/manifesto.",
                status_url=f"/api/v1/processamentos/{job_existente['id']}",
                idempotency_key=idempotency_key,
                reused=True,
            )

    job_id = criar_job(projeto_id, payload, idempotency_key)

    # Obter identificador do usuário ou agente se presente
    actor_id = user_id

    # Agenda a execução em background
    background_tasks.add_task(
        executar_pipeline,
        job_id=job_id,
        projeto_id=projeto_id,
        payload=payload,
        actor_id=actor_id,
    )

    return IniciarProcessamentoResponse(
        job_id=job_id,
        projeto_id=projeto_id,
        status=STATUS_QUEUED,
        stage="queued",
        progress=0,
        message="Processamento iniciado com sucesso em segundo plano.",
        status_url=f"/api/v1/processamentos/{job_id}",
        idempotency_key=idempotency_key,
        reused=False,
    )


@router.get(
    "/processamentos/{job_id}",
    response_model=JobStatusResponse,
    summary="Consulta o status e o progresso do job de processamento",
)
async def consultar_status_processamento(job_id: str, dep=Depends(get_conn)):
    job = obter_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job de processamento {job_id} não encontrado.",
        )
    conn, _ = dep
    await _require_project_access(conn, str(job.get("projeto_id", "")))
    resultado = job.get("resultado") or {}
    return JobStatusResponse(
        job_id=job["id"],
        projeto_id=job.get("projeto_id", ""),
        status=job.get("status", resultado.get("status", "unknown")),
        stage=resultado.get("stage", "unknown"),
        progress=resultado.get("progress", 0),
        processed=resultado.get("processed", 0),
        total=resultado.get("total", 178),
        warnings=resultado.get("warnings", []),
        error=job.get("erro") or resultado.get("error"),
        reconciliados=resultado.get("reconciliados", 0),
        pendentes=resultado.get("pendentes", 0),
        valor_conciliado=resultado.get("valor_conciliado", 0.0),
        valor_pendente=resultado.get("valor_pendente", 0.0),
        regras_validacao=resultado.get("regras_validacao", []),
        criado_em=job.get("criado_em", ""),
        atualizado_em=job.get("atualizado_em", ""),
    )


@router.get(
    "/projetos/{projeto_id}/processamento-atual",
    response_model=Optional[JobStatusResponse],
    summary="Consulta o job mais recente para o projeto",
)
async def consultar_processamento_atual(projeto_id: str, dep=Depends(get_conn)):
    conn, _ = dep
    await _require_project_access(conn, projeto_id)
    job = obter_processamento_atual(projeto_id)
    if not job:
        return None
    resultado = job.get("resultado") or {}
    return JobStatusResponse(
        job_id=job["id"],
        projeto_id=job.get("projeto_id", ""),
        status=job.get("status", resultado.get("status", "unknown")),
        stage=resultado.get("stage", "unknown"),
        progress=resultado.get("progress", 0),
        processed=resultado.get("processed", 0),
        total=resultado.get("total", 178),
        warnings=resultado.get("warnings", []),
        error=job.get("erro") or resultado.get("error"),
        reconciliados=resultado.get("reconciliados", 0),
        pendentes=resultado.get("pendentes", 0),
        valor_conciliado=resultado.get("valor_conciliado", 0.0),
        valor_pendente=resultado.get("valor_pendente", 0.0),
        regras_validacao=resultado.get("regras_validacao", []),
        criado_em=job.get("criado_em", ""),
        atualizado_em=job.get("atualizado_em", ""),
    )


@router.post(
    "/processamentos/{job_id}/retry",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=IniciarProcessamentoResponse,
    summary="Reinicia a execução de um job que falhou ou foi interrompido",
)
async def reprocessar_job(
    job_id: str,
    background_tasks: BackgroundTasks,
    request: Request,
    dep=Depends(get_conn),
):
    job = obter_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job {job_id} não encontrado para reprocessamento.",
        )

    conn, user_id = dep
    projeto_id = job.get("projeto_id", "")
    await _require_project_access(conn, str(projeto_id))
    raw_payload = job.get("payload") or {}
    payload = ProcessarRequest(**{k: v for k, v in raw_payload.items() if k in ProcessarRequest.model_fields})
    idempotency_key = raw_payload.get("idempotency_key") or calcular_chave_idempotencia(projeto_id, payload)

    actor_id = user_id

    background_tasks.add_task(
        executar_pipeline,
        job_id=job_id,
        projeto_id=projeto_id,
        payload=payload,
        actor_id=actor_id,
    )

    return IniciarProcessamentoResponse(
        job_id=job_id,
        projeto_id=projeto_id,
        status=STATUS_QUEUED,
        stage="queued",
        progress=0,
        message="Reprocessamento iniciado em segundo plano.",
        status_url=f"/api/v1/processamentos/{job_id}",
        idempotency_key=idempotency_key,
        reused=False,
    )

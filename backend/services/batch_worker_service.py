import asyncio
import json
import logging
import uuid
from typing import Optional
from backend.config import settings
from backend.database import adquirir_conn
from backend.services import storage_service
from motor.ocr_service import extract_documento

logger = logging.getLogger("rouanet.batch_worker")

CONFIANCA_MINIMA = 0.85


async def reclaim_orphaned_jobs() -> int:
    """
    Recupera jobs que ficaram presos em PROCESSING caso o container/servidor
    tenha sido reiniciado no meio do processamento.
    """
    acquired_pool, conn = await adquirir_conn()
    try:
        updated = await conn.execute(
            """
            UPDATE processing_jobs
            SET status = 'PENDING', locked_by = NULL, locked_at = NULL, available_at = now(), updated_at = now()
            WHERE status = 'PROCESSING' AND (locked_at IS NULL OR locked_at < now() - interval '5 minutes')
            """
        )
        # Extrai quantidade de linhas afetadas (ex: 'UPDATE 3')
        count = int(updated.split(" ")[-1]) if " " in updated else 0
        if count > 0:
            logger.info("Recuperados %d jobs de processamento órfãos de reinicializações anteriores.", count)
        return count
    finally:
        await acquired_pool.release(conn)


async def process_single_file_job(job_id: str, file_id: str) -> bool:
    acquired_pool, conn = await adquirir_conn()
    worker_id = f"worker-{uuid.uuid4().hex[:8]}"
    try:
        # Lock atômico do job
        job = await conn.fetchrow(
            """
            UPDATE processing_jobs
            SET status = 'PROCESSING', locked_by = $1, locked_at = now(), attempts = attempts + 1, updated_at = now()
            WHERE id = $2 AND status = 'PENDING'
            RETURNING id, file_id, attempts, max_attempts
            """,
            worker_id, job_id
        )
        if not job:
            return False

        # Busca dados do arquivo
        file_row = await conn.fetchrow(
            """
            SELECT f.id, f.importacao_id, f.projeto_id, f.storage_key, f.browser_mime, f.original_name, f.size_bytes
            FROM import_files f
            WHERE f.id = $1
            """,
            file_id
        )
        if not file_row:
            await conn.execute("UPDATE processing_jobs SET status = 'FAILED', error_code = 'FILE_NOT_FOUND' WHERE id = $1", job_id)
            return False

        # Atualiza status do arquivo para EXTRACTING
        await conn.execute("UPDATE import_files SET status = 'EXTRACTING', updated_at = now() WHERE id = $1", file_id)

        # Baixa arquivo do storage
        conteudo = storage_service.baixar_arquivo(file_row["storage_key"])
        if not conteudo:
            await conn.execute(
                "UPDATE import_files SET status = 'FAILED', error_message = 'Arquivo não encontrado no storage' WHERE id = $1",
                file_id
            )
            await conn.execute("UPDATE processing_jobs SET status = 'FAILED', error_code = 'STORAGE_NOT_FOUND' WHERE id = $1", job_id)
            return False

        # Extrai dados via OCR / Texto Nativo
        mime_type = file_row["browser_mime"] or "application/pdf"
        dados = extract_documento(
            conteudo, mime_type, api_key=settings.google_api_key, backend=settings.ocr_backend, tentar_texto_nativo=True
        )

        if not dados:
            if job["attempts"] >= job["max_attempts"]:
                await conn.execute(
                    "UPDATE import_files SET status = 'FAILED', error_message = 'Falha na leitura após múltiplas tentativas' WHERE id = $1",
                    file_id
                )
                await conn.execute("UPDATE processing_jobs SET status = 'FAILED', error_code = 'OCR_FAILED' WHERE id = $1", job_id)
            else:
                await conn.execute(
                    "UPDATE processing_jobs SET status = 'PENDING', locked_by = NULL, available_at = now() + interval '10 seconds' WHERE id = $1",
                    job_id
                )
            return False

        confianca = dados.get("confianca_ocr", 0.0)
        revisao_pendente = confianca < CONFIANCA_MINIMA
        valor_total = dados.get("Valor_Total")
        projeto_id = file_row["projeto_id"]

        # Tenta casar com lançamento bancário do projeto
        matched_tx_id = None
        if valor_total is not None:
            # Procura transação bancária de débito com valor idêntico (com tolerância de 1 centavo)
            tx = await conn.fetchrow(
                """
                SELECT id, valor, fornecedor, data_pagamento
                FROM transacoes
                WHERE projeto_id = $1 AND abs(valor - $2) <= 0.01
                ORDER BY created_at ASC
                LIMIT 1
                """,
                projeto_id, float(valor_total)
            )
            if tx:
                matched_tx_id = tx["id"]

        async with conn.transaction():
            if matched_tx_id and not revisao_pendente:
                # Cria evidence link
                await conn.execute(
                    """
                    INSERT INTO evidence_links (lancamento_id, file_id, evidence_type, match_type)
                    VALUES ($1, $2, 'FISCAL_DOCUMENT', 'AUTO')
                    """,
                    matched_tx_id, file_id
                )
                final_status = "DONE"
            elif revisao_pendente:
                final_status = "REVIEW_REQUIRED"
                # Insere em campos_revisao
                await conn.execute(
                    """
                    INSERT INTO campos_revisao (transacao_id, campo, valor_extraido, confianca, status_revisao)
                    VALUES ($1, 'extracao_ocr', $2, $3, 'PENDENTE')
                    """,
                    matched_tx_id, json.dumps(dados, ensure_ascii=False), confianca
                )
            else:
                final_status = "CLASSIFIED"

            await conn.execute(
                "UPDATE import_files SET status = $1, updated_at = now() WHERE id = $2",
                final_status, file_id
            )
            await conn.execute(
                "UPDATE processing_jobs SET status = 'COMPLETED', updated_at = now() WHERE id = $1",
                job_id
            )
            await conn.execute(
                """
                INSERT INTO processing_events (file_id, status, details)
                VALUES ($1, $2, $3::jsonb)
                """,
                file_id, f"PROCESSED_{final_status}", json.dumps({
                    "confianca": confianca,
                    "matched_tx_id": str(matched_tx_id) if matched_tx_id else None,
                    "fonte": dados.get("_fonte_extracao", "gemini")
                })
            )

        return True
    except Exception as e:
        logger.exception("Erro ao processar job %s para arquivo %s: %s", job_id, file_id, e)
        try:
            await conn.execute(
                "UPDATE import_files SET status = 'FAILED', error_message = $1 WHERE id = $2",
                str(e)[:250], file_id
            )
            await conn.execute("UPDATE processing_jobs SET status = 'FAILED', error_code = 'UNCAUGHT_ERROR' WHERE id = $1", job_id)
        except Exception:
            pass
        return False
    finally:
        await acquired_pool.release(conn)


async def execute_batch_processing_loop(limit: int = 50) -> int:
    """
    Executa uma rodada de processamento consumindo jobs pendentes da fila com concorrência controlada.
    """
    acquired_pool, conn = await adquirir_conn()
    try:
        pending_jobs = await conn.fetch(
            """
            SELECT id, file_id FROM processing_jobs
            WHERE status = 'PENDING' AND available_at <= now()
            ORDER BY created_at ASC
            LIMIT $1
            """,
            limit
        )
    finally:
        await acquired_pool.release(conn)

    if not pending_jobs:
        return 0

    semaphore = asyncio.Semaphore(settings.batch_worker_concurrency)

    async def _worker_task(job):
        async with semaphore:
            return await process_single_file_job(str(job["id"]), str(job["file_id"]))

    results = await asyncio.gather(*[_worker_task(j) for j in pending_jobs], return_exceptions=True)
    sucessos = sum(1 for r in results if r is True)
    logger.info("Batch processing finalizado: %d/%d jobs concluídos com sucesso.", sucessos, len(pending_jobs))
    return sucessos

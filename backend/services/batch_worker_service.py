import asyncio
from datetime import datetime, timezone
from decimal import Decimal
import json
import logging
from typing import Optional, Tuple
import uuid

from backend.config import settings
from backend.database import adquirir_conn
from backend.services import storage_service
from motor.ocr_service import extract_documento

logger = logging.getLogger("rouanet.batch_worker")

CONFIANCA_MINIMA = 0.85
PIPELINE_VERSION = "2.0.0"

_worker_stop_event: Optional[asyncio.Event] = None
_worker_task: Optional[asyncio.Task] = None


async def reclaim_orphaned_jobs() -> int:
    """
    Recupera jobs que ficaram presos em PROCESSING caso o container/servidor
    tenha sido reiniciado no meio do processamento (preserva attempts).
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
        # 1. Lock atômico do job
        job = await conn.fetchrow(
            """
            UPDATE processing_jobs
            SET status = 'PROCESSING', locked_by = $1, locked_at = now(),
                attempts = attempts + 1, last_attempt_at = now(), updated_at = now()
            WHERE id = $2 AND status = 'PENDING'
            RETURNING id, file_id, attempts, max_attempts
            """,
            worker_id, job_id
        )
        if not job:
            return False

        # 2. Busca dados do arquivo
        file_row = await conn.fetchrow(
            """
            SELECT f.id, f.importacao_id, f.projeto_id, f.storage_key, f.browser_mime, f.original_name, f.size_bytes, f.sha256
            FROM import_files f
            WHERE f.id = $1
            """,
            file_id
        )
        if not file_row:
            await conn.execute(
                "UPDATE processing_jobs SET status = 'FAILED', error_code = 'FILE_NOT_FOUND', completed_at = now(), updated_at = now() WHERE id = $1",
                job_id
            )
            return False

        # 3. Transição para EXTRACTING
        await conn.execute("UPDATE import_files SET status = 'EXTRACTING', updated_at = now() WHERE id = $1", file_id)
        await conn.execute(
            """
            INSERT INTO processing_events (file_id, status, details)
            VALUES ($1, 'EXTRACTING', '{"action": "started_extraction"}'::jsonb)
            """,
            file_id
        )

        # 4. Baixar arquivo do storage
        conteudo = storage_service.baixar_arquivo(file_row["storage_key"])
        if not conteudo:
            await conn.execute(
                "UPDATE import_files SET status = 'FAILED', error_message = 'Arquivo não encontrado no storage', updated_at = now() WHERE id = $1",
                file_id
            )
            await conn.execute(
                "UPDATE processing_jobs SET status = 'FAILED', error_code = 'STORAGE_NOT_FOUND', completed_at = now(), updated_at = now() WHERE id = $1",
                job_id
            )
            await conn.execute(
                """
                INSERT INTO processing_events (file_id, status, details)
                VALUES ($1, 'FAILED', '{"error": "storage_file_not_found"}'::jsonb)
                """,
                file_id
            )
            return False

        # 5. Extração OCR / Texto Nativo
        mime_type = file_row["browser_mime"] or "application/pdf"
        dados = extract_documento(
            conteudo, mime_type, api_key=settings.google_api_key, backend=settings.ocr_backend, tentar_texto_nativo=True
        )

        if not dados:
            if job["attempts"] >= job["max_attempts"]:
                await conn.execute(
                    "UPDATE import_files SET status = 'FAILED', error_message = 'Falha na leitura após múltiplas tentativas', updated_at = now() WHERE id = $1",
                    file_id
                )
                await conn.execute(
                    "UPDATE processing_jobs SET status = 'FAILED', error_code = 'OCR_FAILED', completed_at = now(), updated_at = now() WHERE id = $1",
                    job_id
                )
                await conn.execute(
                    """
                    INSERT INTO processing_events (file_id, status, details)
                    VALUES ($1, 'FAILED', '{"error": "max_attempts_exceeded"}'::jsonb)
                    """,
                    file_id
                )
            else:
                await conn.execute(
                    """
                    UPDATE processing_jobs
                    SET status = 'PENDING', locked_by = NULL, locked_at = NULL, available_at = now() + interval '10 seconds', updated_at = now()
                    WHERE id = $1
                    """,
                    job_id
                )
                await conn.execute(
                    """
                    INSERT INTO processing_events (file_id, status, details)
                    VALUES ($1, 'RETRY', json_build_object('attempt', $2::int, 'reason', 'ocr_retry')::jsonb)
                    """,
                    file_id, job["attempts"]
                )
            return False

        # 6. Extração com sucesso -> registrar EXTRACTED
        confianca = float(dados.get("confianca_ocr", 0.0))
        revisao_pendente = confianca < CONFIANCA_MINIMA
        valor_total_raw = dados.get("Valor_Total")
        valor_liquido = Decimal(str(valor_total_raw)) if valor_total_raw is not None else None
        projeto_id = file_row["projeto_id"]

        await conn.execute(
            """
            INSERT INTO processing_events (file_id, status, details)
            VALUES ($1, 'EXTRACTED', $2::jsonb)
            """,
            file_id, json.dumps({
                "confianca": confianca,
                "fonte": dados.get("_fonte_extracao", "native_pdf_text"),
                "numero_doc": dados.get("Numero_Nota_Recibo"),
                "valor": float(valor_liquido) if valor_liquido is not None else None,
                "cnpj_cpf": dados.get("CNPJ_CPF")
            })
        )

        # 7. Persistir resultado normalizado em extraction_results
        extraction_res = await conn.fetchrow(
            """
            INSERT INTO extraction_results (
                file_id, projeto_id, extractor_name, extractor_version, document_type,
                numero_documento, data_emissao, valor_bruto, valor_liquido,
                cnpj_cpf_emissor, nome_emissor, recibo_numero, confidence, raw_payload, source_system
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, 'pipeline_v2')
            ON CONFLICT (file_id, extractor_name, extractor_version)
            DO UPDATE SET
                valor_liquido = EXCLUDED.valor_liquido,
                numero_documento = EXCLUDED.numero_documento,
                confidence = EXCLUDED.confidence,
                raw_payload = EXCLUDED.raw_payload,
                updated_at = now()
            RETURNING id
            """,
            file_id,
            projeto_id,
            dados.get("_fonte_extracao", "native_pdf_text"),
            PIPELINE_VERSION,
            "NFSE" if dados.get("is_ginfes") else "DOCUMENTO_FISCAL",
            dados.get("Numero_Nota_Recibo"),
            datetime.strptime(dados["Data_Emissao"], "%Y-%m-%d").date() if dados.get("Data_Emissao") else None,
            valor_liquido,
            valor_liquido,
            dados.get("CNPJ_CPF"),
            dados.get("Razao_Social"),
            dados.get("Recibo_Numero"),
            confianca,
            json.dumps(dados, ensure_ascii=False)
        )
        extraction_result_id = extraction_res["id"] if extraction_res else None

        # 8. Avaliação rigorosa de candidatos à conciliação (Sem falsos positivos!)
        candidatos = []
        if valor_liquido is not None:
            # Busca todas as transações com valor idêntico (tolerância 1 centavo)
            candidatos = await conn.fetch(
                """
                SELECT id, valor, fornecedor, data_pagamento, documento_bancario
                FROM transacoes
                WHERE projeto_id = $1 AND abs(valor - $2) <= 0.01
                ORDER BY created_at ASC
                """,
                projeto_id, float(valor_liquido)
            )

        async with conn.transaction():
            final_status = "CLASSIFIED"
            matched_tx_id = None

            if len(candidatos) > 1:
                # Ambiguidade: mais de um candidato com mesmo valor -> OBRIGATÓRIO envio para revisão humana
                final_status = "REVIEW_REQUIRED"
                for cand in candidatos:
                    await conn.execute(
                        """
                        INSERT INTO reconciliation_candidates (
                            projeto_id, lancamento_id, file_id, extraction_result_id,
                            rule_applied, rule_version, score, decision, decision_reason, candidate_details
                        )
                        VALUES ($1, $2, $3, $4, 'AMBIGUOUS_MULTI_MATCH', $5, 0.5000, 'AMBIGUOUS',
                                'Mais de um lançamento com o mesmo valor encontrado. Decisão humana necessária.', $6::jsonb)
                        """,
                        projeto_id, cand["id"], file_id, extraction_result_id, PIPELINE_VERSION,
                        json.dumps({"candidatos_count": len(candidatos), "fornecedor": cand["fornecedor"]})
                    )
                await conn.execute(
                    """
                    INSERT INTO processing_events (file_id, status, details)
                    VALUES ($1, 'REVIEW_REQUIRED', json_build_object('reason', 'ambiguous_candidates_count', 'count', $2::int)::jsonb)
                    """,
                    file_id, len(candidatos)
                )

            elif len(candidatos) == 1:
                cand = candidatos[0]
                matched_tx_id = cand["id"]

                # Regra: só aprova automaticamente se confiança alta E sem ambiguidade
                if not revisao_pendente and confianca >= CONFIANCA_MINIMA:
                    final_status = "DONE"
                    # Insere candidate aprovado
                    await conn.execute(
                        """
                        INSERT INTO reconciliation_candidates (
                            projeto_id, lancamento_id, file_id, extraction_result_id,
                            rule_applied, rule_version, score, decision, decision_reason, candidate_details
                        )
                        VALUES ($1, $2, $3, $4, 'EXACT_VALUE_CONFIRMED', $5, $6, 'AUTO_MATCHED',
                                'Valor e documento consistentes com confiança >= 0.85.', $7::jsonb)
                        """,
                        projeto_id, matched_tx_id, file_id, extraction_result_id, PIPELINE_VERSION,
                        confianca, json.dumps({"valor": float(valor_liquido), "fornecedor": cand["fornecedor"]})
                    )
                    # Cria vínculo oficial de evidência
                    await conn.execute(
                        """
                        INSERT INTO evidence_links (lancamento_id, file_id, evidence_type, match_type)
                        VALUES ($1, $2, 'FISCAL_DOCUMENT', 'AUTO')
                        """,
                        matched_tx_id, file_id
                    )
                    await conn.execute(
                        """
                        INSERT INTO processing_events (file_id, status, details)
                        VALUES ($1, 'DONE', json_build_object('matched_tx_id', $2::text, 'confianca', $3::float)::jsonb)
                        """,
                        file_id, str(matched_tx_id), confianca
                    )
                else:
                    final_status = "REVIEW_REQUIRED"
                    await conn.execute(
                        """
                        INSERT INTO reconciliation_candidates (
                            projeto_id, lancamento_id, file_id, extraction_result_id,
                            rule_applied, rule_version, score, decision, decision_reason, candidate_details
                        )
                        VALUES ($1, $2, $3, $4, 'LOW_CONFIDENCE_MATCH', $5, $6, 'PENDING',
                                'Confiança abaixo do limiar (0.85). Revisão humana obrigatória.', $7::jsonb)
                        """,
                        projeto_id, matched_tx_id, file_id, extraction_result_id, PIPELINE_VERSION,
                        confianca, json.dumps({"motivos": dados.get("_motivos_confianca", [])})
                    )
                    await conn.execute(
                        """
                        INSERT INTO campos_revisao (transacao_id, campo, valor_extraido, confianca, status_revisao)
                        VALUES ($1, 'extracao_ocr', $2, $3, 'PENDENTE')
                        """,
                        matched_tx_id, json.dumps(dados, ensure_ascii=False), confianca
                    )
                    await conn.execute(
                        """
                        INSERT INTO processing_events (file_id, status, details)
                        VALUES ($1, 'REVIEW_REQUIRED', json_build_object('reason', 'low_confidence', 'confianca', $2::float)::jsonb)
                        """,
                        file_id, confianca
                    )
            else:
                # Nenhum lançamento correspondente encontrado
                final_status = "CLASSIFIED"
                await conn.execute(
                    """
                    INSERT INTO processing_events (file_id, status, details)
                    VALUES ($1, 'CLASSIFIED', '{"action": "document_classified_unmatched"}'::jsonb)
                    """,
                    file_id
                )

            # Atualiza status final do arquivo
            await conn.execute(
                "UPDATE import_files SET status = $1, updated_at = now() WHERE id = $2",
                final_status, file_id
            )

            # Conclui o job
            await conn.execute(
                """
                UPDATE processing_jobs
                SET status = 'COMPLETED', completed_at = now(), updated_at = now()
                WHERE id = $1
                """,
                job_id
            )

        return True
    except Exception as e:
        logger.exception("Erro ao processar job %s para arquivo %s: %s", job_id, file_id, e)
        try:
            await conn.execute(
                "UPDATE import_files SET status = 'FAILED', error_message = $1, updated_at = now() WHERE id = $2",
                str(e)[:250], file_id
            )
            await conn.execute(
                "UPDATE processing_jobs SET status = 'FAILED', error_code = 'UNCAUGHT_ERROR', completed_at = now(), updated_at = now() WHERE id = $1",
                job_id
            )
            await conn.execute(
                """
                INSERT INTO processing_events (file_id, status, details)
                VALUES ($1, 'FAILED', json_build_object('error', $2::text)::jsonb)
                """,
                file_id, str(e)[:250]
            )
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

    async def _worker_task_fn(job):
        async with semaphore:
            return await process_single_file_job(str(job["id"]), str(job["file_id"]))

    results = await asyncio.gather(*[_worker_task_fn(j) for j in pending_jobs], return_exceptions=True)
    sucessos = sum(1 for r in results if r is True)
    logger.info("Batch processing finalizado: %d/%d jobs concluídos com sucesso.", sucessos, len(pending_jobs))
    return sucessos


async def _queue_worker_runner(stop_event: asyncio.Event, interval: int = 5):
    logger.info("Batch worker runner em background iniciado (intervalo=%ds).", interval)
    while not stop_event.is_set():
        try:
            await execute_batch_processing_loop(limit=25)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.warning("Erro durante rodada do batch worker runner: %s", e)

        try:
            await asyncio.wait_for(stop_event.wait(), timeout=interval)
        except asyncio.TimeoutError:
            pass
    logger.info("Batch worker runner em background finalizado.")


def start_queue_worker_loop(interval: Optional[int] = None) -> Tuple[asyncio.Task, asyncio.Event]:
    """
    Inicia o loop contínuo de consumo da fila de processamento em background (lifespan FastAPI).
    """
    global _worker_stop_event, _worker_task
    _worker_stop_event = asyncio.Event()
    poll_interval = interval or getattr(settings, "batch_worker_interval_seconds", 5)
    _worker_task = asyncio.create_task(_queue_worker_runner(_worker_stop_event, poll_interval))
    return _worker_task, _worker_stop_event

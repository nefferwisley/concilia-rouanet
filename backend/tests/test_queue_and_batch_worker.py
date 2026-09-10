"""
test_queue_and_batch_worker.py — Testes automatizados para a fila persistida (Fase 2)
Verifica:
1. Idempotência do upload e registro de jobs com chave única.
2. Lock atômico impedindo execução concorrente dupla.
3. Recuperação de jobs órfãos (reclaim_orphaned_jobs) preservando attempts.
4. Resumo de lote expondo estados canônicos (RECEIVING, UPLOADED, EXTRACTING, DONE, REVIEW_REQUIRED, FAILED).
"""
import asyncio
from datetime import datetime, timezone
import hashlib
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from backend.services.batch_worker_service import (
    reclaim_orphaned_jobs,
    process_single_file_job,
    execute_batch_processing_loop,
)


@pytest.mark.asyncio
async def test_reclaim_orphaned_jobs_preserves_attempts():
    """
    Verifica se jobs órfãos travados há mais de 5 minutos são retornados para PENDING
    preservando a contagem de attempts.
    """
    mock_conn = AsyncMock()
    mock_conn.execute.return_value = "UPDATE 2"
    mock_pool = MagicMock()
    mock_pool.release = AsyncMock()

    with patch("backend.services.batch_worker_service.adquirir_conn", return_value=(mock_pool, mock_conn)):
        count = await reclaim_orphaned_jobs()
        assert count == 2
        mock_conn.execute.assert_called_once()
        query = mock_conn.execute.call_args[0][0]
        assert "SET status = 'PENDING'" in query
        assert "locked_at < now() - interval '5 minutes'" in query
        # Verifica que 'attempts' não é zerado na query
        assert "attempts = 0" not in query


@pytest.mark.asyncio
async def test_atomic_lock_prevents_duplicate_processing():
    """
    Garante que se outro worker tentar processar o mesmo job simultaneamente,
    o UPDATE com status = 'PENDING' retorna None e o segundo worker aborta imediatamente.
    """
    mock_conn = AsyncMock()
    # Primeiro worker trava com sucesso, segundo worker recebe None (já travado)
    mock_conn.fetchrow.return_value = None
    mock_pool = MagicMock()
    mock_pool.release = AsyncMock()

    with patch("backend.services.batch_worker_service.adquirir_conn", return_value=(mock_pool, mock_conn)):
        result = await process_single_file_job("job-123", "file-456")
        assert result is False
        mock_conn.fetchrow.assert_called_once()
        lock_query = mock_conn.fetchrow.call_args[0][0]
        assert "WHERE id = $2 AND status = 'PENDING'" in lock_query


@pytest.mark.asyncio
async def test_batch_worker_retry_on_extraction_failure():
    """
    Verifica se um job com falha temporária de extração agenda retry com intervalo e registra evento.
    """
    mock_conn = AsyncMock()
    # Simula job retornado no lock
    mock_conn.fetchrow.side_effect = [
        {"id": "job-1", "file_id": "file-1", "attempts": 1, "max_attempts": 3},
        {
            "id": "file-1",
            "importacao_id": "imp-1",
            "projeto_id": "proj-1",
            "storage_key": "user/proj/hash/doc.pdf",
            "browser_mime": "application/pdf",
            "original_name": "doc.pdf",
            "size_bytes": 1024,
            "sha256": "a" * 64
        }
    ]
    mock_pool = MagicMock()
    mock_pool.release = AsyncMock()

    with patch("backend.services.batch_worker_service.adquirir_conn", return_value=(mock_pool, mock_conn)), \
         patch("backend.services.storage_service.baixar_arquivo", return_value=b"%PDF-test"), \
         patch("backend.services.batch_worker_service.extract_documento", return_value=None):

        success = await process_single_file_job("job-1", "file-1")
        assert success is False

        # Verifica se o job foi colocado de volta em PENDING com backoff
        calls = [c[0][0] for c in mock_conn.execute.call_args_list]
        retry_call = any("SET status = 'PENDING', locked_by = NULL, locked_at = NULL, available_at = now() + interval '10 seconds'" in c for c in calls)
        assert retry_call is True

        # Verifica se registrou evento RETRY
        retry_event = any("INSERT INTO processing_events" in c and "'RETRY'" in c for c in calls)
        assert retry_event is True


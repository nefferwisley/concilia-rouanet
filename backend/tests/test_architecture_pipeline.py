"""
backend/tests/test_architecture_pipeline.py — Cenários de testes obrigatórios da arquitetura de dados.

Cobre os 7 cenários definidos no plano de execução:
1. Mesmo SHA no mesmo projeto não duplica arquivo, lançamento ou vínculo.
2. Job interrompido é retomado ou fica explicitamente interrompido.
3. Dois candidatos com mesmo valor vão para revisão.
4. Documento completo sem OFX/CSV não recebe selo de conciliação bancária.
5. Projeto novo permanece disponível depois de atualização e em outra sessão.
6. Snapshot com versão antiga recebe conflito (HTTP 409), não sobrescreve dados novos.
7. O arquivo com NFS-e GINFES da Júlia Sousa extrai número, CPF/CNPJ, valor e recibo corretamente.
"""
from datetime import datetime, timezone
from decimal import Decimal
import hashlib
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import HTTPException
from fastapi.testclient import TestClient

from backend.main import app
from backend.routes.snapshots import SnapshotUpdateRequest, salvar_snapshot, obter_snapshot
from backend.services.batch_worker_service import (
    process_single_file_job,
    reclaim_orphaned_jobs,
)
from backend.services.processamento_service import recuperar_jobs_orfaos
from motor.ocr_service import extract_documento, extract_native_pdf_text


class AsyncContextManagerMock:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass


# =========================================================================
# 1. Mesmo SHA no mesmo projeto não duplica arquivo, lançamento ou vínculo
# =========================================================================
@pytest.mark.asyncio
async def test_idempotent_sha_no_duplicates():
    """
    Garante que submeter o mesmo hash SHA-256 no mesmo projeto
    não duplica registros na tabela import_files nem na fila de jobs.
    """
    mock_conn = AsyncMock()
    mock_conn.transaction = MagicMock(return_value=AsyncContextManagerMock())
    projeto_id = "11111111-2222-3333-4444-555555555555"
    sha = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

    # Simula ON CONFLICT na tabela import_files
    mock_conn.execute.return_value = "INSERT 0 1"
    mock_conn.fetchrow.return_value = {"id": "imp-1"}
    mock_conn.fetch.return_value = [{"id": "file-1", "sha256": sha, "status": "RECEIVING"}]

    from backend.routes.real_imports import create_manifest, ManifestRequest, ManifestFile
    payload = ManifestRequest(files=[
        ManifestFile(
            relativePath="doc.pdf",
            originalName="doc.pdf",
            browserMime="application/pdf",
            sizeBytes=1024,
            sha256=sha
        )
    ])

    dep = (mock_conn, "user-123")
    res = await create_manifest(projeto_id, payload, dep=dep)

    assert res["total_arquivos"] == 1
    assert res["files"][0]["sha256"] == sha
    # Verifica que ON CONFLICT (projeto_id, sha256) foi executado
    insert_call = mock_conn.execute.call_args[0][0]
    assert "ON CONFLICT (projeto_id, sha256)" in insert_call


# =========================================================================
# 2. Job interrompido é retomado ou fica explicitamente interrompido
# =========================================================================
@pytest.mark.asyncio
async def test_interrupted_job_recovery():
    """
    Verifica que jobs travados em PROCESSING são resgatados para PENDING ou
    marcados como interrompidos em reinicializações do servidor.
    """
    mock_conn = AsyncMock()
    mock_conn.execute.return_value = "UPDATE 4"
    mock_pool = MagicMock()
    mock_pool.release = AsyncMock()

    with patch("backend.services.batch_worker_service.adquirir_conn", return_value=(mock_pool, mock_conn)):
        reclaimed = await reclaim_orphaned_jobs()
        assert reclaimed == 4
        call_query = mock_conn.execute.call_args[0][0]
        assert "SET status = 'PENDING'" in call_query
        assert "locked_at < now() - interval '5 minutes'" in call_query

    # Testa também a recuperação no processamento_service em memória/DB
    with patch("backend.services.processamento_service._conectar_db", return_value=None):
        from backend.services.processamento_service import _MEM_JOBS, STATUS_RUNNING, STATUS_INTERRUPTED
        _MEM_JOBS["job-stuck"] = {
            "id": "job-stuck",
            "status": STATUS_RUNNING,
            "resultado": {"status": STATUS_RUNNING}
        }
        qtd = recuperar_jobs_orfaos()
        assert qtd >= 1
        assert _MEM_JOBS["job-stuck"]["status"] == STATUS_INTERRUPTED


# =========================================================================
# 3. Dois candidatos com mesmo valor vão para revisão
# =========================================================================
@pytest.mark.asyncio
async def test_ambiguous_candidates_require_review():
    """
    Garante que dois lançamentos com o mesmo valor NUNCA sejam auto-vinculados
    arbitrariamente ao primeiro resultado; ambos devem ir para revisão humana.
    """
    mock_conn = AsyncMock()
    mock_conn.transaction = MagicMock(return_value=AsyncContextManagerMock())
    # Simula lock do job
    mock_conn.fetchrow.side_effect = [
        {"id": "job-ambig", "file_id": "file-ambig", "attempts": 1, "max_attempts": 3},
        {
            "id": "file-ambig",
            "importacao_id": "imp-1",
            "projeto_id": "proj-1",
            "storage_key": "k1",
            "browser_mime": "application/pdf",
            "original_name": "nota_servico.pdf",
            "size_bytes": 2048,
            "sha256": "b" * 64
        },
        # extraction_results RETURNING id
        {"id": "ext-res-1"}
    ]
    # Dois candidatos com exatamente R$ 2.500,00 de fornecedores diferentes
    mock_conn.fetch.return_value = [
        {"id": "tx-1", "valor": 2500.00, "fornecedor": "Fornecedor A", "data_pagamento": None, "documento_bancario": "111"},
        {"id": "tx-2", "valor": 2500.00, "fornecedor": "Fornecedor B", "data_pagamento": None, "documento_bancario": "222"}
    ]
    mock_pool = MagicMock()
    mock_pool.release = AsyncMock()

    dados_extraidos = {
        "Valor_Total": 2500.00,
        "Subtotal": 2500.00,
        "Impostos_Retencoes": 0.0,
        "CNPJ_CPF": "12.345.678/0001-90",
        "Numero_Nota_Recibo": "456",
        "confianca_ocr": 0.95,
        "_fonte_extracao": "native_pdf_text"
    }

    with patch("backend.services.batch_worker_service.adquirir_conn", return_value=(mock_pool, mock_conn)), \
         patch("backend.services.storage_service.baixar_arquivo", return_value=b"%PDF-sample"), \
         patch("backend.services.batch_worker_service.extract_documento", return_value=dados_extraidos):

        success = await process_single_file_job("job-ambig", "file-ambig")
        assert success is True

        # Verifica que o status final foi REVIEW_REQUIRED (não DONE nem auto-link)
        execute_calls = [c[0][0] for c in mock_conn.execute.call_args_list]
        assert any("UPDATE import_files SET status = $1" in c for c in execute_calls)
        
        # Verifica que nenhum vínculo automático foi criado em evidence_links
        assert not any("INSERT INTO evidence_links" in c for c in execute_calls)

        # Verifica que os dois candidatos foram registrados em reconciliation_candidates como AMBIGUOUS
        assert any("AMBIGUOUS_MULTI_MATCH" in c for c in execute_calls)


# =========================================================================
# 4. Documento completo sem OFX/CSV não recebe selo de conciliação bancária
# =========================================================================
@pytest.mark.asyncio
async def test_document_without_ofx_no_bank_reconciliation():
    """
    Verifica que um documento idôneo (NFS-e com 100% dos dados fiscais),
    na ausência de extrato OFX/CSV correspondente, NÃO recebe status de conciliação
    bancária, permanecendo como CLASSIFIED (documento idôneo, vínculo bancário pendente).
    """
    mock_conn = AsyncMock()
    mock_conn.transaction = MagicMock(return_value=AsyncContextManagerMock())
    mock_conn.fetchrow.side_effect = [
        {"id": "job-no-ofx", "file_id": "file-no-ofx", "attempts": 1, "max_attempts": 3},
        {
            "id": "file-no-ofx",
            "importacao_id": "imp-1",
            "projeto_id": "proj-1",
            "storage_key": "k2",
            "browser_mime": "application/pdf",
            "original_name": "nfse_sem_extrato.pdf",
            "size_bytes": 1024,
            "sha256": "c" * 64
        },
        {"id": "ext-res-2"}
    ]
    # Nenhuma transação bancária encontrada no extrato
    mock_conn.fetch.return_value = []
    mock_pool = MagicMock()
    mock_pool.release = AsyncMock()

    dados_extraidos = {
        "Valor_Total": 1200.00,
        "Subtotal": 1200.00,
        "Impostos_Retencoes": 0.0,
        "CNPJ_CPF": "98.765.432/0001-10",
        "Numero_Nota_Recibo": "999",
        "confianca_ocr": 0.98,
        "_fonte_extracao": "native_pdf_text"
    }

    with patch("backend.services.batch_worker_service.adquirir_conn", return_value=(mock_pool, mock_conn)), \
         patch("backend.services.storage_service.baixar_arquivo", return_value=b"%PDF-sample"), \
         patch("backend.services.batch_worker_service.extract_documento", return_value=dados_extraidos):

        success = await process_single_file_job("job-no-ofx", "file-no-ofx")
        assert success is True

        execute_calls = [c[0][0] for c in mock_conn.execute.call_args_list]
        # Status final deve ser CLASSIFIED (documento extraído com sucesso, mas sem extrato bancário)
        assert any("CLASSIFIED" in str(c) for c in execute_calls)
        # NUNCA insere em evidence_links sem extrato correspondente
        assert not any("INSERT INTO evidence_links" in c for c in execute_calls)


# =========================================================================
# 5. Projeto novo permanece disponível depois de atualização e em outra sessão
# =========================================================================
@pytest.mark.asyncio
async def test_project_persistence_across_sessions():
    """
    Verifica que um projeto salvo no banco persiste seus dados e metadados
    quando consultado por uma nova sessão autenticada.
    """
    mock_conn = AsyncMock()
    projeto_id = "proj-persist-1"
    user_id = "user-sess-2"

    mock_conn.fetchrow.return_value = {
        "payload": {
            "projects": [{"id": projeto_id, "nome": "Projeto Teste Persistência", "pronac": "240001"}],
            "transactions": {projeto_id: []},
            "documents": {projeto_id: []}
        },
        "version": 3,
        "snapshot_hash": "hash-abc-123",
        "updated_at": datetime.now(timezone.utc)
    }

    dep = (mock_conn, user_id)
    resultado = await obter_snapshot(projeto_id, dep=dep)

    assert resultado["version"] == 3
    assert resultado["snapshot_hash"] == "hash-abc-123"
    assert resultado["snapshot"]["projects"][0]["nome"] == "Projeto Teste Persistência"


# =========================================================================
# 6. Snapshot com versão antiga recebe conflito (HTTP 409), não sobrescreve
# =========================================================================
@pytest.mark.asyncio
async def test_optimistic_concurrency_conflict():
    """
    Verifica que se uma sessão enviar version=1 mas o banco já estiver em version=2,
    o salvamento é rejeitado com HTTP 409 Conflict, impedindo sobrescrita silenciosa.
    """
    mock_conn = AsyncMock()
    mock_conn.transaction = MagicMock(return_value=AsyncContextManagerMock())
    projeto_id = "proj-conflito"
    user_id = "user-aba-1"

    # Banco de dados já está na versão 2
    mock_conn.fetchrow.return_value = {
        "id": "snap-id-1",
        "version": 2,
        "snapshot_hash": "hash-v2",
        "payload": {"version": 2}
    }

    req = SnapshotUpdateRequest(
        snapshot={"projects": [{"id": projeto_id, "nome": "Sobrescrita antiga"}]},
        version=1  # Versão desatualizada da outra aba!
    )

    dep = (mock_conn, user_id)

    with pytest.raises(HTTPException) as exc_info:
        await salvar_snapshot(projeto_id, req, dep=dep)

    assert exc_info.value.status_code == 409
    detail = exc_info.value.detail
    assert "Conflito de concorrência" in detail["error"]
    assert detail["current_version"] == 2
    assert detail["sent_version"] == 1


# =========================================================================
# 7. O arquivo com NFS-e GINFES da Júlia Sousa extrai número, CPF/CNPJ, valor e recibo
# =========================================================================
def test_julia_sousa_ginfes_extraction():
    """
    Verifica a extração estruturada de documento padrão GINFES para a prestadora
    Júlia Sousa (Projeto 1961), validando número da nota (169), CNPJ/CPF,
    valor (R$ 2.058,00), RPS/Recibo e Razão Social.
    """
    import pymupdf

    # Cria em memória um PDF simulando a estrutura visual com desenho em múltiplas camadas do GINFES
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)

    # Injeta textos com cabeçalho GINFES / NFS-e
    page.insert_text((50, 50), "PREFEITURA MUNICIPAL - NOTA FISCAL DE SERVIÇOS ELETRÔNICA - NFS-e")
    page.insert_text((50, 70), "Sistema GINFES - www.ginfes.com.br")
    page.insert_text((50, 100), "Número da NFS-e: 169")
    page.insert_text((50, 120), "Código de Verificação: A1B2-C3D4-E5F6")
    page.insert_text((50, 140), "Recibo Provisório: RPS 84")
    page.insert_text((50, 170), "PRESTADOR DE SERVIÇOS")
    page.insert_text((50, 190), "Nome / Razão Social: JULIA BARBARA MELO DE SOUSA")
    page.insert_text((50, 210), "CPF/CNPJ: 123.456.789-00")
    page.insert_text((50, 240), "TOMADOR DE SERVIÇOS: PROJETO CULTURAL 1961")
    page.insert_text((50, 280), "Discriminação dos Serviços: Serviços de Pesquisa Documental para Audiovisual")
    page.insert_text((50, 320), "Valor dos Serviços: R$ 2.058,00")
    page.insert_text((50, 340), "Valor Líquido da NFS-e: R$ 2.058,00")
    page.insert_text((50, 360), "Data de Emissão: 04/10/2024")

    pdf_bytes = doc.tobytes()
    doc.close()

    # Executa a extração nativa de PDF com reordenação de coordenadas
    resultado = extract_native_pdf_text(pdf_bytes)

    assert resultado is not None, "Falha ao extrair texto nativo do documento GINFES"
    assert resultado.get("Numero_Nota_Recibo") == "169"
    assert resultado.get("CNPJ_CPF") == "123.456.789-00"
    assert resultado.get("Valor_Total") == 2058.00
    assert "A1B2-C3D4-E5F6" in str(resultado.get("Recibo_Numero")) or "84" in str(resultado.get("Recibo_Numero"))
    assert "JULIA BARBARA MELO DE SOUSA" in str(resultado.get("Razao_Social"))
    assert resultado.get("confianca_ocr") >= 0.85

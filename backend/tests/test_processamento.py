import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.processamento_service import (
    ProcessarRequest,
    calcular_chave_idempotencia,
    criar_job,
    obter_job,
    obter_processamento_atual,
    executar_pipeline,
    recuperar_jobs_orfaos,
    STATUS_QUEUED,
    STATUS_RUNNING,
    STATUS_NEEDS_REVIEW,
    STATUS_INTERRUPTED,
    _MEM_JOBS,
    _MEM_IDEMPOTENCY,
)

client = TestClient(app)


@pytest.fixture(autouse=True)
def limpar_memoria():
    _MEM_JOBS.clear()
    _MEM_IDEMPOTENCY.clear()
    yield
    _MEM_JOBS.clear()
    _MEM_IDEMPOTENCY.clear()


def test_calcular_chave_idempotencia():
    req1 = ProcessarRequest(manifest_hash="abc123hash")
    key1 = calcular_chave_idempotencia("1961", req1)
    key2 = calcular_chave_idempotencia("1961", req1)
    assert key1 == key2
    assert len(key1) == 64

    # Chave explícita é honrada
    req_custom = ProcessarRequest(idempotency_key="custom-key-999")
    assert calcular_chave_idempotencia("1961", req_custom) == "custom-key-999"


def test_iniciar_processamento_endpoint_202():
    response = client.post(
        "/api/v1/projetos/1961/processar",
        json={"fonte": "auto", "manifest_hash": "manifest-test-01"},
    )
    assert response.status_code == 202
    data = response.json()
    assert "job_id" in data
    assert data["projeto_id"] == "1961"
    assert data["status"] in (STATUS_QUEUED, STATUS_RUNNING, STATUS_NEEDS_REVIEW)
    assert "/api/v1/processamentos/" in data["status_url"]
    assert data["reused"] is False


def test_processamento_idempotencia_sem_duplicacao():
    payload = {"fonte": "auto", "manifest_hash": "manifest-idempotente-01"}

    res1 = client.post("/api/v1/projetos/1961/processar", json=payload)
    assert res1.status_code == 202
    data1 = res1.json()

    res2 = client.post("/api/v1/projetos/1961/processar", json=payload)
    assert res2.status_code == 202
    data2 = res2.json()

    # O mesmo job deve ser retornado sem recriar
    assert data1["job_id"] == data2["job_id"]
    assert data2["reused"] is True


def test_consultar_status_e_processamento_atual():
    # Inicia um job
    res_start = client.post(
        "/api/v1/projetos/1961/processar",
        json={"fonte": "auto", "idempotency_key": "job-status-test-key"},
    )
    job_id = res_start.json()["job_id"]

    # Consulta por job_id
    res_status = client.get(f"/api/v1/processamentos/{job_id}")
    assert res_status.status_code == 200
    status_data = res_status.json()
    assert status_data["job_id"] == job_id
    assert status_data["projeto_id"] == "1961"

    # Consulta processamento atual do projeto
    res_atual = client.get("/api/v1/projetos/1961/processamento-atual")
    assert res_atual.status_code == 200
    atual_data = res_atual.json()
    assert atual_data is not None
    assert atual_data["job_id"] == job_id


def test_execucao_pipeline_e_metricas_oficiais_1961():
    req = ProcessarRequest(idempotency_key="pipeline-exec-1961")
    job_id = criar_job("1961", req, "pipeline-exec-1961")

    # Executa de forma síncrona para aferição exata
    executar_pipeline(job_id=job_id, projeto_id="1961", payload=req, actor_id="TEST_RUNNER")

    job = obter_job(job_id)
    assert job is not None
    resultado = job["resultado"]

    # Valida status final: 82 pendências exigem revisão humana honesta
    assert resultado["status"] == STATUS_NEEDS_REVIEW
    assert resultado["progress"] == 100
    assert resultado["reconciliados"] == 96
    assert resultado["pendentes"] == 82
    assert resultado["total"] == 178
    assert resultado["valor_conciliado"] == 655341.36
    assert resultado["valor_pendente"] == 242417.79

    # Validações das regras de integridade
    regras = {r["regra"]: r for r in resultado["regras_validacao"]}
    assert "expect_total_funding_and_earnings_to_balance" in regras
    assert regras["expect_total_funding_and_earnings_to_balance"]["sucesso"] is True
    assert "expect_zero_spreadsheet_totalizer_rows" in regras
    assert regras["expect_zero_spreadsheet_totalizer_rows"]["sucesso"] is True
    assert "expect_rubric_execution_under_20_percent_reallocation" in regras
    assert regras["expect_rubric_execution_under_20_percent_reallocation"]["sucesso"] is True
    assert "expect_unique_bank_fitid_identifiers" in regras
    assert regras["expect_unique_bank_fitid_identifiers"]["sucesso"] is True


def test_recuperar_jobs_orfaos():
    req = ProcessarRequest(idempotency_key="orphan-job-key")
    job_id = criar_job("1961", req, "orphan-job-key")
    _MEM_JOBS[job_id]["status"] = STATUS_RUNNING

    qtd = recuperar_jobs_orfaos()
    assert qtd >= 1
    assert _MEM_JOBS[job_id]["status"] == STATUS_INTERRUPTED
    assert "reinicialização" in _MEM_JOBS[job_id]["erro"]

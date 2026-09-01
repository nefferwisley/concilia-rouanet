import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_rendimentos_aplicacao_requires_auth():
    res = client.get("/api/v1/relatorios/projetos/fake-uuid/rendimentos-aplicacao")
    assert res.status_code == 401


def test_gerar_gru_devolucao_requires_auth():
    res = client.post("/api/v1/relatorios/projetos/fake-uuid/gerar-gru-devolucao", json={"valor_devolucao": 1500.0})
    assert res.status_code == 401


def test_dossie_prestacao_contas_requires_auth():
    res = client.get("/api/v1/relatorios/projetos/fake-uuid/dossie-prestacao-contas")
    assert res.status_code == 401

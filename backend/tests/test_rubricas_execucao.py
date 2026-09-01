import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_rubricas_execucao_requires_auth():
    res = client.get("/api/v1/projetos/fake-uuid/rubricas/execucao")
    assert res.status_code == 401


def test_remanejamento_solicitacao_requires_auth():
    res = client.post(
        "/api/v1/projetos/fake-uuid/rubricas/solicitar-remanejamento",
        json={
            "rubrica_origem_id": "r1",
            "rubrica_destino_id": "r2",
            "valor": 5000.0,
            "justificativa": "Ajuste orçamentário de equipe"
        }
    )
    assert res.status_code == 401

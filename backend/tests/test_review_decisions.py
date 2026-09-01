import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.review_service import VALID_ACTIONS, apply_review_decision

client = TestClient(app)


def test_valid_actions_set():
    assert "APPROVE" in VALID_ACTIONS
    assert "REJECT" in VALID_ACTIONS
    assert "REPLACE" in VALID_ACTIONS
    assert "MANUAL_LINK" in VALID_ACTIONS


@pytest.mark.asyncio
async def test_apply_review_decision_invalid_action():
    with pytest.raises(ValueError, match="Ação de revisão inválida"):
        await apply_review_decision(
            conn=None,
            user_id="user1",
            projeto_id="proj1",
            lancamento_id="tx1",
            action="INVALID_ACTION"
        )


@pytest.mark.asyncio
async def test_apply_review_decision_reject_requires_reason():
    with pytest.raises(ValueError, match="Justificativa .* é obrigatória"):
        await apply_review_decision(
            conn=None,
            user_id="user1",
            projeto_id="proj1",
            lancamento_id="tx1",
            action="REJECT",
            reason=None
        )


def test_review_routes_require_auth():
    res1 = client.post("/api/v1/projetos/fake-uuid/decisoes-revisao", data={"lancamento_id": "1", "action": "APPROVE"})
    assert res1.status_code == 401

    res2 = client.get("/api/v1/projetos/fake-uuid/trilha-auditoria")
    assert res2.status_code == 401

    res3 = client.get("/api/v1/documentos/fake-uuid/visualizacao")
    assert res3.status_code == 401

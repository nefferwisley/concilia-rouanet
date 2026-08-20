from uuid import uuid4
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_post_decision_requires_auth():
    response = client.post(
        f"/api/v1/reconciliacoes/{uuid4()}/decisoes",
        json={"action": "APPROVE", "expected_version": 1, "reason": ""},
        headers={"Idempotency-Key": "test-key-1"},
    )
    assert response.status_code == 401


def test_list_audit_events_requires_auth():
    response = client.get(f"/api/v1/projetos/{uuid4()}/audit-events")
    assert response.status_code == 401

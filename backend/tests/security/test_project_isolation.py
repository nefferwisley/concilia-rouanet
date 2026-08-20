from uuid import uuid4
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_anonymous_cannot_access_reconciliations():
    res = client.get(f"/api/v1/projetos/{uuid4()}/conciliacoes")
    assert res.status_code == 401


def test_anonymous_cannot_access_audit_events():
    res = client.get(f"/api/v1/projetos/{uuid4()}/audit-events")
    assert res.status_code == 401


def test_anonymous_cannot_access_dossier_readiness():
    res = client.get(f"/api/v1/projetos/{uuid4()}/dossier/readiness")
    assert res.status_code == 401

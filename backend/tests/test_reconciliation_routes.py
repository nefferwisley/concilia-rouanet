import pytest
from uuid import uuid4
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_list_reconciliations_requires_auth():
    response = client.get(f"/api/v1/projetos/{uuid4()}/conciliacoes")
    assert response.status_code == 401


def test_get_reconciliation_detail_requires_auth():
    response = client.get(f"/api/v1/conciliacoes/{uuid4()}")
    assert response.status_code == 401


def test_get_signed_url_requires_auth():
    response = client.get(f"/api/v1/documentos/{uuid4()}/signed-url")
    assert response.status_code == 401

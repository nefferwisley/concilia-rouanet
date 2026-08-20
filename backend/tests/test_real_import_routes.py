import pytest
from uuid import uuid4
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def test_create_manifest_requires_authentication():
    response = client.post(
        f"/api/v1/projetos/{uuid4()}/importacoes/manifesto",
        json={"files": []},
    )
    assert response.status_code == 401


def test_complete_file_upload_requires_authentication():
    response = client.post(
        f"/api/v1/importacoes/{uuid4()}/arquivos/{uuid4()}/concluir",
    )
    assert response.status_code == 401


def test_get_import_status_requires_authentication():
    response = client.get(
        f"/api/v1/importacoes/{uuid4()}/status",
    )
    assert response.status_code == 401

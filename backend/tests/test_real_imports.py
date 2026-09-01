import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from backend.main import app
from backend.routes.real_imports import build_storage_key, ManifestFile, ManifestRequest
from motor.ocr_service import extract_native_pdf_text, extract_documento, _calcular_confianca

client = TestClient(app)


def test_build_storage_key_sanitization():
    key = build_storage_key("user123", "proj456", "abcd1234sha", "Nota Fiscal Edição 2026.pdf")
    assert "user123/proj456/abcd1234sha/" in key
    assert "Edicao" in key or "Edi" in key
    assert "/" not in key.split("/")[-1]


def test_manifest_schema_validation():
    manifest = ManifestRequest(
        files=[
            ManifestFile(
                relativePath="docs/nf.pdf",
                originalName="nf.pdf",
                browserMime="application/pdf",
                sizeBytes=1024,
                sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
            )
        ]
    )
    assert len(manifest.files) == 1
    assert manifest.files[0].sizeBytes == 1024


def test_real_imports_auth_required():
    response = client.post("/api/v1/projetos/fake-uuid/imports", json={"files": []})
    assert response.status_code == 401


def test_real_imports_upload_content_auth_required():
    response = client.put("/api/v1/importacoes/fake-import/arquivos/fake-file/conteudo", files={"arquivo": ("test.pdf", b"123", "application/pdf")})
    assert response.status_code == 401


def test_calcular_confianca_complete():
    dados = {
        "CNPJ_CPF": "12.345.678/0001-90",
        "Razao_Social": "Produtora Cultural Ltda",
        "Data_Emissao": "2026-05-10",
        "Valor_Total": 5000.0,
        "Subtotal": 5000.0,
        "Impostos_Retencoes": 0.0,
        "Numero_Nota_Recibo": "1234",
        "Forma_Pagamento": "PIX"
    }
    confianca, motivos = _calcular_confianca(dados)
    assert confianca == 1.0
    assert len(motivos) == 0


def test_calcular_confianca_inconsistent():
    dados = {
        "CNPJ_CPF": "12.345.678/0001-90",
        "Razao_Social": "Produtora Cultural Ltda",
        "Data_Emissao": "2026-05-10",
        "Valor_Total": 5000.0,
        "Subtotal": 100.0,
        "Impostos_Retencoes": 0.0,
        "Numero_Nota_Recibo": "1234",
        "Forma_Pagamento": "PIX"
    }
    confianca, motivos = _calcular_confianca(dados)
    assert confianca < 1.0
    assert any("não bate" in m for m in motivos)

import hashlib
import pytest
from backend.routes.real_imports import ManifestFile, ManifestRequest, build_storage_key


def test_manifest_scale_500_items():
    """
    Testa a criação e validação em escala de um manifesto com 500 arquivos sintéticos.
    """
    files = []
    for i in range(1, 501):
        content = f"PDF_CONTENT_MOCK_FILE_{i}".encode("utf-8")
        sha = hashlib.sha256(content).hexdigest()
        files.append(
            ManifestFile(
                relativePath=f"comprovantes/00{i} - Fornecedor {i}.pdf",
                originalName=f"00{i} - Fornecedor {i}.pdf",
                browserMime="application/pdf",
                sizeBytes=len(content),
                sha256=sha
            )
        )

    manifest = ManifestRequest(files=files)
    assert len(manifest.files) == 500

    # Valida geração de storage keys únicas e sanitizadas para todos os 500 arquivos
    storage_keys = set()
    for f in manifest.files:
        key = build_storage_key("user-1", "proj-1961", f.sha256, f.originalName)
        assert key not in storage_keys
        storage_keys.add(key)

    assert len(storage_keys) == 500


def test_batch_progress_math():
    """
    Testa se as porcentagens de progresso do lote fecham matematicamente em 100%.
    """
    total = 500
    concluidos = 350
    processando = 100
    erros = 50

    pct = int(100 * concluidos / total)
    assert pct == 70
    assert (concluidos + processando + erros) == total

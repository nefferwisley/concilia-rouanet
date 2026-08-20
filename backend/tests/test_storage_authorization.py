import pytest
from backend.services.storage_service import build_storage_key


def test_storage_key_is_project_scoped_and_deterministic():
    key = build_storage_key(
        user_id="user-123",
        project_id="proj-456",
        sha256="ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
        original_name="Nota Fiscal 001.pdf",
    )

    assert key.startswith("user-123/proj-456/ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad/")
    assert ".." not in key
    assert "/" not in key.split("/")[-1]


def test_storage_key_rejects_path_traversal():
    with pytest.raises(ValueError, match="inválid"):
        build_storage_key(
            user_id="user-123",
            project_id="../proj-456",
            sha256="ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
            original_name="nota.pdf",
        )

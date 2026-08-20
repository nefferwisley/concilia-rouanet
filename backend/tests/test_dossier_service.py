import hashlib
import json
import pytest
from backend.services.dossier_service import compute_canonical_snapshot_hash


def test_canonical_hash_is_deterministic():
    payload1 = {"b": 2, "a": 1, "items": [{"id": "x"}, {"id": "y"}]}
    payload2 = {"a": 1, "b": 2, "items": [{"id": "x"}, {"id": "y"}]}

    h1 = compute_canonical_snapshot_hash(payload1)
    h2 = compute_canonical_snapshot_hash(payload2)

    assert h1 == h2
    assert len(h1) == 64

from backend.routes.snapshots import _sanitizar_snapshot


def test_sanitizar_snapshot_remove_base64_do_mapa_por_projeto():
    snapshot = {
        "documents": {
            "proj-1": [
                {"id": "doc-1", "base64": "dados", "dataUrl": "x" * 600},
            ],
        },
    }

    clean = _sanitizar_snapshot(snapshot)

    assert clean["documents"]["proj-1"][0]["base64"] is None
    assert clean["documents"]["proj-1"][0]["dataUrl"] is None
    assert snapshot["documents"]["proj-1"][0]["base64"] == "dados"

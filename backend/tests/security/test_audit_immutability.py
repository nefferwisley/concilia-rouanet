from pathlib import Path
import pytest


def test_audit_table_revokes_destructive_operations():
    sql = Path("db/migrations/0018_human_review_dossier.sql").read_text(encoding="utf-8").lower()
    assert "revoke update, delete on public.audit_events" in sql
    assert "revoke update, delete on public.dossier_snapshots" in sql

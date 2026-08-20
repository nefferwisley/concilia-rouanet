from pathlib import Path
import pytest

MIGRATION = Path("db/migrations/0018_human_review_dossier.sql")


def _read_sql() -> str:
    assert MIGRATION.exists(), "migration 0018 must define review and dossier records"
    return " ".join(MIGRATION.read_text(encoding="utf-8").lower().split())


def test_review_schema_is_append_only_and_versioned():
    sql = _read_sql()
    assert "create table public.review_decisions" in sql
    assert "create table public.audit_events" in sql
    assert "create table public.dossier_snapshots" in sql
    assert "version bigint" in sql
    assert "idempotency_key" in sql
    assert "sha256_hash" in sql


def test_audit_events_has_no_update_or_delete_for_authenticated():
    sql = _read_sql()
    assert "revoke update, delete on public.audit_events" in sql or "p_audit_events_select" in sql


def test_migration_leaves_transaction_ownership_to_runner():
    statements = [s.strip() for s in _read_sql().split(";")]
    assert "begin" not in statements
    assert "commit" not in statements

from pathlib import Path
import pytest

MIGRATION = Path("db/migrations/0017_evidence_reconciliation.sql")


def _read_sql() -> str:
    assert MIGRATION.exists(), "migration 0017 must define evidence and reconciliation schema"
    return " ".join(MIGRATION.read_text(encoding="utf-8").lower().split())


def test_evidence_tables_keep_provenance_and_tenant_security():
    sql = _read_sql()

    for table in (
        "regulatory_packages",
        "documents",
        "document_extraction_runs",
        "document_fields",
        "reconciliations",
        "evidence_links",
        "issues",
    ):
        assert f"create table public.{table}" in sql

    assert "source_locator jsonb" in sql
    assert "model_version text" in sql
    assert "enable row level security" in sql


def test_all_public_policies_are_scoped_to_authenticated():
    statements = [s.strip() for s in _read_sql().split(";")]
    policies = [s for s in statements if s.startswith("create policy")]

    assert len(policies) >= 7
    assert all(" to authenticated " in f" {p} " for p in policies)


def test_unique_indexes_and_partial_indexes_exist():
    sql = _read_sql()

    assert "evidence_link_unique_active_idx" in sql
    assert "issues_open_project_idx" in sql


def test_migration_leaves_transaction_ownership_to_runner():
    statements = [s.strip() for s in _read_sql().split(";")]

    assert "begin" not in statements
    assert "commit" not in statements

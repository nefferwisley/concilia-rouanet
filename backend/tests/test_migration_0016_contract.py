from pathlib import Path
import pytest

MIGRATION = Path("db/migrations/0016_real_import_pipeline.sql")


def _read_sql() -> str:
    assert MIGRATION.exists(), "migration 0016 must define the real-import pipeline schema"
    return " ".join(MIGRATION.read_text(encoding="utf-8").lower().split())


def test_import_files_are_idempotent_and_rls_protected():
    sql = _read_sql()

    assert "create table public.import_files" in sql
    assert "unique (projeto_id, sha256)" in sql
    assert "alter table public.import_files enable row level security" in sql
    assert "create schema if not exists private" in sql
    assert "create table private.processing_jobs" in sql
    assert "create table public.processing_events" in sql
    assert "create table public.source_sheets" in sql
    assert "create table public.declared_entries" in sql


def test_declared_entries_have_unique_row_and_cell_provenance():
    sql = _read_sql()

    assert "unique (source_sheet_id, row_number)" in sql
    assert "cell_locators jsonb" in sql
    assert "raw_values jsonb" in sql
    assert "alter table public.declared_entries enable row level security" in sql


def test_private_jobs_schema_is_revoked_from_client_roles():
    sql = _read_sql()

    assert "revoke all on schema private from public, anon, authenticated" in sql
    assert "revoke all on table private.processing_jobs from public, anon, authenticated" in sql


def test_all_public_tables_policies_are_scoped_to_authenticated():
    statements = [s.strip() for s in _read_sql().split(";")]
    policies = [s for s in statements if s.startswith("create policy")]

    assert len(policies) >= 4
    assert all(" to authenticated " in f" {p} " for p in policies)


def test_migration_leaves_transaction_ownership_to_runner():
    statements = [s.strip() for s in _read_sql().split(";")]

    assert "begin" not in statements
    assert "commit" not in statements

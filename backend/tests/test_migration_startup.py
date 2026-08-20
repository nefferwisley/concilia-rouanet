import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
from types import SimpleNamespace

import pytest

from backend import main
from backend.config import Settings
from backend.scripts import apply_migrations


class _Transaction:
    def __init__(self, events: list[str]):
        self.events = events

    async def __aenter__(self):
        self.events.append("transaction:begin")
        return self

    async def __aexit__(self, exc_type, exc, traceback):
        self.events.append("transaction:rollback" if exc_type else "transaction:commit")
        return False


class _FailingMigrationConnection:
    def __init__(self):
        self.events: list[str] = []

    async def execute(self, query, *args):
        normalized = " ".join(query.split()).lower()
        if normalized.startswith("create table if not exists schema_migrations"):
            self.events.append("ensure-ledger")
            return
        if normalized == "select broken migration":
            self.events.append("migration:execute")
            raise RuntimeError("migration exploded")
        self.events.append("ledger:record")

    async def fetch(self, query, *args):
        return []

    async def fetchval(self, query, *args):
        return False

    def transaction(self):
        return _Transaction(self.events)

    async def close(self):
        self.events.append("close")


def test_apply_runner_propagates_failure_and_rolls_back_the_migration(monkeypatch, tmp_path):
    migration = tmp_path / "0001_broken.sql"
    migration.write_text("select broken migration", encoding="utf-8")
    connection = _FailingMigrationConnection()

    async def connect(*args, **kwargs):
        return connection

    monkeypatch.setattr(apply_migrations, "MIGRATIONS_DIR", Path(tmp_path))
    monkeypatch.setattr(apply_migrations.asyncpg, "connect", connect)

    with pytest.raises(RuntimeError, match="migration exploded"):
        asyncio.run(apply_migrations.aplicar_migrations())

    assert connection.events == [
        "ensure-ledger",
        "transaction:begin",
        "migration:execute",
        "transaction:rollback",
        "close",
    ]


def test_production_startup_is_verify_only(monkeypatch):
    events: list[str] = []

    async def no_pool():
        events.append("pool")

    async def close_pool():
        events.append("close")

    async def verify():
        events.append("verify")

    async def apply():
        events.append("apply")

    monkeypatch.setattr(main, "settings", SimpleNamespace(app_env="production", auto_apply_migrations=False))
    monkeypatch.setattr(main, "get_pool", no_pool)
    monkeypatch.setattr(main, "close_pool", close_pool)
    monkeypatch.setattr(apply_migrations, "verificar_migrations", verify, raising=False)
    monkeypatch.setattr(apply_migrations, "aplicar_migrations", apply)
    monkeypatch.setattr("backend.services.watcher.iniciar_watcher", lambda: None)
    monkeypatch.setattr("backend.services.watcher.encerrar_watcher", lambda: None)

    async def exercise():
        async with main.lifespan(main.app):
            events.append("yield")

    asyncio.run(exercise())

    assert events == ["pool", "verify", "yield", "close"]


def test_startup_schema_failure_is_fail_fast_and_closes_pool(monkeypatch):
    events: list[str] = []

    async def no_pool():
        events.append("pool")

    async def close_pool():
        events.append("close")

    async def fail_verification():
        events.append("verify")
        raise RuntimeError("schema behind")

    monkeypatch.setattr(main, "settings", SimpleNamespace(app_env="production", auto_apply_migrations=False))
    monkeypatch.setattr(main, "get_pool", no_pool)
    monkeypatch.setattr(main, "close_pool", close_pool)
    monkeypatch.setattr(apply_migrations, "verificar_migrations", fail_verification, raising=False)
    monkeypatch.setattr("backend.services.watcher.iniciar_watcher", lambda: None)
    monkeypatch.setattr("backend.services.watcher.encerrar_watcher", lambda: None)

    async def exercise():
        async with main.lifespan(main.app):
            raise AssertionError("lifespan must not yield with a stale schema")

    with pytest.raises(RuntimeError, match="schema behind"):
        asyncio.run(exercise())

    assert events == ["pool", "verify", "close"]


def test_auto_apply_is_opt_in_and_never_enabled_by_default():
    isolated_settings = Settings(_env_file=None)

    assert isolated_settings.auto_apply_migrations is False

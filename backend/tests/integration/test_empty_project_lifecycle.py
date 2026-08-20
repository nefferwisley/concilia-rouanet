import asyncio
import json
import os
import time
from pathlib import Path
from urllib.parse import unquote, urlsplit
from uuid import uuid4

import asyncpg
import httpx
import jwt as pyjwt
import pytest
import yaml
from fastapi import FastAPI, HTTPException

import backend.database as database_module
from backend.config import Settings, settings
from backend.database import get_conn
from backend.routes import dev_demo, projetos


MIGRATION_0015 = Path("db/migrations/0015_real_import_foundation.sql")
TEST_JWT_SECRET = "integration-only-secret-at-least-32-chars"


def test_backend_environment_defaults_to_production(monkeypatch):
    monkeypatch.delenv("APP_ENV", raising=False)

    isolated_settings = Settings(_env_file=None)

    assert isolated_settings.app_env == "production"


def test_render_blueprint_is_fail_closed_and_uses_backend_ocr_key():
    blueprint = yaml.safe_load(Path("render.yaml").read_text(encoding="utf-8"))
    environment = {
        item["key"]: item
        for item in blueprint["services"][0]["envVars"]
    }

    assert environment["APP_ENV"]["value"] == "production"
    assert "GOOGLE_API_KEY" in environment
    assert "GEMINI_API_KEY" not in environment


def _migration_body() -> str:
    sql = MIGRATION_0015.read_text(encoding="utf-8")
    statements = {line.strip().lower() for line in sql.splitlines()}
    assert "begin;" not in statements and "commit;" not in statements
    return sql


def _signed_token(user_id: str, email: str) -> str:
    now = int(time.time())
    return pyjwt.encode(
        {
            "sub": user_id,
            "email": email,
            "role": "authenticated",
            "aud": "authenticated",
            "iat": now,
            "exp": now + 300,
        },
        TEST_JWT_SECRET,
        algorithm="HS256",
    )


def _authorization(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _database_identity(database_url: str) -> tuple[str | None, int, str]:
    parsed = urlsplit(database_url)
    host = parsed.hostname.lower() if parsed.hostname else None
    if host in {"localhost", "127.0.0.1", "::1"}:
        host = "loopback"
    return host, parsed.port or 5432, unquote(parsed.path).rstrip("/")


class _BoundConnectionPool:
    def __init__(self, connection):
        self.connection = connection
        self.release_count = 0

    async def release(self, connection):
        assert connection is self.connection
        self.release_count += 1
        try:
            await connection.execute("reset role")
        finally:
            await connection.execute("select set_config('request.jwt.claims', '{}', true)")


def _bind_production_connection(monkeypatch, connection) -> _BoundConnectionPool:
    bound_pool = _BoundConnectionPool(connection)

    async def acquire_bound_connection():
        return bound_pool, connection

    monkeypatch.setattr(database_module, "adquirir_conn", acquire_bound_connection)
    return bound_pool


def _project_api_app() -> FastAPI:
    app = FastAPI()
    app.include_router(projetos.router)
    return app


async def _rollback_and_close(connection, transaction) -> None:
    try:
        try:
            await connection.execute("reset role")
        except Exception:
            pass
        await transaction.rollback()
    finally:
        await connection.close()


def test_marker_is_required_before_transaction_or_ddl(monkeypatch):
    class MarkerlessConnection:
        def __init__(self):
            self.events = []

        async def fetchval(self, query):
            verifies_persistent_marker = (
                "concilia.test_database" in query
                and "pg_db_role_setting" in query
                and "setrole = 0" in query
            )
            self.events.append(("fetchval", verifies_persistent_marker))
            return None

        def transaction(self):
            self.events.append(("transaction", False))
            raise AssertionError("transaction must not open before the exclusive marker")

        async def close(self):
            self.events.append(("close", True))

    connection = MarkerlessConnection()

    async def connect_only_to_markerless_database(*args, **kwargs):
        return connection

    monkeypatch.setattr(asyncpg, "connect", connect_only_to_markerless_database)

    with pytest.raises(pytest.fail.Exception, match="concilia.test_database"):
        asyncio.run(_exercise_lifecycle("postgresql://integration.invalid/disposable", monkeypatch))

    assert connection.events == [
        ("fetchval", True),
        ("close", True),
    ]


def test_project_app_keeps_the_production_get_conn_dependency():
    app = _project_api_app()
    project_routes = [
        route
        for route in app.routes
        if getattr(route, "path", None) == "/api/v1/projetos"
    ]

    assert app.dependency_overrides == {}
    assert len(project_routes) == 2
    assert all(
        any(dependency.call is get_conn for dependency in route.dependant.dependencies)
        for route in project_routes
    )


def test_bound_connection_runs_production_claims_and_role_path(monkeypatch):
    class RecordingTransaction:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return False

    class RecordingConnection:
        def __init__(self):
            self.queries = []

        def transaction(self):
            return RecordingTransaction()

        async def execute(self, query, *args):
            self.queries.append((" ".join(query.split()), args))

    connection = RecordingConnection()
    bound_pool = _bind_production_connection(monkeypatch, connection)
    monkeypatch.setattr(settings, "supabase_jwt_secret", TEST_JWT_SECRET)
    monkeypatch.setattr(database_module, "_jwks_client", None)
    user_id = str(uuid4())
    token = _signed_token(user_id, f"{user_id}@integration.invalid")

    async def consume_dependency():
        dependency = database_module.get_conn(f"Bearer {token}")
        yielded = await anext(dependency)
        await dependency.aclose()
        return yielded

    yielded_connection, yielded_user_id = asyncio.run(consume_dependency())
    normalized_queries = [query for query, _ in connection.queries]

    assert yielded_connection is connection
    assert yielded_user_id == user_id
    assert any("insert into auth.users" in query for query in normalized_queries)
    assert any("set_config('request.jwt.claims'" in query for query in normalized_queries)
    assert "set local role authenticated" in normalized_queries
    assert bound_pool.release_count == 1


def test_connection_closes_even_when_rollback_raises():
    events = []

    class ClosingConnection:
        async def execute(self, query):
            events.append("reset")

        async def close(self):
            events.append("close")

    class FailingTransaction:
        async def rollback(self):
            events.append("rollback")
            raise RuntimeError("rollback failed")

    with pytest.raises(RuntimeError, match="rollback failed"):
        asyncio.run(_rollback_and_close(ClosingConnection(), FailingTransaction()))

    assert events == ["reset", "rollback", "close"]


async def _exercise_lifecycle(test_database_url: str, monkeypatch) -> None:
    connection = await asyncpg.connect(
        test_database_url,
        statement_cache_size=0,
        command_timeout=30,
    )
    transaction = None
    transaction_started = False

    try:
        test_database_marker = await connection.fetchval(
            """
            select current_setting('concilia.test_database', true) = 'on'
               and exists (
                 select 1
                 from pg_db_role_setting
                 where setdatabase = (
                   select oid from pg_database where datname = current_database()
                 )
                   and setrole = 0
                   and 'concilia.test_database=on' = any(setconfig)
               )
            """
        )
        if test_database_marker is not True:
            pytest.fail(
                "TEST_DATABASE_URL recusada: o administrador precisa executar ALTER DATABASE "
                "... SET concilia.test_database=on no banco descartável antes do gate."
            )

        transaction = connection.transaction()
        await transaction.start()
        transaction_started = True

        base_schema_ready = await connection.fetchval(
            """
            select to_regclass('public.projetos') is not null
               and to_regclass('public.membros_projeto') is not null
               and to_regclass('public.transacoes') is not null
               and to_regclass('auth.users') is not null
               and to_regprocedure('auth.uid()') is not null
            """
        )
        if not base_schema_ready:
            pytest.fail(
                "TEST_DATABASE_URL precisa apontar para um banco descartável com as migrations "
                "base (0001-0014 e auth nativo ou shim 0000) já provisionadas."
            )

        # Apply the complete migration under test. It deliberately leaves
        # transaction ownership to this disposable gate.
        await connection.execute(_migration_body())

        _bind_production_connection(monkeypatch, connection)
        app = _project_api_app()

        user_a = str(uuid4())
        user_b = str(uuid4())
        user_c = str(uuid4())
        token_a = _signed_token(user_a, f"{user_a}@integration.invalid")
        token_b = _signed_token(user_b, f"{user_b}@integration.invalid")
        pronac = f"TEST-EMPTY-{uuid4().hex[:12].upper()}"

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://integration.test") as client:
            initial = await client.get("/api/v1/projetos", headers=_authorization(token_a))
            assert initial.status_code == 200
            assert initial.json() == {"total": 0, "page": 1, "projetos": []}

            created = await client.post(
                "/api/v1/projetos",
                headers=_authorization(token_a),
                json={
                    "pronac": pronac,
                    "nome": "Projeto vazio",
                    "proponente": "Proponente de integração",
                    "pacote_regulatorio": "FSA_ANCINE",
                },
            )
            assert created.status_code == 201
            created_body = created.json()
            assert created_body["status_processamento"] == "EMPTY"
            assert created_body["pacote_regulatorio"] == "FSA_ANCINE"
            assert created_body["pronac"] == pronac

            reloaded = await client.get("/api/v1/projetos", headers=_authorization(token_a))
            assert reloaded.status_code == 200
            assert reloaded.json()["total"] == 1
            assert [project["id"] for project in reloaded.json()["projetos"]] == [created_body["id"]]

            unrelated_list = await client.get("/api/v1/projetos", headers=_authorization(token_b))
            assert unrelated_list.status_code == 200
            assert unrelated_list.json() == {"total": 0, "page": 1, "projetos": []}

            unrelated_read = await client.get(
                f"/api/v1/projetos/{created_body['id']}",
                headers=_authorization(token_b),
            )
            assert unrelated_read.status_code == 404

        await connection.execute(
            """
            insert into auth.users (id, email)
            values ($1::uuid, $2)
            on conflict (id) do nothing
            """,
            user_c,
            f"{user_c}@integration.invalid",
        )

        async def execute_as(user_id: str, query: str, *args):
            claims = json.dumps({"sub": user_id, "role": "authenticated"})
            async with connection.transaction():
                await connection.execute(
                    "select set_config('request.jwt.claims', $1, true)",
                    claims,
                )
                await connection.execute("set local role authenticated")
                return await connection.execute(query, *args)

        project_id = created_body["id"]
        await execute_as(
            user_a,
            "insert into public.membros_projeto (projeto_id, user_id, papel) values ($1, $2, 'membro')",
            project_id,
            user_b,
        )

        with pytest.raises(asyncpg.InsufficientPrivilegeError):
            await execute_as(
                user_b,
                "insert into public.membros_projeto (projeto_id, user_id, papel) values ($1, $2, 'membro')",
                project_id,
                user_c,
            )

        with pytest.raises(asyncpg.CheckViolationError):
            await execute_as(
                user_a,
                "update public.membros_projeto set papel = 'membro' where projeto_id = $1 and user_id = $2",
                project_id,
                user_a,
            )

        await execute_as(
            user_a,
            "update public.membros_projeto set papel = 'admin' where projeto_id = $1 and user_id = $2",
            project_id,
            user_b,
        )
        await execute_as(
            user_a,
            "update public.membros_projeto set papel = 'membro' where projeto_id = $1 and user_id = $2",
            project_id,
            user_a,
        )

        with pytest.raises(asyncpg.CheckViolationError):
            await execute_as(
                user_b,
                "delete from public.membros_projeto where projeto_id = $1 and user_id = $2",
                project_id,
                user_b,
            )
    finally:
        if transaction_started:
            assert transaction is not None
            await _rollback_and_close(connection, transaction)
        else:
            await connection.close()


def test_new_user_starts_empty_then_sees_only_created_project(monkeypatch):
    test_database_url = os.getenv("TEST_DATABASE_URL")
    if not test_database_url:
        pytest.skip("TEST_DATABASE_URL não configurada; RLS real não pode ser comprovada sem banco de integração.")

    application_database_urls = {settings.database_url}
    if configured_database_url := os.getenv("DATABASE_URL"):
        application_database_urls.add(configured_database_url)
    if any(
        _database_identity(application_url) == _database_identity(test_database_url)
        for application_url in application_database_urls
    ):
        pytest.fail(
            "TEST_DATABASE_URL deve apontar para host/porta/banco diferentes de DATABASE_URL; "
            "a base da aplicação nunca é alvo deste gate."
        )

    monkeypatch.setattr(settings, "supabase_jwt_secret", TEST_JWT_SECRET)
    monkeypatch.setattr(database_module, "_jwks_client", None)
    asyncio.run(_exercise_lifecycle(test_database_url, monkeypatch))


def test_production_disables_the_unauthenticated_demo_login(monkeypatch):
    async def fail_if_database_is_touched():
        raise AssertionError("production demo-login must be rejected before touching the database")

    monkeypatch.setattr(settings, "app_env", "production")
    monkeypatch.setattr(dev_demo, "adquirir_conn", fail_if_database_is_touched)

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(dev_demo.demo_login())

    assert exc_info.value.status_code == 404

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
from fastapi import FastAPI, Header, HTTPException

import backend.database as database_module
from backend.config import settings
from backend.database import get_conn
from backend.routes import dev_demo, projetos


MIGRATION_0015 = Path("db/migrations/0015_real_import_foundation.sql")
TEST_JWT_SECRET = "integration-only-secret-at-least-32-chars"


def _migration_body() -> str:
    lines = MIGRATION_0015.read_text(encoding="utf-8").splitlines()
    begin_index = next(index for index, line in enumerate(lines) if line.strip().lower() == "begin;")
    commit_index = max(index for index, line in enumerate(lines) if line.strip().lower() == "commit;")
    assert begin_index < commit_index, "migration 0015 must keep explicit transaction boundaries"
    return "\n".join(lines[:begin_index] + lines[begin_index + 1 : commit_index] + lines[commit_index + 1 :])


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


async def _exercise_lifecycle(test_database_url: str) -> None:
    connection = await asyncpg.connect(
        test_database_url,
        statement_cache_size=0,
        command_timeout=30,
    )
    transaction = connection.transaction()
    await transaction.start()

    try:
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

        # Apply only the migration under test. Its own BEGIN/COMMIT wrappers are
        # removed so every DDL and data mutation remains inside this rollback.
        await connection.execute(_migration_body())

        app = FastAPI()
        app.include_router(projetos.router)

        async def isolated_connection(authorization: str | None = Header(default=None)):
            if not authorization or not authorization.startswith("Bearer "):
                raise HTTPException(status_code=401, detail="Bearer token obrigatório.")

            token = authorization.removeprefix("Bearer ").strip()
            user_id = database_module.verificar_jwt(token)
            payload = pyjwt.decode(token, options={"verify_signature": False})

            await connection.execute("reset role")
            await connection.execute(
                """
                insert into auth.users (id, email)
                values ($1, $2)
                on conflict (id) do update set email = excluded.email
                """,
                user_id,
                payload["email"],
            )
            await connection.execute(
                "select set_config('request.jwt.claims', $1, true)",
                json.dumps({"sub": user_id, "role": "authenticated"}),
            )
            await connection.execute("set local role authenticated")
            try:
                yield connection, user_id
            finally:
                await connection.execute("reset role")
                await connection.execute("select set_config('request.jwt.claims', '{}', true)")

        app.dependency_overrides[get_conn] = isolated_connection

        user_a = str(uuid4())
        user_b = str(uuid4())
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
    finally:
        try:
            await connection.execute("reset role")
        except Exception:
            pass
        await transaction.rollback()
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
    asyncio.run(_exercise_lifecycle(test_database_url))


def test_production_disables_the_unauthenticated_demo_login(monkeypatch):
    async def fail_if_database_is_touched():
        raise AssertionError("production demo-login must be rejected before touching the database")

    monkeypatch.setattr(settings, "app_env", "production")
    monkeypatch.setattr(dev_demo, "adquirir_conn", fail_if_database_is_touched)

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(dev_demo.demo_login())

    assert exc_info.value.status_code == 404

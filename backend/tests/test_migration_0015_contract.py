import asyncio
from datetime import datetime, timezone
from pathlib import Path

import pytest
from pydantic import ValidationError

from backend.models import ProjetoCreate, ProjetoOut
from backend.routes.projetos import criar_projeto, listar_projetos


MIGRATION = Path("db/migrations/0015_real_import_foundation.sql")


def _read_sql() -> str:
    assert MIGRATION.exists(), "migration 0015 must define the real-import foundation"
    return " ".join(MIGRATION.read_text(encoding="utf-8").lower().split())


def test_project_defaults_are_empty_and_regulatory():
    normalized = _read_sql()

    assert "pacote_regulatorio" in normalized
    assert "status_processamento" in normalized
    assert "default 'empty'" in normalized
    assert "enable row level security" in normalized


def test_project_package_and_status_are_constrained_text():
    normalized = _read_sql()

    assert "pacote_regulatorio text" in normalized
    assert "status_processamento text" in normalized
    assert "'rouanet', 'fsa_ancine'" in normalized
    assert "'empty', 'importing', 'review', 'ready'" in normalized
    assert "from pg_constraint" in normalized


def test_project_rls_uses_authenticated_membership_and_index():
    normalized = _read_sql()

    assert "membros_projeto_user_project_idx" in normalized
    assert "(user_id, projeto_id)" in normalized
    assert "mp.user_id = (select auth.uid())" in normalized
    assert "mp.projeto_id = projetos.id" in normalized


def test_project_creation_rpc_validates_identity_and_limits_execution():
    normalized = _read_sql()

    assert "v_user_id := (select auth.uid())" in normalized
    assert "if v_user_id is null" in normalized
    assert "revoke all on function public.criar_projeto_com_membro" in normalized
    assert "from public, anon" in normalized
    assert "grant execute on function public.criar_projeto_com_membro" in normalized
    assert "to authenticated" in normalized
    execute_grants = [
        statement
        for statement in normalized.split(";")
        if statement.strip().startswith("grant execute")
    ]
    assert all(" to public" not in statement for statement in execute_grants)
    assert all(" to anon" not in statement for statement in execute_grants)


def test_project_models_require_real_identity_and_regulatory_fields():
    with pytest.raises(ValidationError):
        ProjetoCreate(pronac="TEST-001", nome="Projeto", proponente="Proponente")

    created = ProjetoCreate(
        pronac="TEST-001",
        nome="Projeto",
        proponente="Proponente",
        pacote_regulatorio="ROUANET",
    )
    assert created.pacote_regulatorio == "ROUANET"

    with pytest.raises(ValidationError):
        ProjetoCreate(
            pronac="TEST-001",
            nome="Projeto",
            proponente="Proponente",
            pacote_regulatorio="DESCONHECIDO",
        )

    with pytest.raises(ValidationError):
        ProjetoOut(
            id="project-id",
            pronac="TEST-001",
            nome="Projeto",
            proponente="Proponente",
            criado_em=datetime.now(timezone.utc),
        )


class _ProjectListConnection:
    async def fetchval(self, query, *args):
        return 1

    async def fetch(self, query, *args):
        return [
            {
                "id": "project-id",
                "pronac": "TEST-001",
                "nome": "Projeto",
                "proponente": "Proponente",
                "pacote_regulatorio": "FSA_ANCINE",
                "status_processamento": "EMPTY",
                "created_at": datetime(2026, 8, 20, tzinfo=timezone.utc),
                "transacoes_count": 0,
            }
        ]


def test_project_list_exposes_the_strict_frontend_contract():
    response = asyncio.run(
        listar_projetos(dep=(_ProjectListConnection(), "user-id"))
    )

    assert response["projetos"] == [
        {
            "id": "project-id",
            "pronac": "TEST-001",
            "nome": "Projeto",
            "proponente": "Proponente",
            "pacote_regulatorio": "FSA_ANCINE",
            "status_processamento": "EMPTY",
            "transacoes_count": 0,
            "criado_em": "2026-08-20T00:00:00+00:00",
        }
    ]


class _ProjectCreateConnection:
    def __init__(self):
        self.query = None
        self.args = None

    async def fetchrow(self, query, *args):
        self.query = query
        self.args = args
        return {
            "id": "project-id",
            "pronac": "TEST-001",
            "nome": "Projeto",
            "proponente": "Proponente",
            "banco": None,
            "valor_captado": None,
            "pacote_regulatorio": "ROUANET",
            "status_processamento": "EMPTY",
            "created_at": datetime(2026, 8, 20, tzinfo=timezone.utc),
        }


def test_project_create_passes_package_to_rpc_and_returns_empty_project():
    connection = _ProjectCreateConnection()
    body = ProjetoCreate(
        pronac="TEST-001",
        nome="Projeto",
        proponente="Proponente",
        pacote_regulatorio="ROUANET",
    )

    response = asyncio.run(criar_projeto(body, dep=(connection, "user-id")))

    assert "$6" in connection.query
    assert connection.args == (
        "TEST-001",
        "Projeto",
        "Proponente",
        None,
        None,
        "ROUANET",
    )
    assert response.status_processamento == "EMPTY"
    assert response.pacote_regulatorio == "ROUANET"
    assert response.valor_captado is None

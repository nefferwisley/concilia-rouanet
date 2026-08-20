import asyncio
from datetime import datetime, timezone
from pathlib import Path

import pytest
from pydantic import ValidationError

from backend.models import ProjetoCreate, ProjetoOut, ProjetoUpdate
from backend.routes.projetos import criar_projeto, listar_projetos, obter_projeto


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


def test_every_foundation_policy_is_scoped_to_authenticated():
    statements = [statement.strip() for statement in _read_sql().split(";")]
    policies = [statement for statement in statements if statement.startswith("create policy")]

    assert policies
    assert all(" to authenticated " in f" {policy} " for policy in policies)


def test_membership_read_and_admin_only_write_policies_are_separate_and_non_recursive():
    normalized = _read_sql()
    membership_policies = [
        statement.strip()
        for statement in normalized.split(";")
        if statement.strip().startswith("create policy p_membros_")
    ]

    assert {policy.split()[2] for policy in membership_policies} == {
        "p_membros_select",
        "p_membros_insert",
        "p_membros_update",
        "p_membros_delete",
    }
    assert "create policy p_membros on public.membros_projeto for all" not in normalized
    assert "membros_projeto_papel_check" in normalized
    assert "papel in ('admin', 'membro')" in normalized
    assert "validate constraint membros_projeto_papel_check" in normalized
    assert "public.eh_admin_projeto(projeto_id)" in normalized
    assert all("from public.membros_projeto" not in policy for policy in membership_policies)


def test_last_admin_is_protected_by_a_security_definer_trigger():
    normalized = _read_sql()

    assert "function public.proteger_ultimo_admin_projeto()" in normalized
    assert "security definer" in normalized
    assert "if old.papel <> 'admin'" in normalized
    assert "papel = 'admin'" in normalized
    assert "pg_advisory_xact_lock" in normalized
    assert "raise exception" in normalized
    assert "create trigger" in normalized
    assert "before delete" in normalized
    assert "before update" in normalized


def test_migration_leaves_transaction_ownership_to_the_runner():
    statements = [statement.strip() for statement in _read_sql().split(";")]

    assert "begin" not in statements
    assert "commit" not in statements


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


def test_legacy_project_creation_rpc_is_removed_for_authenticated_users():
    normalized = _read_sql()
    legacy_signature = (
        "public.criar_projeto_com_membro(text, text, text, text, text)"
    )

    assert f"drop function if exists {legacy_signature}" in normalized
    execute_grants = [
        statement
        for statement in normalized.split(";")
        if statement.strip().startswith("grant execute")
    ]
    assert all(legacy_signature not in statement for statement in execute_grants)


def test_future_projects_and_rpc_reject_missing_or_blank_proponents():
    normalized = _read_sql()

    assert "projetos_proponente_nonblank_check" in normalized
    assert "check (proponente is not null and btrim(proponente) <> '') not valid" in normalized
    assert "p_proponente is null" in normalized
    assert "btrim(p_proponente) = ''" in normalized


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


def test_project_create_and_patch_reject_blank_or_null_proponents():
    with pytest.raises(ValidationError):
        ProjetoCreate(
            pronac="TEST-001",
            nome="Projeto",
            proponente="   ",
            pacote_regulatorio="ROUANET",
        )

    ProjetoUpdate()
    for invalid_proponent in (None, "", "   "):
        with pytest.raises(ValidationError):
            ProjetoUpdate(proponente=invalid_proponent)


def test_project_identity_and_name_are_trimmed_and_blank_values_are_rejected():
    created = ProjetoCreate(
        pronac="  TEST-001  ",
        nome="  Projeto real  ",
        proponente="  Proponente real  ",
        pacote_regulatorio="ROUANET",
    )

    assert created.pronac == "TEST-001"
    assert created.nome == "Projeto real"
    assert created.proponente == "Proponente real"

    for field in ("pronac", "nome"):
        payload = {
            "pronac": "TEST-001",
            "nome": "Projeto real",
            "proponente": "Proponente real",
            "pacote_regulatorio": "ROUANET",
        }
        payload[field] = "   "
        with pytest.raises(ValidationError):
            ProjetoCreate(**payload)

    assert ProjetoUpdate(nome="  Projeto atualizado  ").nome == "Projeto atualizado"
    with pytest.raises(ValidationError):
        ProjetoUpdate(nome="   ")


def test_project_output_requires_proponent_key_but_allows_legacy_null():
    project_fields = {
        "id": "legacy-project",
        "pronac": "LEGACY-001",
        "nome": "Projeto legado",
        "pacote_regulatorio": "ROUANET",
        "status_processamento": "READY",
        "criado_em": datetime.now(timezone.utc),
    }

    project = ProjetoOut(proponente=None, **project_fields)
    assert project.proponente is None

    with pytest.raises(ValidationError):
        ProjetoOut(**project_fields)


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


class _ProjectDetailConnection:
    async def fetchrow(self, query, *args):
        return {
            "id": "project-id",
            "pronac": "TEST-001",
            "nome": "Projeto",
            "proponente": "Proponente",
            "banco": None,
            "valor_captado": None,
            "pacote_regulatorio": "FSA_ANCINE",
            "status_processamento": "REVIEW",
            "created_at": datetime(2026, 8, 20, tzinfo=timezone.utc),
            "updated_at": datetime(2026, 8, 20, tzinfo=timezone.utc),
        }


def test_project_detail_uses_the_same_explicit_output_contract_as_create():
    response = asyncio.run(
        obter_projeto("project-id", dep=(_ProjectDetailConnection(), "user-id"))
    )

    assert isinstance(response, ProjetoOut)
    assert response.model_dump() == {
        "id": "project-id",
        "pronac": "TEST-001",
        "nome": "Projeto",
        "proponente": "Proponente",
        "pacote_regulatorio": "FSA_ANCINE",
        "status_processamento": "REVIEW",
        "banco": None,
        "valor_captado": None,
        "criado_em": datetime(2026, 8, 20, tzinfo=timezone.utc),
    }

    detail_route = next(
        route
        for route in obter_projeto.__globals__["router"].routes
        if route.path == "/api/v1/projetos/{projeto_id}" and "GET" in route.methods
    )
    assert detail_route.response_model is ProjetoOut

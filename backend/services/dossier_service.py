from dataclasses import dataclass
import hashlib
import json
from typing import Any, Optional

import asyncpg

from backend.services.dossier_readiness import check_project_dossier_readiness


class DossierBlockedError(Exception):
    def __init__(self, message: str, blockers: list[dict[str, Any]]):
        super().__init__(message)
        self.blockers = blockers


@dataclass(frozen=True)
class DossierSnapshotResult:
    snapshot_id: str
    project_id: str
    package_name: str
    package_version: str
    sha256_hash: str
    created_at: str


def compute_canonical_snapshot_hash(payload: dict[str, Any]) -> str:
    canonical_bytes = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(canonical_bytes).hexdigest()


async def generate_dossier_snapshot(
    conn: asyncpg.Connection,
    projeto_id: str,
    actor_id: str,
) -> DossierSnapshotResult:
    # 1. Verifica prontidão (Fail-closed)
    readiness = await check_project_dossier_readiness(conn, projeto_id)
    if not readiness.ready:
        blockers_list = [
            {"issue_code": b.issue_code, "severity": b.severity, "description": b.description}
            for b in readiness.blockers
        ]
        raise DossierBlockedError(
            f"Dossiê bloqueado: existem {len(readiness.blockers)} pendências não resolvidas.",
            blockers=blockers_list,
        )

    # 2. Constrói payload canônico com todos os dados auditáveis
    proj = await conn.fetchrow(
        "select id, nome, pronac, saldo_inicial, saldo_atual from public.projetos where id = $1::uuid",
        projeto_id,
    )

    recs = await conn.fetch(
        """
        select id, declared_entry_id, valor_declarado::float, valor_conciliado::float, status, confidence::float
        from public.reconciliations
        where projeto_id = $1::uuid
        order by id asc
        """,
        projeto_id,
    )

    canonical_payload = {
        "projeto": {
            "id": str(proj["id"]),
            "nome": proj["nome"],
            "pronac": proj["pronac"],
        },
        "regulatory_package": {
            "name": readiness.package_name,
            "version": readiness.package_version,
        },
        "reconciliations": [
            {
                "id": str(r["id"]),
                "declared_entry_id": str(r["declared_entry_id"]) if r["declared_entry_id"] else None,
                "valor_declarado": r["valor_declarado"],
                "valor_conciliado": r["valor_conciliado"],
                "status": r["status"],
                "confidence": r["confidence"],
            }
            for r in recs
        ],
    }

    # 3. Calcula hash SHA-256
    sha256 = compute_canonical_snapshot_hash(canonical_payload)

    # 4. Grava snapshot imutável
    row = await conn.fetchrow(
        """
        insert into public.dossier_snapshots (
            project_id,
            package_name,
            package_version,
            sha256_hash,
            canonical_payload,
            created_by
        )
        values (
            $1::uuid,
            $2,
            $3,
            $4,
            $5::jsonb,
            $6::uuid
        )
        returning id, created_at::text as created_at
        """,
        projeto_id,
        readiness.package_name,
        readiness.package_version,
        sha256,
        json.dumps(canonical_payload),
        actor_id,
    )

    # 5. Evento de auditoria
    await conn.execute(
        """
        insert into public.audit_events (
            project_id,
            entity_type,
            entity_id,
            action,
            actor_id,
            reason,
            before_state,
            after_state
        )
        values (
            $1::uuid,
            'DOSSIER_SNAPSHOT',
            $2::uuid,
            'DOSSIER_SNAPSHOT_CREATED',
            $3::uuid,
            'Emissão do dossiê final de prestação de contas com validação regulatória aprovada.',
            null,
            $4::jsonb
        )
        """,
        projeto_id,
        row["id"],
        actor_id,
        json.dumps({"sha256_hash": sha256}),
    )

    return DossierSnapshotResult(
        snapshot_id=str(row["id"]),
        project_id=projeto_id,
        package_name=readiness.package_name,
        package_version=readiness.package_version,
        sha256_hash=sha256,
        created_at=row["created_at"],
    )

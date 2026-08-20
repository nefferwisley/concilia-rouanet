import json
import logging
from typing import Optional

import asyncpg

from backend.domain.review import (
    ReviewCommand,
    ReviewConflictError,
    ReviewResult,
    ReviewValidationError,
    validate_review_command,
)

logger = logging.getLogger(__name__)


async def apply_review_command(
    conn: asyncpg.Connection,
    cmd: ReviewCommand,
) -> ReviewResult:
    validate_review_command(cmd)

    # 1. Verifica idempotência
    existing = await conn.fetchrow(
        """
        select id, action from public.review_decisions
        where reconciliation_id = $1::uuid and idempotency_key = $2
        """,
        cmd.reconciliation_id,
        cmd.idempotency_key,
    )
    if existing:
        current = await conn.fetchrow(
            "select status, version from public.reconciliations where id = $1::uuid",
            cmd.reconciliation_id,
        )
        return ReviewResult(
            decision_id=str(existing["id"]),
            reconciliation_id=cmd.reconciliation_id,
            action=cmd.action,
            new_status=current["status"],
            new_version=current["version"],
        )

    # 2. Bloqueio com FOR UPDATE e checagem de concorrência otimista
    rec = await conn.fetchrow(
        """
        select id, projeto_id, status, version
        from public.reconciliations
        where id = $1::uuid
        for update
        """,
        cmd.reconciliation_id,
    )
    if not rec:
        raise ReviewValidationError("Lançamento de conciliação não encontrado.")

    if rec["version"] != cmd.expected_version:
        raise ReviewConflictError(
            f"Conflito de concorrência: versão esperada {cmd.expected_version}, versão atual {rec['version']}."
        )

    # 3. Determina novo status
    new_status = rec["status"]
    if cmd.action == "APPROVE":
        new_status = "APPROVED"
    elif cmd.action == "REJECT":
        new_status = "REJECTED"
    elif cmd.action in ("REPLACE", "CORRECT"):
        new_status = "HUMAN_CONFIRMATION_REQUIRED"

    new_version = rec["version"] + 1

    # 4. Grava a decisão de revisão
    dec_row = await conn.fetchrow(
        """
        insert into public.review_decisions (
            reconciliation_id,
            action,
            evidence_link_id,
            reason,
            idempotency_key,
            actor_id
        )
        values ($1::uuid, $2, $3::uuid, $4, $5, $6::uuid)
        returning id
        """,
        cmd.reconciliation_id,
        cmd.action,
        cmd.evidence_link_id,
        cmd.reason,
        cmd.idempotency_key,
        cmd.actor_id,
    )
    decision_id = str(dec_row["id"])

    # 5. Atualiza a conciliação
    await conn.execute(
        """
        update public.reconciliations
        set status = $1, version = $2, updated_at = now()
        where id = $3::uuid
        """,
        new_status,
        new_version,
        cmd.reconciliation_id,
    )

    # 6. Grava evento de auditoria imutável (append-only)
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
            'RECONCILIATION',
            $2::uuid,
            $3,
            $4::uuid,
            $5,
            $6::jsonb,
            $7::jsonb
        )
        """,
        rec["projeto_id"],
        cmd.reconciliation_id,
        f"REVIEW_{cmd.action}",
        cmd.actor_id,
        cmd.reason,
        json.dumps({"status": rec["status"], "version": rec["version"]}),
        json.dumps({"status": new_status, "version": new_version}),
    )

    return ReviewResult(
        decision_id=decision_id,
        reconciliation_id=cmd.reconciliation_id,
        action=cmd.action,
        new_status=new_status,
        new_version=new_version,
    )

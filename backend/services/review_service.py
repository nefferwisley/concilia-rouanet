import json
import logging
from typing import Optional, Dict, Any
from backend.database import get_conn

logger = logging.getLogger("rouanet.review_service")

VALID_ACTIONS = {"APPROVE", "REJECT", "REPLACE", "MANUAL_LINK"}


async def apply_review_decision(
    conn,
    user_id: str,
    projeto_id: str,
    lancamento_id: str,
    action: str,
    file_id: Optional[str] = None,
    document_id: Optional[str] = None,
    reason: Optional[str] = None,
    idempotency_key: Optional[str] = None,
) -> Dict[str, Any]:
    action = action.upper()
    if action not in VALID_ACTIONS:
        raise ValueError(f"Ação de revisão inválida: {action}. Permitidas: {VALID_ACTIONS}")

    if action in ("REJECT", "REPLACE") and not reason:
        raise ValueError(f"Justificativa (reason) é obrigatória para a ação {action}.")

    # 1. Checagem de idempotência
    if idempotency_key:
        existing = await conn.fetchrow(
            """
            SELECT id, action, reason, created_at
            FROM review_decisions
            WHERE idempotency_key = $1
            """,
            idempotency_key
        )
        if existing:
            return {
                "decision_id": str(existing["id"]),
                "action": existing["action"],
                "status": "REPLAYED_IDEMPOTENT",
                "created_at": existing["created_at"].isoformat()
            }

    # 2. Captura estado anterior
    before_link = await conn.fetchrow(
        """
        SELECT id, file_id, document_id, match_type, revoked_at
        FROM evidence_links
        WHERE lancamento_id = $1 AND revoked_at IS NULL
        LIMIT 1
        """,
        lancamento_id
    )
    before_state = dict(before_link) if before_link else {}

    after_state = {}

    async with conn.transaction():
        if action == "APPROVE":
            # Confirma vínculo de evidência
            if before_link:
                await conn.execute(
                    "UPDATE evidence_links SET match_type = 'MANUAL_CONFIRMED' WHERE id = $1",
                    before_link["id"]
                )
                link_id = before_link["id"]
            else:
                row = await conn.fetchrow(
                    """
                    INSERT INTO evidence_links (lancamento_id, file_id, document_id, evidence_type, match_type, created_by)
                    VALUES ($1, $2, $3, 'FISCAL_DOCUMENT', 'MANUAL_CONFIRMED', $4)
                    RETURNING id
                    """,
                    lancamento_id, file_id, document_id, user_id
                )
                link_id = row["id"]

            await conn.execute(
                "UPDATE transacoes SET tem_nf = true, tem_comprovante = true WHERE id = $1",
                lancamento_id
            )
            # Atualiza campos_revisao se existir
            await conn.execute(
                """
                UPDATE campos_revisao
                SET status_revisao = 'CONFIRMADO', revisado_por = $1, revisado_em = now()
                WHERE transacao_id = $2 AND status_revisao = 'PENDENTE'
                """,
                user_id, lancamento_id
            )
            after_state = {"link_id": str(link_id), "status": "CONFIRMED", "file_id": file_id}

        elif action == "REJECT":
            if before_link:
                await conn.execute(
                    "UPDATE evidence_links SET revoked_at = now() WHERE id = $1",
                    before_link["id"]
                )
            await conn.execute(
                """
                UPDATE campos_revisao
                SET status_revisao = 'DESCARTADO', revisado_por = $1, revisado_em = now()
                WHERE transacao_id = $2 AND status_revisao = 'PENDENTE'
                """,
                user_id, lancamento_id
            )
            after_state = {"status": "REJECTED", "reason": reason}

        elif action == "REPLACE":
            if before_link:
                await conn.execute(
                    "UPDATE evidence_links SET revoked_at = now() WHERE id = $1",
                    before_link["id"]
                )
            row = await conn.fetchrow(
                """
                INSERT INTO evidence_links (lancamento_id, file_id, document_id, evidence_type, match_type, created_by)
                VALUES ($1, $2, $3, 'FISCAL_DOCUMENT', 'MANUAL_REPLACED', $4)
                RETURNING id
                """,
                lancamento_id, file_id, document_id, user_id
            )
            after_state = {"link_id": str(row["id"]), "status": "REPLACED", "file_id": file_id, "reason": reason}

        elif action == "MANUAL_LINK":
            row = await conn.fetchrow(
                """
                INSERT INTO evidence_links (lancamento_id, file_id, document_id, evidence_type, match_type, created_by)
                VALUES ($1, $2, $3, 'FISCAL_DOCUMENT', 'MANUAL', $4)
                RETURNING id
                """,
                lancamento_id, file_id, document_id, user_id
            )
            after_state = {"link_id": str(row["id"]), "status": "MANUALLY_LINKED", "file_id": file_id}

        # 3. Registra decisão na tabela imutável review_decisions
        dec_row = await conn.fetchrow(
            """
            INSERT INTO review_decisions (
                projeto_id, lancamento_id, file_id, document_id, action, reason, actor_id, idempotency_key
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, created_at
            """,
            projeto_id, lancamento_id, file_id, document_id, action, reason, user_id, idempotency_key
        )

        # 4. Registra evento imutável na trilha de auditoria
        await conn.execute(
            """
            INSERT INTO audit_events (
                projeto_id, entity_type, entity_id, action, before_state, after_state, reason, actor_id
            )
            VALUES ($1, 'EVIDENCE_LINK', $2, $3, $4::jsonb, $5::jsonb, $6, $7)
            """,
            projeto_id, lancamento_id, action, json.dumps(before_state, default=str), json.dumps(after_state, default=str), reason, user_id
        )

    return {
        "decision_id": str(dec_row["id"]),
        "action": action,
        "status": "APPLIED",
        "after_state": after_state,
        "created_at": dec_row["created_at"].isoformat()
    }

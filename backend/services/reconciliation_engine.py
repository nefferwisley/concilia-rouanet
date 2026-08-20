import logging
from decimal import Decimal
from typing import List, Optional

import asyncpg

from backend.domain.reconciliation import (
    BankSource,
    DeclaredSource,
    DocumentSource,
    MatchCandidate,
    rank_candidates,
    score_reconciliation_candidate,
)

logger = logging.getLogger(__name__)


async def reconcile_project_entries(
    conn: asyncpg.Connection,
    projeto_id: str,
) -> int:
    """
    Roda motor de conciliação para o projeto, criando/atualizando registros
    na tabela public.reconciliations e public.evidence_links.
    """
    # 1. Busca lançamentos declarados do projeto
    declared_rows = await conn.fetch(
        """
        select id, valor_declarado, data_declarada, fornecedor_declarado, documento_declarado, rubrica_declarada
        from public.declared_entries
        where projeto_id = $1::uuid
        order by row_number asc
        """,
        projeto_id,
    )

    if not declared_rows:
        return 0

    # 2. Busca movimentações bancárias
    bank_rows = await conn.fetch(
        """
        select id, data, descricao, valor, documento
        from public.transacoes
        where projeto_id = $1::uuid
        """,
        projeto_id,
    )
    bank_sources = [
        BankSource(
            id=str(r["id"]),
            data=str(r["data"]),
            descricao=str(r["descricao"] or ""),
            valor=Decimal(str(r["valor"])),
            documento=str(r["documento"]) if r["documento"] else None,
        )
        for r in bank_rows
    ]

    reconciled_count = 0

    for d_row in declared_rows:
        declared = DeclaredSource(
            id=str(d_row["id"]),
            valor=Decimal(str(d_row["valor_declarado"])) if d_row["valor_declarado"] is not None else None,
            data=str(d_row["data_declarada"]) if d_row["data_declarada"] else None,
            fornecedor=str(d_row["fornecedor_declarado"]) if d_row["fornecedor_declarado"] else None,
            documento=str(d_row["documento_declarado"]) if d_row["documento_declarado"] else None,
            rubrica=str(d_row["rubrica_declarada"]) if d_row["rubrica_declarada"] else None,
        )

        candidates: List[MatchCandidate] = []
        for b in bank_sources:
            cand = score_reconciliation_candidate(declared, bank=b)
            if cand.score > Decimal("0.3000"):
                candidates.append(cand)

        ranked = rank_candidates(candidates)
        best = ranked[0] if ranked else None

        # Insere ou atualiza conciliação
        rec_row = await conn.fetchrow(
            """
            insert into public.reconciliations (
                projeto_id,
                declared_entry_id,
                valor_declarado,
                valor_conciliado,
                status,
                confidence
            )
            values ($1::uuid, $2::uuid, $3, $4, $5, $6)
            returning id
            """,
            projeto_id,
            d_row["id"],
            d_row["valor_declarado"],
            d_row["valor_declarado"] if best and best.score >= Decimal("0.9000") else None,
            best.decision if best else "PENDING",
            best.score if best else Decimal("0.0000"),
        )
        rec_id = str(rec_row["id"])

        # Vincula linha declarada
        await conn.execute(
            """
            insert into public.evidence_links (
                reconciliation_id,
                evidence_type,
                evidence_id,
                match_type,
                score
            )
            values ($1::uuid, 'DECLARED_ROW', $2::uuid, 'DETERMINISTIC', 1.0000)
            """,
            rec_id,
            d_row["id"],
        )

        if best and best.bank_id:
            await conn.execute(
                """
                insert into public.evidence_links (
                    reconciliation_id,
                    evidence_type,
                    evidence_id,
                    match_type,
                    score
                )
                values ($1::uuid, 'BANK_MOVEMENT', $2::uuid, $3, $4)
                """,
                rec_id,
                best.bank_id,
                best.match_type,
                best.score,
            )

        reconciled_count += 1

    return reconciled_count

import asyncpg
from backend.domain.dossier import BlockItem, DossierContext, DossierReadiness, evaluate_dossier_readiness


async def check_project_dossier_readiness(
    conn: asyncpg.Connection,
    projeto_id: str,
) -> DossierReadiness:
    # 1. Total e aprovadas
    total_recs = await conn.fetchval(
        "select count(*) from public.reconciliations where projeto_id = $1::uuid",
        projeto_id,
    ) or 0

    approved_recs = await conn.fetchval(
        "select count(*) from public.reconciliations where projeto_id = $1::uuid and status = 'APPROVED'",
        projeto_id,
    ) or 0

    # 2. Pendências abertas
    issues_rows = await conn.fetch(
        """
        select issue_code, severity, description
        from public.issues
        where project_id = $1::uuid and status = 'OPEN'
        """,
        projeto_id,
    )

    open_issues = [
        BlockItem(
            issue_code=r["issue_code"],
            severity=r["severity"],
            description=r["description"],
        )
        for r in issues_rows
    ]

    ctx = DossierContext(
        project_id=projeto_id,
        package_name="ROUANET",
        package_version="1",
        total_reconciliations=int(total_recs),
        approved_reconciliations=int(approved_recs),
        open_issues=open_issues,
    )

    return evaluate_dossier_readiness(ctx)

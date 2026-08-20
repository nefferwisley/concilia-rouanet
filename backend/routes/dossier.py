import logging
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from backend.database import get_conn
from backend.services.dossier_readiness import check_project_dossier_readiness
from backend.services.dossier_service import DossierBlockedError, generate_dossier_snapshot

logger = logging.getLogger(__name__)
router = APIRouter(tags=["dossier"])


class DossierReadinessResponse(BaseModel):
    ready: bool
    project_id: str
    package_name: str
    package_version: str
    total_reconciliations: int
    approved_reconciliations: int
    blockers: List[dict[str, Any]]


class DossierSnapshotResponse(BaseModel):
    snapshot_id: str
    project_id: str
    package_name: str
    package_version: str
    sha256_hash: str
    created_at: str


@router.get(
    "/api/v1/projetos/{projeto_id}/dossier/readiness",
    response_model=DossierReadinessResponse,
)
async def obter_prontidao_dossie(
    projeto_id: str,
    dep=Depends(get_conn),
):
    conn, _ = dep
    readiness = await check_project_dossier_readiness(conn, projeto_id)
    return DossierReadinessResponse(
        ready=readiness.ready,
        project_id=readiness.project_id,
        package_name=readiness.package_name,
        package_version=readiness.package_version,
        total_reconciliations=readiness.total_reconciliations,
        approved_reconciliations=readiness.approved_reconciliations,
        blockers=[
            {"issue_code": b.issue_code, "severity": b.severity, "description": b.description}
            for b in readiness.blockers
        ],
    )


@router.post(
    "/api/v1/projetos/{projeto_id}/dossier/snapshots",
    response_model=DossierSnapshotResponse,
)
async def gerar_snapshot_dossie(
    projeto_id: str,
    dep=Depends(get_conn),
):
    conn, user_id = dep
    actor_id = user_id or "00000000-0000-0000-0000-000000000000"

    try:
        res = await generate_dossier_snapshot(conn, projeto_id, actor_id)
        return DossierSnapshotResponse(
            snapshot_id=res.snapshot_id,
            project_id=res.project_id,
            package_name=res.package_name,
            package_version=res.package_version,
            sha256_hash=res.sha256_hash,
            created_at=res.created_at,
        )
    except DossierBlockedError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"message": str(e), "blockers": e.blockers},
        )

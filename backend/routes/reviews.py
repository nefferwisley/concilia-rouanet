import logging
from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from pydantic import BaseModel

from backend.database import get_conn
from backend.domain.review import (
    ReviewAction,
    ReviewCommand,
    ReviewConflictError,
    ReviewResult,
    ReviewValidationError,
)
from backend.services.review_service import apply_review_command

logger = logging.getLogger(__name__)
router = APIRouter(tags=["reviews"])


class ReviewCommandIn(BaseModel):
    action: ReviewAction
    expected_version: int
    reason: str = ""
    evidence_link_id: Optional[str] = None


class ReviewResultOut(BaseModel):
    decision_id: str
    reconciliation_id: str
    action: str
    new_status: str
    new_version: int


class AuditEventOut(BaseModel):
    id: str
    project_id: str
    entity_type: str
    entity_id: str
    action: str
    actor_id: str
    reason: Optional[str] = None
    before_state: Optional[dict[str, Any]] = None
    after_state: Optional[dict[str, Any]] = None
    created_at: str


class AuditEventListResponse(BaseModel):
    items: List[AuditEventOut]
    next_cursor: Optional[str] = None


@router.post(
    "/api/v1/reconciliacoes/{reconciliation_id}/decisoes",
    response_model=ReviewResultOut,
)
async def registrar_decisao_revisao(
    reconciliation_id: str,
    payload: ReviewCommandIn,
    idempotency_key: str = Header(..., alias="Idempotency-Key"),
    dep=Depends(get_conn),
):
    conn, user_id = dep

    if not idempotency_key.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Header Idempotency-Key é obrigatório.",
        )

    cmd = ReviewCommand(
        reconciliation_id=reconciliation_id,
        action=payload.action,
        reason=payload.reason,
        expected_version=payload.expected_version,
        idempotency_key=idempotency_key.strip(),
        actor_id=user_id or "00000000-0000-0000-0000-000000000000",
        evidence_link_id=payload.evidence_link_id,
    )

    try:
        result = await apply_review_command(conn, cmd)
        return ReviewResultOut(
            decision_id=result.decision_id,
            reconciliation_id=result.reconciliation_id,
            action=result.action,
            new_status=result.new_status,
            new_version=result.new_version,
        )
    except ReviewValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except ReviewConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )


@router.get(
    "/api/v1/projetos/{projeto_id}/audit-events",
    response_model=AuditEventListResponse,
)
async def listar_eventos_auditoria(
    projeto_id: str,
    limit: int = Query(50, ge=1, le=100),
    after: Optional[str] = None,
    dep=Depends(get_conn),
):
    conn, _ = dep

    query = """
        select
            id,
            project_id,
            entity_type,
            entity_id,
            action,
            actor_id,
            reason,
            before_state,
            after_state,
            created_at::text as created_at
        from public.audit_events
        where project_id = $1::uuid
    """
    params: list[Any] = [projeto_id]

    if after:
        params.append(after)
        query += f" and (created_at, id) < (select created_at, id from public.audit_events where id = ${len(params)}::uuid)"

    query += " order by created_at desc, id desc"
    params.append(limit)
    query += f" limit ${len(params)}"

    rows = await conn.fetch(query, *params)

    items = [
        AuditEventOut(
            id=str(r["id"]),
            project_id=str(r["project_id"]),
            entity_type=r["entity_type"],
            entity_id=str(r["entity_id"]),
            action=r["action"],
            actor_id=str(r["actor_id"]),
            reason=r["reason"],
            before_state=r["before_state"],
            after_state=r["after_state"],
            created_at=r["created_at"],
        )
        for r in rows
    ]

    next_cursor = items[-1].id if len(items) == limit else None

    return AuditEventListResponse(
        items=items,
        next_cursor=next_cursor,
    )

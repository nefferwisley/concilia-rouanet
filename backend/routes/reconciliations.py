import logging
from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from backend.database import get_conn
from backend.services.storage_service import get_supabase_client

logger = logging.getLogger(__name__)
router = APIRouter(tags=["reconciliations"])


class ReconciliationItemOut(BaseModel):
    id: str
    projeto_id: str
    declared_entry_id: Optional[str] = None
    valor_declarado: Optional[float] = None
    valor_conciliado: Optional[float] = None
    status: str
    confidence: float
    fornecedor_declarado: Optional[str] = None
    data_declarada: Optional[str] = None
    documento_declarado: Optional[str] = None
    rubrica_declarada: Optional[str] = None
    created_at: str


class ReconciliationListResponse(BaseModel):
    items: List[ReconciliationItemOut]
    next_cursor: Optional[str] = None
    total_count: int


class EvidenceLinkOut(BaseModel):
    id: str
    evidence_type: str
    evidence_id: str
    match_type: str
    score: float


class ReconciliationDetailOut(BaseModel):
    id: str
    projeto_id: str
    declared_entry_id: Optional[str] = None
    valor_declarado: Optional[float] = None
    valor_conciliado: Optional[float] = None
    status: str
    confidence: float
    fornecedor_declarado: Optional[str] = None
    data_declarada: Optional[str] = None
    documento_declarado: Optional[str] = None
    rubrica_declarada: Optional[str] = None
    links: List[EvidenceLinkOut]
    issues: List[dict[str, Any]]


class SignedUrlResponse(BaseModel):
    signed_url: str
    expires_in: int = 3600


@router.get(
    "/api/v1/projetos/{projeto_id}/conciliacoes",
    response_model=ReconciliationListResponse,
)
async def listar_conciliacoes(
    projeto_id: str,
    limit: int = Query(50, ge=1, le=100),
    after: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    dep=Depends(get_conn),
):
    conn, _ = dep

    # Verifica acesso ao projeto
    has_access = await conn.fetchval(
        "select id from public.projetos where id = $1::uuid",
        projeto_id,
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projeto não encontrado ou sem permissão de acesso.",
        )

    query = """
        select
            r.id,
            r.projeto_id,
            r.declared_entry_id,
            r.valor_declarado::float as valor_declarado,
            r.valor_conciliado::float as valor_conciliado,
            r.status,
            r.confidence::float as confidence,
            d.fornecedor_declarado,
            d.data_declarada,
            d.documento_declarado,
            d.rubrica_declarada,
            r.created_at::text as created_at
        from public.reconciliations r
        left join public.declared_entries d on d.id = r.declared_entry_id
        where r.projeto_id = $1::uuid
    """
    params: list[Any] = [projeto_id]

    if status_filter:
        params.append(status_filter)
        query += f" and r.status = ${len(params)}"

    if search:
        params.append(f"%{search}%")
        query += f" and (d.fornecedor_declarado ilike ${len(params)} or d.documento_declarado ilike ${len(params)})"

    if after:
        params.append(after)
        query += f" and (r.created_at, r.id) < (select created_at, id from public.reconciliations where id = ${len(params)}::uuid)"

    query += " order by r.created_at desc, r.id desc"
    params.append(limit)
    query += f" limit ${len(params)}"

    rows = await conn.fetch(query, *params)

    total_count = await conn.fetchval(
        "select count(*) from public.reconciliations where projeto_id = $1::uuid",
        projeto_id,
    ) or 0

    items = [
        ReconciliationItemOut(
            id=str(r["id"]),
            projeto_id=str(r["projeto_id"]),
            declared_entry_id=str(r["declared_entry_id"]) if r["declared_entry_id"] else None,
            valor_declarado=r["valor_declarado"],
            valor_conciliado=r["valor_conciliado"],
            status=r["status"],
            confidence=r["confidence"] or 0.0,
            fornecedor_declarado=r["fornecedor_declarado"],
            data_declarada=r["data_declarada"],
            documento_declarado=r["documento_declarado"],
            rubrica_declarada=r["rubrica_declarada"],
            created_at=r["created_at"],
        )
        for r in rows
    ]

    next_cursor = items[-1].id if len(items) == limit else None

    return ReconciliationListResponse(
        items=items,
        next_cursor=next_cursor,
        total_count=int(total_count),
    )


@router.get(
    "/api/v1/conciliacoes/{id}",
    response_model=ReconciliationDetailOut,
)
async def obter_detalhe_conciliacao(
    id: str,
    dep=Depends(get_conn),
):
    conn, _ = dep

    rec = await conn.fetchrow(
        """
        select
            r.id,
            r.projeto_id,
            r.declared_entry_id,
            r.valor_declarado::float as valor_declarado,
            r.valor_conciliado::float as valor_conciliado,
            r.status,
            r.confidence::float as confidence,
            d.fornecedor_declarado,
            d.data_declarada,
            d.documento_declarado,
            d.rubrica_declarada
        from public.reconciliations r
        left join public.declared_entries d on d.id = r.declared_entry_id
        where r.id = $1::uuid
        """,
        id,
    )

    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conciliação não encontrada.",
        )

    # Busca links de evidências
    link_rows = await conn.fetch(
        """
        select id, evidence_type, evidence_id, match_type, score::float as score
        from public.evidence_links
        where reconciliation_id = $1::uuid and revoked_at is null
        """,
        id,
    )
    links = [
        EvidenceLinkOut(
            id=str(l["id"]),
            evidence_type=l["evidence_type"],
            evidence_id=str(l["evidence_id"]),
            match_type=l["match_type"],
            score=l["score"] or 1.0,
        )
        for l in link_rows
    ]

    # Busca issues associadas
    issue_rows = await conn.fetch(
        """
        select id, issue_code, severity, status, description, created_at::text as created_at
        from public.issues
        where reconciliation_id = $1::uuid
        """,
        id,
    )
    issues = [
        {
            "id": str(i["id"]),
            "issue_code": i["issue_code"],
            "severity": i["severity"],
            "status": i["status"],
            "description": i["description"],
            "created_at": i["created_at"],
        }
        for i in issue_rows
    ]

    return ReconciliationDetailOut(
        id=str(rec["id"]),
        projeto_id=str(rec["projeto_id"]),
        declared_entry_id=str(rec["declared_entry_id"]) if rec["declared_entry_id"] else None,
        valor_declarado=rec["valor_declarado"],
        valor_conciliado=rec["valor_conciliado"],
        status=rec["status"],
        confidence=rec["confidence"] or 0.0,
        fornecedor_declarado=rec["fornecedor_declarado"],
        data_declarada=rec["data_declarada"],
        documento_declarado=rec["documento_declarado"],
        rubrica_declarada=rec["rubrica_declarada"],
        links=links,
        issues=issues,
    )


@router.get(
    "/api/v1/documentos/{id}/signed-url",
    response_model=SignedUrlResponse,
)
async def obter_url_assinada_documento(
    id: str,
    dep=Depends(get_conn),
):
    conn, _ = dep

    doc = await conn.fetchrow(
        """
        select d.id, f.storage_key
        from public.documents d
        join public.import_files f on f.id = d.file_id
        where d.id = $1::uuid
        """,
        id,
    )

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documento não encontrado.",
        )

    supabase = get_supabase_client()
    if supabase:
        try:
            res = supabase.storage.from_("documentos").create_signed_url(doc["storage_key"], 3600)
            if "signedURL" in res:
                return SignedUrlResponse(signed_url=res["signedURL"], expires_in=3600)
        except Exception:
            logger.warning("Falha ao gerar signed URL via Supabase Storage")

    # Fallback para ambiente local/mock
    return SignedUrlResponse(
        signed_url=f"/api/v1/storage/mock/{doc['storage_key']}",
        expires_in=3600,
    )

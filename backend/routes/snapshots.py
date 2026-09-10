"""
backend/routes/snapshots.py — Endpoints para persistência de snapshots e documentos de projetos.
Implementa:
1. Versionamento e controle de concorrência otimista (retorna HTTP 409 em caso de versão desatualizada).
2. Hash SHA-256 do payload para integridade.
3. Sanitização contra PDFs em base64 dentro do snapshot.
4. Trilha imutável em audit_events para criação/edição de snapshots e documentos.
"""
import hashlib
import json
import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from backend.database import get_conn

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/projetos", tags=["snapshots"])


class SnapshotUpdateRequest(BaseModel):
    snapshot: Dict[str, Any]
    version: Optional[int] = None
    source_system: Optional[str] = "web_client"


def _sanitizar_snapshot(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Remove arquivos grandes em base64 incorporados no JSON do snapshot.
    Preserva apenas storageKey, objectPath, metadados e hashes.
    """
    clean = json.loads(json.dumps(payload))
    # Limpa possíveis chaves base64 em documentos
    docs = clean.get("documentos") or clean.get("documents") or []
    if isinstance(docs, list):
        for doc in docs:
            if isinstance(doc, dict):
                if "base64" in doc:
                    doc["base64"] = None
                if "dataUrl" in doc and len(str(doc.get("dataUrl") or "")) > 500:
                    doc["dataUrl"] = None
    return clean


@router.get("/{projeto_id}/snapshot")
async def obter_snapshot(projeto_id: str, dep=Depends(get_conn)):
    conn, user_id = dep
    row = await conn.fetchrow(
        """
        SELECT payload, version, snapshot_hash, updated_at
        FROM project_snapshots
        WHERE project_id = $1 AND owner_id = $2 AND is_deleted = false
        ORDER BY updated_at DESC
        LIMIT 1
        """,
        projeto_id, user_id
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projeto ainda não foi salvo online."
        )

    return {
        "snapshot": row["payload"],
        "version": row["version"],
        "snapshot_hash": row["snapshot_hash"],
        "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None
    }


@router.put("/{projeto_id}/snapshot")
async def salvar_snapshot(
    projeto_id: str,
    payload: SnapshotUpdateRequest,
    dep=Depends(get_conn)
):
    conn, user_id = dep
    
    # 1. Higieniza e serializa
    clean_snapshot = _sanitizar_snapshot(payload.snapshot)
    serialized = json.dumps(clean_snapshot, ensure_ascii=False)
    if len(serialized.encode("utf-8")) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="O estado do projeto excede o limite de 10 MB."
        )
    
    snapshot_hash = hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    async with conn.transaction():
        # 2. Busca snapshot atual para controle de concorrência otimista
        existente = await conn.fetchrow(
            """
            SELECT id, version, snapshot_hash, payload
            FROM project_snapshots
            WHERE project_id = $1 AND owner_id = $2 AND is_deleted = false
            FOR UPDATE
            """,
            projeto_id, user_id
        )

        nova_versao = 1
        before_state = None

        if existente:
            versao_atual = existente["version"]
            before_state = {
                "version": versao_atual,
                "snapshot_hash": existente["snapshot_hash"]
            }

            # Se o cliente enviou a versão que leu e ela diverge do banco -> 409 Conflict
            if payload.version is not None and payload.version != versao_atual:
                logger.warning(
                    "Conflito otimista no projeto %s: versão enviada %d, versão atual no banco %d",
                    projeto_id, payload.version, versao_atual
                )
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "error": "Conflito de concorrência: o projeto foi alterado em outra sessão.",
                        "current_version": versao_atual,
                        "sent_version": payload.version
                    }
                )
            nova_versao = versao_atual + 1

            await conn.execute(
                """
                UPDATE project_snapshots
                SET payload = $1::jsonb,
                    version = $2,
                    snapshot_hash = $3,
                    source_system = $4,
                    updated_at = now()
                WHERE id = $5
                """,
                serialized,
                nova_versao,
                snapshot_hash,
                payload.source_system or "web_client",
                existente["id"]
            )
        else:
            await conn.execute(
                """
                INSERT INTO project_snapshots (
                    project_id, owner_id, payload, version, snapshot_hash, source_system, created_at, updated_at
                )
                VALUES ($1, $2, $3::jsonb, 1, $4, $5, now(), now())
                """,
                projeto_id,
                user_id,
                serialized,
                snapshot_hash,
                payload.source_system or "web_client"
            )

        # 3. Registrar auditoria
        try:
            await conn.execute(
                """
                INSERT INTO audit_events (
                    projeto_id, entity_type, entity_id, action, before_state, after_state, actor_id, created_at
                )
                VALUES (
                    $1, 'PROJECT_SNAPSHOT', gen_random_uuid(), 'UPDATE_SNAPSHOT',
                    $2::jsonb, $3::jsonb, $4, now()
                )
                """,
                projeto_id,
                json.dumps(before_state) if before_state else None,
                json.dumps({"version": nova_versao, "snapshot_hash": snapshot_hash}),
                user_id
            )
        except Exception as e:
            logger.warning("Falha não-bloqueante ao registrar evento de auditoria de snapshot: %s", e)

    return {
        "saved": True,
        "project_id": projeto_id,
        "version": nova_versao,
        "snapshot_hash": snapshot_hash
    }

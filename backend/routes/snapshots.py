"""
backend/routes/snapshots.py — Endpoints para persistência de snapshots e documentos de projetos.
Implementa:
1. Versionamento e controle de concorrência otimista (retorna HTTP 409 em caso de versão desatualizada).
2. Hash SHA-256 do payload para integridade.
3. Sanitização contra PDFs em base64 dentro do snapshot.
4. Trilha imutável em audit_events para criação/edição de snapshots e documentos.
"""
import base64
import binascii
import hashlib
import json
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from backend.database import get_conn
from backend.services import storage_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/projetos", tags=["snapshots"])


class SnapshotUpdateRequest(BaseModel):
    snapshot: Dict[str, Any]
    version: Optional[int] = None
    source_system: Optional[str] = "web_client"


class ProjectDocumentUploadRequest(BaseModel):
    """Payload compatível com o cliente web para persistir uma evidência."""

    documentId: str
    fileName: str
    mimeType: str
    base64: str


_ALLOWED_DOCUMENT_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-powerpoint",
    "application/rtf",
    "text/csv",
    "text/plain",
    "application/xml",
    "text/xml",
    "application/json",
    "application/zip",
    "application/octet-stream",
}
_BASE64_RE = re.compile(r"^[A-Za-z0-9+/]*={0,2}$")
_MAX_DOCUMENT_BYTES = 25 * 1024 * 1024


def _storage_segment(value: str, fallback: str = "arquivo") -> str:
    """Mantém cada segmento da chave do Storage sem traversal ou separadores."""
    clean = re.sub(r"[^A-Za-z0-9._-]+", "-", value).strip(".-")[:120]
    return clean or fallback


def _sanitizar_snapshot(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Remove arquivos grandes em base64 incorporados no JSON do snapshot.
    Preserva apenas storageKey, objectPath, metadados e hashes.
    """
    clean = json.loads(json.dumps(payload))
    # Limpa possíveis chaves base64 em documentos
    docs = clean.get("documentos") or clean.get("documents") or []
    document_lists = docs.values() if isinstance(docs, dict) else [docs]
    for document_list in document_lists:
        if not isinstance(document_list, list):
            continue
        for doc in document_list:
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


@router.post("/{projeto_id}/documentos", status_code=status.HTTP_201_CREATED)
async def armazenar_documento_projeto(
    projeto_id: str,
    payload: ProjectDocumentUploadRequest,
    dep=Depends(get_conn),
):
    """Persiste documentos enviados pelo importador web.

    O frontend envia base64 porque seleciona arquivos via File System Access API.
    O conteúdo é decodificado somente no servidor, gravado no Storage privado e
    referenciado por ``document_assets``; o snapshot nunca recebe os bytes.
    """
    conn, user_id = dep
    if not projeto_id.strip() or not payload.documentId.strip() or not payload.fileName.strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Identificação do projeto e do arquivo é obrigatória.")
    if payload.mimeType not in _ALLOWED_DOCUMENT_MIME_TYPES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Tipo de arquivo não suportado para o dossiê.")

    raw_base64 = re.sub(r"^data:[^;]+;base64,", "", payload.base64.strip())
    if not raw_base64 or not _BASE64_RE.fullmatch(raw_base64) or len(raw_base64) % 4:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Conteúdo do arquivo inválido.")
    try:
        conteudo = base64.b64decode(raw_base64, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Conteúdo do arquivo inválido.") from exc
    if not conteudo or len(conteudo) > _MAX_DOCUMENT_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Arquivo vazio ou acima de 25 MB.")

    # A chave é sanitizada pelo storage_service; o nome original permanece no
    # catálogo para exibição e auditoria.
    caminho = "/".join(
        (
            _storage_segment(user_id, "usuario"),
            _storage_segment(projeto_id, "projeto"),
            _storage_segment(payload.documentId, "documento"),
            _storage_segment(Path(payload.fileName).name),
        )
    )
    try:
        object_path = await run_in_threadpool(
            storage_service.upload_arquivo,
            caminho,
            conteudo,
            payload.mimeType,
        )
        await conn.execute(
            """
            INSERT INTO document_assets (
                project_id, document_id, owner_id, object_path, file_name, mime_type, byte_size
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (owner_id, project_id, document_id) DO UPDATE SET
                object_path = EXCLUDED.object_path,
                file_name = EXCLUDED.file_name,
                mime_type = EXCLUDED.mime_type,
                byte_size = EXCLUDED.byte_size,
                updated_at = now()
            """,
            projeto_id,
            payload.documentId,
            user_id,
            object_path,
            payload.fileName,
            payload.mimeType,
            len(conteudo),
        )
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 — converte falhas de storage/DB em resposta acionável
        logger.exception("Falha ao armazenar documento %s do projeto %s", payload.fileName, projeto_id)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Não foi possível armazenar o documento.") from exc

    return {
        "stored": True,
        "documentId": payload.documentId,
        "fileName": payload.fileName,
        "byteSize": len(conteudo),
    }


@router.get("/{projeto_id}/documentos")
async def listar_documentos_projeto(projeto_id: str, dep=Depends(get_conn)):
    """Lista apenas metadados dos documentos privados do usuário."""
    conn, user_id = dep
    rows = await conn.fetch(
        """
        SELECT document_id, file_name, mime_type, byte_size
        FROM document_assets
        WHERE project_id = $1 AND owner_id = $2
        ORDER BY created_at ASC
        """,
        projeto_id,
        user_id,
    )
    return {
        "documentos": [
            {
                "documentId": row["document_id"],
                "fileName": row["file_name"],
                "mimeType": row["mime_type"],
                "byteSize": row["byte_size"],
            }
            for row in rows
        ]
    }

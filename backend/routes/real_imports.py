import hashlib
import logging
from typing import List
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel

from backend.database import get_conn
from backend.services.storage_service import upload_arquivo, sanitizar_chave

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["real_imports"])


class ManifestFile(BaseModel):
    relativePath: str
    originalName: str
    browserMime: str
    sizeBytes: int
    sha256: str


class ManifestRequest(BaseModel):
    files: List[ManifestFile]


def build_storage_key(user_id: str, project_id: str, sha256: str, original_name: str) -> str:
    safe_name = sanitizar_chave(original_name).replace("/", "_")
    return f"{user_id}/{project_id}/{sha256}/{safe_name}"


@router.post("/projetos/{projeto_id}/imports", status_code=201)
async def create_manifest(
    projeto_id: str,
    payload: ManifestRequest,
    dep=Depends(get_conn)
):
    conn, user_id = dep
    
    # 1. Verificar se projeto existe e usuario tem acesso
    projeto = await conn.fetchrow("SELECT id FROM projetos WHERE id = $1", projeto_id)
    if not projeto:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Projeto não encontrado (ou sem acesso).")

    if not payload.files:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Manifesto vazio. Envie ao menos um arquivo.")

    importacao_id = None
    async with conn.transaction():
        # Criar registro na tabela de importacoes
        row = await conn.fetchrow(
            """
            INSERT INTO importacoes (projeto_id, criado_por, status, modo, linhas_total)
            VALUES ($1, $2, 'iniciando', 'commit', $3)
            RETURNING id
            """,
            projeto_id, user_id, len(payload.files)
        )
        importacao_id = str(row["id"])
        
        # Inserir cada arquivo do manifesto com protecao de conflito SHA-256 por projeto
        for f in payload.files:
            storage_key_placeholder = f"PENDING_{f.sha256}_{f.sizeBytes}"
            try:
                await conn.execute(
                    """
                    INSERT INTO import_files (
                        importacao_id, projeto_id, relative_path, original_name,
                        storage_key, browser_mime, size_bytes, sha256, status
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'RECEIVING')
                    ON CONFLICT (projeto_id, sha256)
                    DO UPDATE SET
                        importacao_id = EXCLUDED.importacao_id,
                        relative_path = EXCLUDED.relative_path,
                        original_name = EXCLUDED.original_name,
                        updated_at = now()
                    """,
                    importacao_id, projeto_id, f.relativePath, f.originalName,
                    storage_key_placeholder, f.browserMime, f.sizeBytes, f.sha256
                )
            except Exception as e:
                logger.error("Erro ao registrar arquivo %s no manifesto: %s", f.originalName, e)
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    f"Erro ao registrar arquivo {f.originalName}: {e}"
                )

        # Buscar arquivos vinculados a esta importação para devolver IDs mapeados
        files_db = await conn.fetch(
            "SELECT id, sha256, status FROM import_files WHERE importacao_id = $1",
            importacao_id
        )

    return {
        "importacao_id": importacao_id,
        "projeto_id": projeto_id,
        "total_arquivos": len(payload.files),
        "files": [
            {
                "file_id": str(f["id"]),
                "sha256": f["sha256"],
                "status": f["status"]
            }
            for f in files_db
        ]
    }


@router.put("/importacoes/{importacao_id}/arquivos/{file_id}/conteudo", status_code=200)
async def upload_file_content(
    importacao_id: str,
    file_id: str,
    arquivo: UploadFile = File(...),
    dep=Depends(get_conn)
):
    conn, user_id = dep
    
    # 1. Conferir projeto/importacao
    file_row = await conn.fetchrow(
        """
        SELECT i.projeto_id, f.sha256, f.size_bytes, f.original_name, f.status
        FROM import_files f
        JOIN importacoes i ON f.importacao_id = i.id
        WHERE f.id = $1 AND f.importacao_id = $2
        """,
        file_id, importacao_id
    )
    if not file_row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Arquivo não encontrado ou sem permissão de acesso.")

    if file_row["status"] in ("UPLOADED", "COMPLETED", "DONE"):
        return {"status": file_row["status"], "message": "Arquivo já recebido e processado."}

    # 2. Ler e conferir tamanho
    conteudo = await arquivo.read()
    if len(conteudo) != file_row["size_bytes"]:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Tamanho do arquivo recebido ({len(conteudo)}b) difere do manifesto ({file_row['size_bytes']}b)."
        )

    # 3. Recalcular e conferir hash SHA-256
    calc_hash = hashlib.sha256(conteudo).hexdigest()
    if calc_hash.lower() != file_row["sha256"].lower():
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Hash SHA-256 do arquivo difere do declarado no manifesto."
        )

    projeto_id = str(file_row["projeto_id"])
    
    # 4. Gravar no storage
    storage_key = build_storage_key(str(user_id), projeto_id, calc_hash, file_row["original_name"])
    try:
        storage_key_ret = upload_arquivo(storage_key, conteudo)
    except Exception as e:
        logger.error("Erro ao subir arquivo %s pro storage: %s", file_id, e)
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Erro ao salvar no storage: {e}")

    # 5. Atualizar tabela, criar job e evento na mesma transação
    async with conn.transaction():
        await conn.execute("SELECT 1 FROM import_files WHERE id = $1 FOR UPDATE", file_id)
        
        await conn.execute(
            """
            UPDATE import_files
            SET status = 'UPLOADED', storage_key = $1, updated_at = now()
            WHERE id = $2
            """,
            storage_key_ret, file_id
        )
        
        job_exists = await conn.fetchval(
            "SELECT 1 FROM processing_jobs WHERE file_id = $1 AND job_type = 'PARSE_FILE'",
            file_id
        )
        if not job_exists:
            await conn.execute(
                """
                INSERT INTO processing_jobs (file_id, job_type, status, available_at)
                VALUES ($1, 'PARSE_FILE', 'PENDING', now())
                """,
                file_id
            )
            
        await conn.execute(
            """
            INSERT INTO processing_events (file_id, status, details)
            VALUES ($1, 'FILE_UPLOADED', $2::jsonb)
            """,
            file_id, '{"action": "upload_complete"}'
        )

    return {"status": "UPLOADED", "storage_key": storage_key_ret, "file_id": file_id}


@router.get("/importacoes/{importacao_id}/resumo-lote")
async def obter_resumo_lote(importacao_id: str, dep=Depends(get_conn)):
    conn, _ = dep
    
    importacao = await conn.fetchrow(
        "SELECT id, projeto_id, status, created_at FROM importacoes WHERE id = $1",
        importacao_id
    )
    if not importacao:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lote de importação não encontrado.")

    # Contagem de arquivos por status
    counts = await conn.fetch(
        """
        SELECT status, count(*) as total
        FROM import_files
        WHERE importacao_id = $1
        GROUP BY status
        """,
        importacao_id
    )
    status_map = {row["status"]: row["total"] for row in counts}
    
    total_arquivos = sum(status_map.values())
    concluidos = status_map.get("DONE", 0) + status_map.get("COMPLETED", 0) + status_map.get("CLASSIFIED", 0)
    erros = status_map.get("FAILED", 0) + status_map.get("ERROR", 0)
    processando = status_map.get("EXTRACTING", 0) + status_map.get("UPLOADED", 0) + status_map.get("PROCESSING", 0)
    aguardando = status_map.get("RECEIVING", 0) + status_map.get("PENDING", 0)
    revisao = status_map.get("REVIEW_REQUIRED", 0)

    # Detalhes dos arquivos recentes
    files_sample = await conn.fetch(
        """
        SELECT id, original_name, relative_path, size_bytes, sha256, status, error_message, updated_at
        FROM import_files
        WHERE importacao_id = $1
        ORDER BY updated_at DESC
        LIMIT 100
        """,
        importacao_id
    )

    return {
        "importacao_id": importacao_id,
        "projeto_id": str(importacao["projeto_id"]),
        "status_geral": importacao["status"],
        "total_arquivos": total_arquivos,
        "concluidos": concluidos,
        "erros": erros,
        "processando": processando,
        "aguardando": aguardando,
        "revisao_pendente": revisao,
        "progresso_pct": int(100 * concluidos / total_arquivos) if total_arquivos > 0 else 0,
        "detalhe_status": status_map,
        "arquivos": [
            {
                "id": str(f["id"]),
                "nome": f["original_name"],
                "caminho": f["relative_path"],
                "tamanho_bytes": f["size_bytes"],
                "sha256": f["sha256"],
                "status": f["status"],
                "erro": f["error_message"],
            }
            for f in files_sample
        ]
    }


@router.post("/importacoes/{importacao_id}/retry-failed")
async def retry_failed_jobs(importacao_id: str, dep=Depends(get_conn)):
    conn, _ = dep
    
    failed_files = await conn.fetch(
        """
        SELECT id FROM import_files
        WHERE importacao_id = $1 AND status IN ('FAILED', 'ERROR')
        """,
        importacao_id
    )
    if not failed_files:
        return {"reprocessados": 0, "message": "Nenhum arquivo em estado de erro para reprocessar."}

    file_ids = [f["id"] for f in failed_files]
    
    async with conn.transaction():
        await conn.execute(
            """
            UPDATE import_files
            SET status = 'UPLOADED', error_code = NULL, error_message = NULL, updated_at = now()
            WHERE id = ANY($1::uuid[])
            """,
            file_ids
        )
        await conn.execute(
            """
            UPDATE processing_jobs
            SET status = 'PENDING', attempts = 0, available_at = now(), locked_by = NULL, locked_at = NULL, error_code = NULL, updated_at = now()
            WHERE file_id = ANY($1::uuid[])
            """,
            file_ids
        )

    logger.info("Lote %s: %d arquivo(s) com erro reenfileirados para reprocessamento.", importacao_id, len(file_ids))
    return {"reprocessados": len(file_ids), "status": "REENFILEIRADO"}


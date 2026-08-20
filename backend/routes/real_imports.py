import logging
from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status

from backend.database import get_conn
from backend.models import (
    ImportBatchStatusOut,
    ImportFileOut,
    ImportManifestCreate,
    ImportManifestResponse,
)
from backend.services.storage_service import build_storage_key

logger = logging.getLogger(__name__)
router = APIRouter(tags=["real_imports"])


@router.post(
    "/api/v1/projetos/{projeto_id}/importacoes/manifesto",
    status_code=status.HTTP_201_CREATED,
    response_model=ImportManifestResponse,
)
async def criar_manifesto_importacao(
    projeto_id: str,
    body: ImportManifestCreate,
    dep=Depends(get_conn),
):
    conn, user_id = dep

    # Valida se o projeto existe e se o usuário autenticado tem acesso
    project_exists = await conn.fetchval(
        "select id from public.projetos where id = $1::uuid",
        projeto_id,
    )
    if not project_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projeto não encontrado ou sem permissão de acesso.",
        )

    # Cria ou recupera registro de importação
    importacao_row = await conn.fetchrow(
        """
        insert into public.importacoes (projeto_id, tipo, status, progresso, total_arquivos)
        values ($1::uuid, 'PASTA_REAL', 'RECEIVING', 0, $2)
        returning id, status
        """,
        projeto_id,
        len(body.files),
    )
    importacao_id = str(importacao_row["id"])

    # Atualiza o status do projeto para IMPORTING se estiver EMPTY
    await conn.execute(
        """
        update public.projetos
        set status_processamento = 'IMPORTING', updated_at = now()
        where id = $1::uuid and status_processamento = 'EMPTY'
        """,
        projeto_id,
    )

    registered_files: list[ImportFileOut] = []

    for file_item in body.files:
        storage_key = build_storage_key(
            user_id=user_id,
            project_id=projeto_id,
            sha256=file_item.sha256,
            original_name=file_item.original_name,
        )

        row = await conn.fetchrow(
            """
            insert into public.import_files (
                importacao_id,
                projeto_id,
                relative_path,
                original_name,
                storage_key,
                browser_mime,
                size_bytes,
                sha256,
                status
            )
            values ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, 'RECEIVING')
            on conflict (projeto_id, sha256) do update
            set importacao_id = excluded.importacao_id,
                relative_path = excluded.relative_path,
                updated_at = now()
            returning id, relative_path, original_name, storage_key, size_bytes, sha256, status, detected_type, error_code, error_message
            """,
            importacao_id,
            projeto_id,
            file_item.relative_path,
            file_item.original_name,
            storage_key,
            file_item.browser_mime,
            file_item.size_bytes,
            file_item.sha256,
        )

        registered_files.append(
            ImportFileOut(
                id=str(row["id"]),
                relative_path=row["relative_path"],
                original_name=row["original_name"],
                storage_key=row["storage_key"],
                size_bytes=row["size_bytes"],
                sha256=row["sha256"],
                status=row["status"],
                detected_type=row["detected_type"],
                error_code=row["error_code"],
                error_message=row["error_message"],
            )
        )

    return ImportManifestResponse(
        importacao_id=importacao_id,
        projeto_id=projeto_id,
        status="RECEIVING",
        total_files=len(registered_files),
        files=registered_files,
    )


@router.post(
    "/api/v1/importacoes/{importacao_id}/arquivos/{file_id}/concluir",
    status_code=status.HTTP_200_OK,
    response_model=ImportFileOut,
)
async def concluir_upload_arquivo(
    importacao_id: str,
    file_id: str,
    dep=Depends(get_conn),
):
    conn, user_id = dep

    row = await conn.fetchrow(
        """
        update public.import_files
        set status = 'UPLOADED', updated_at = now()
        where id = $1::uuid and importacao_id = $2::uuid
        returning id, projeto_id, relative_path, original_name, storage_key, size_bytes, sha256, status, detected_type, error_code, error_message
        """,
        file_id,
        importacao_id,
    )

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Arquivo de importação não encontrado.",
        )

    # Cria o job privado para o worker
    await conn.execute(
        """
        insert into private.processing_jobs (file_id, job_type, status)
        values ($1::uuid, 'PARSE_FILE', 'PENDING')
        """,
        file_id,
    )

    # Registra evento de progresso
    await conn.execute(
        """
        insert into public.processing_events (importacao_id, projeto_id, file_id, event_type, payload)
        values ($1::uuid, $2::uuid, $3::uuid, 'FILE_UPLOADED', $4::jsonb)
        """,
        importacao_id,
        row["projeto_id"],
        file_id,
        '{"status": "UPLOADED"}',
    )

    return ImportFileOut(
        id=str(row["id"]),
        relative_path=row["relative_path"],
        original_name=row["original_name"],
        storage_key=row["storage_key"],
        size_bytes=row["size_bytes"],
        sha256=row["sha256"],
        status=row["status"],
        detected_type=row["detected_type"],
        error_code=row["error_code"],
        error_message=row["error_message"],
    )


@router.get(
    "/api/v1/importacoes/{importacao_id}/status",
    status_code=status.HTTP_200_OK,
    response_model=ImportBatchStatusOut,
)
async def obter_status_importacao(
    importacao_id: str,
    dep=Depends(get_conn),
):
    conn, _ = dep

    importacao = await conn.fetchrow(
        "select id, projeto_id, status from public.importacoes where id = $1::uuid",
        importacao_id,
    )
    if not importacao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Importação não encontrada.",
        )

    stats = await conn.fetchrow(
        """
        select
            count(*) as total,
            count(*) filter (where status in ('UPLOADED', 'PROCESSING', 'PARSED')) as uploaded,
            count(*) filter (where status = 'PARSED') as processed,
            count(*) filter (where status = 'FAILED') as failed
        from public.import_files
        where importacao_id = $1::uuid
        """,
        importacao_id,
    )

    declared_count = await conn.fetchval(
        "select count(*) from public.declared_entries where projeto_id = $1::uuid",
        importacao["projeto_id"],
    ) or 0

    bank_count = await conn.fetchval(
        "select count(*) from public.transacoes where projeto_id = $1::uuid",
        importacao["projeto_id"],
    ) or 0

    return ImportBatchStatusOut(
        importacao_id=importacao_id,
        projeto_id=str(importacao["projeto_id"]),
        status=importacao["status"],
        total_files=int(stats["total"] or 0),
        uploaded_files=int(stats["uploaded"] or 0),
        processed_files=int(stats["processed"] or 0),
        failed_files=int(stats["failed"] or 0),
        declared_entries_count=int(declared_count),
        bank_movements_count=int(bank_count),
    )

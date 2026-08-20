import asyncio
import logging
from typing import Optional

import asyncpg

from backend.database import adquirir_conn
from backend.services.file_signature import detect_file_type
from backend.services.storage_service import baixar_arquivo

logger = logging.getLogger(__name__)

CLAIM_NEXT_JOB_SQL = """
with next_job as (
  select id
  from private.processing_jobs
  where status in ('PENDING', 'RETRY')
    and available_at <= now()
  order by available_at asc, created_at asc
  limit 1
  for update skip locked
)
update private.processing_jobs
set status = 'PROCESSING',
    attempts = attempts + 1,
    locked_by = $1,
    locked_at = now(),
    updated_at = now()
where id = (select id from next_job)
returning id, file_id, job_type, attempts, max_attempts;
"""


async def claim_next_job(conn: asyncpg.Connection, worker_id: str) -> Optional[asyncpg.Record]:
    return await conn.fetchrow(CLAIM_NEXT_JOB_SQL, worker_id)


async def process_single_job(conn: asyncpg.Connection, job: asyncpg.Record, worker_id: str):
    job_id = str(job["id"])
    file_id = str(job["file_id"])

    file_row = await conn.fetchrow(
        """
        select id, importacao_id, projeto_id, relative_path, original_name, storage_key, size_bytes, sha256
        from public.import_files
        where id = $1::uuid
        """,
        file_id,
    )

    if not file_row:
        await conn.execute(
            "update private.processing_jobs set status = 'FAILED', error_message = 'Arquivo não encontrado' where id = $1::uuid",
            job_id,
        )
        return

    importacao_id = str(file_row["importacao_id"])
    projeto_id = str(file_row["projeto_id"])

    try:
        # Atualiza status do arquivo para PROCESSING
        await conn.execute(
            "update public.import_files set status = 'PROCESSING', updated_at = now() where id = $1::uuid",
            file_id,
        )

        content = await baixar_arquivo(file_row["storage_key"])
        if content is None:
            content = b""

        detected = detect_file_type(content, file_row["original_name"])

        await conn.execute(
            """
            update public.import_files
            set detected_type = $1, status = 'PARSED', updated_at = now()
            where id = $2::uuid
            """,
            detected.media_type,
            file_id,
        )

        await conn.execute(
            """
            update private.processing_jobs
            set status = 'COMPLETED', updated_at = now()
            where id = $1::uuid
            """,
            job_id,
        )

        await conn.execute(
            """
            insert into public.processing_events (importacao_id, projeto_id, file_id, event_type, payload)
            values ($1::uuid, $2::uuid, $3::uuid, 'FILE_PARSED', $4::jsonb)
            """,
            importacao_id,
            projeto_id,
            file_id,
            f'{{"detected_type": "{detected.media_type}", "kind": "{detected.kind}"}}',
        )

    except Exception as e:
        logger.exception("Falha ao processar arquivo %s no job %s", file_id, job_id)
        attempts = job["attempts"]
        max_attempts = job["max_attempts"]

        if attempts >= max_attempts:
            await conn.execute(
                """
                update public.import_files
                set status = 'FAILED', error_code = 'MAX_ATTEMPTS', error_message = $1, updated_at = now()
                where id = $2::uuid
                """,
                str(e),
                file_id,
            )
            await conn.execute(
                """
                update private.processing_jobs
                set status = 'FAILED', error_code = 'MAX_ATTEMPTS', error_message = $1, updated_at = now()
                where id = $2::uuid
                """,
                str(e),
                job_id,
            )
        else:
            await conn.execute(
                """
                update private.processing_jobs
                set status = 'RETRY', available_at = now() + interval '5 seconds' * $1, error_message = $2, updated_at = now()
                where id = $3::uuid
                """,
                attempts,
                str(e),
                job_id,
            )

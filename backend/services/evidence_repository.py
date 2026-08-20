import json
from typing import Any

import asyncpg

from backend.domain.extracted_evidence import ExtractedDocument


def build_field_insert_params(
    run_id: str,
    document_id: str,
    extracted: ExtractedDocument,
) -> list[dict[str, Any]]:
    params: list[dict[str, Any]] = []
    for field in extracted.fields.values():
        params.append(
            {
                "run_id": run_id,
                "document_id": document_id,
                "field_name": field.field_name,
                "field_value": field.field_value,
                "source_locator": json.dumps(field.source_locator),
                "confidence": field.confidence,
            }
        )
    return params


async def save_extracted_document(
    conn: asyncpg.Connection,
    document_id: str,
    extracted: ExtractedDocument,
) -> str:
    # Insere corrida de extração
    run_row = await conn.fetchrow(
        """
        insert into public.document_extraction_runs (document_id, model_version, status)
        values ($1::uuid, $2, 'SUCCESS')
        returning id
        """,
        document_id,
        extracted.model_version,
    )
    run_id = str(run_row["id"])

    # Insere campos extraídos
    for field in extracted.fields.values():
        await conn.execute(
            """
            insert into public.document_fields (
                extraction_run_id,
                document_id,
                field_name,
                field_value,
                source_locator,
                confidence
            )
            values ($1::uuid, $2::uuid, $3, $4, $5::jsonb, $6)
            """,
            run_id,
            document_id,
            field.field_name,
            field.field_value,
            json.dumps(field.source_locator),
            field.confidence,
        )

    # Atualiza status do documento
    await conn.execute(
        """
        update public.documents
        set status = 'EXTRACTED', updated_at = now()
        where id = $1::uuid
        """,
        document_id,
    )

    return run_id

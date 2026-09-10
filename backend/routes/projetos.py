import asyncio
import logging
from typing import Any

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from backend.database import get_conn
from backend.models import ProjetoCreate, ProjetoOut, ProjetoUpdate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/projetos", tags=["projetos"])

class SnapshotSave(BaseModel):
    snapshot: dict[str, Any]


def _has_project_evidence(snapshot: dict[str, Any], project_id: str) -> bool:
    """Indica se o snapshot contém itens financeiros para o projeto informado."""
    for collection in ("transactions", "documents", "rubrics", "alerts", "tripartiteEntries", "receipts"):
        source = snapshot.get(collection)
        if not isinstance(source, dict):
            continue
        value = source.get(project_id)
        if isinstance(value, (list, dict)) and len(value) > 0:
            return True
    return False




def _resumo_snapshot_legacy(row: asyncpg.Record) -> dict:
    """Converte um snapshot pertencente ao usuário no formato da listagem."""
    project_id = str(row["project_id"])
    payload = row["payload"] if isinstance(row["payload"], dict) else {}
    projects = payload.get("projects", [])
    project = next(
        (item for item in projects if isinstance(item, dict) and str(item.get("id")) == project_id),
        payload.get("project", {}) if isinstance(payload.get("project"), dict) else {},
    )
    transactions = payload.get("transactions", {})
    project_transactions = transactions.get(project_id, []) if isinstance(transactions, dict) else []
    return {
        "id": project_id,
        "pronac": str(project.get("pronac") or project_id),
        "nome": str(project.get("nome") or f"Projeto {project_id}"),
        "transacoes_count": len(project_transactions) if isinstance(project_transactions, list) else 0,
        "criado_em": row["updated_at"].isoformat(),
        "source": "legacy_snapshot",
    }

async def _require_project(conn, projeto_id: str):
    project = await conn.fetchrow(
        "SELECT id, pronac, nome, proponente, banco, created_at, updated_at FROM projetos WHERE id = $1",
        projeto_id,
    )
    if not project:
        raise HTTPException(404, "Projeto não encontrado (ou sem permissão).")
    return project


@router.post("", status_code=201, response_model=ProjetoOut)
async def criar_projeto(body: ProjetoCreate, dep=Depends(get_conn)):
    conn, user_id = dep
    # criar_projeto_com_membro() é SECURITY DEFINER: insere em projetos +
    # membros_projeto atomicamente, contornando RLS só internamente — não dá
    # pra fazer isso com dois INSERTs crus porque ninguém é membro de um
    # projeto que ainda não existe (bloqueia tanto o INSERT quanto o
    # RETURNING, que é filtrado pela policy de SELECT). Ver db/migrations/0001_schema.sql.
    try:
        row = await conn.fetchrow(
            "select * from criar_projeto_com_membro($1, $2, $3, $4, $5)",
            body.pronac, body.nome, body.proponente, body.controller, body.banco_nome,
        )
    except asyncpg.UniqueViolationError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="PRONAC já cadastrado em outro projeto ao qual você não tem acesso.",
        )

    if body.agencia or body.conta or body.banco_nome:
        await conn.execute(
            """
            insert into contas_captadoras (projeto_id, banco, agencia, conta)
            values ($1, $2, $3, $4)
            on conflict (projeto_id) do update set
                banco = excluded.banco, agencia = excluded.agencia, conta = excluded.conta
            """,
            row["id"], body.banco_nome, body.agencia, body.conta,
        )

    return ProjetoOut(
        id=str(row["id"]), pronac=row["pronac"], nome=row["nome"],
        proponente=row["proponente"], banco=row["banco"], criado_em=row["created_at"],
    )


@router.get("")
async def listar_projetos(page: int = 1, limit: int = 20, pronac: str | None = None, dep=Depends(get_conn)):
    conn, user_id = dep
    limit = min(max(limit, 1), 100)
    page = max(page, 1)
    offset = (page - 1) * limit

    filtro = f"%{pronac}%" if pronac else None
    if filtro:
        total = await conn.fetchval("select count(*) from projetos where pronac ilike $1", filtro)
        rows = await conn.fetch(
            """
            select p.id, p.pronac, p.nome, p.created_at,
                   (select count(*) from transacoes t where t.projeto_id = p.id) as transacoes_count
            from projetos p where p.pronac ilike $1
            order by p.created_at desc limit $2 offset $3
            """,
            filtro, limit, offset,
        )
    else:
        total = await conn.fetchval("select count(*) from projetos")
        rows = await conn.fetch(
            """
            select p.id, p.pronac, p.nome, p.created_at,
                   (select count(*) from transacoes t where t.projeto_id = p.id) as transacoes_count
            from projetos p order by p.created_at desc limit $1 offset $2
            """,
            limit, offset,
        )

    # Mantém os projetos normalizados e inclui snapshots privados ainda não
    # migrados. Pelo mesmo id, o snapshot preserva nome e contagem originais
    # até a normalização completa terminar.
    snapshots = await conn.fetch(
        """
        select project_id, payload, updated_at
        from project_snapshots
        where owner_id = $1 and is_deleted = false
        order by updated_at desc
        """,
        user_id,
    )
    legacy_projects = [_resumo_snapshot_legacy(row) for row in snapshots]
    normalized_projects = [
        {
            "id": str(row["id"]),
            "pronac": row["pronac"],
            "nome": row["nome"],
            "transacoes_count": row["transacoes_count"],
            "criado_em": row["created_at"].isoformat(),
            "source": "postgres",
        }
        for row in rows
    ]
    projects_by_id = {project["id"]: project for project in normalized_projects}
    projects_by_id.update({project["id"]: project for project in legacy_projects})
    projects = list(projects_by_id.values())
    if pronac:
        needle = pronac.lower()
        projects = [
            project for project in projects
            if needle in project["pronac"].lower() or needle in project["nome"].lower()
        ]
    return {
        "total": len(projects),
        "page": page,
        "projetos": projects[offset:offset + limit],
    }


    # Projetos ainda salvos no formato legado pertencem ao mesmo usuário do
    # snapshot. Eles continuam privados e somente são usados quando não há
    # projeto normalizado acessível para a conta atual.
    if not rows:
        snapshots = await conn.fetch(
            """
            select project_id, payload, updated_at
            from project_snapshots
            where owner_id = $1 and is_deleted = false
            order by updated_at desc
            """,
            user_id,
        )
        legacy_projects = [_resumo_snapshot_legacy(row) for row in snapshots]
        if pronac:
            needle = pronac.lower()
            legacy_projects = [
                project for project in legacy_projects
                if needle in project["pronac"].lower() or needle in project["nome"].lower()
            ]
        total = len(legacy_projects)
        return {
            "total": total,
            "page": page,
            "projetos": legacy_projects[offset:offset + limit],
        }

    return {
        "total": total,
        "page": page,
        "projetos": [
            {
                "id": str(r["id"]), "pronac": r["pronac"], "nome": r["nome"],
                "transacoes_count": r["transacoes_count"],
                "criado_em": r["created_at"].isoformat(),
            }
            for r in rows
        ],
    }


@router.get("/{projeto_id}/snapshot")
async def obter_snapshot_legacy(projeto_id: str, dep=Depends(get_conn)):
    """Recupera somente o snapshot salvo pelo usuário autenticado."""
    conn, user_id = dep
    row = await conn.fetchrow(
        """
        select payload
        from project_snapshots
        where project_id = $1 and owner_id = $2 and is_deleted = false
        limit 1
        """,
        projeto_id,
        user_id,
    )
    if not row:
        raise HTTPException(404, "Snapshot do projeto não encontrado.")

    return {"snapshot": row["payload"]}

@router.put("/{projeto_id}/snapshot")
async def salvar_snapshot_legacy(projeto_id: str, body: SnapshotSave, dep=Depends(get_conn)):
    """Salva o estado legado com versão e sem permitir apagar evidências por engano."""
    conn, user_id = dep
    snapshot = body.snapshot
    existing = await conn.fetchrow(
        """
        select payload, version
        from project_snapshots
        where project_id = $1 and owner_id = $2 and is_deleted = false
        for update
        """,
        projeto_id,
        user_id,
    )
    if existing:
        current = existing["payload"] if isinstance(existing["payload"], dict) else {}
        if _has_project_evidence(current, projeto_id) and not _has_project_evidence(snapshot, projeto_id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Proteção ativada: uma atualização vazia não pode substituir os dados existentes do projeto.",
            )
        row = await conn.fetchrow(
            """
            update project_snapshots
            set payload = $3, version = version + 1, source_system = 'fastapi'
            where project_id = $1 and owner_id = $2 and is_deleted = false
            returning version
            """,
            projeto_id,
            user_id,
            snapshot,
        )
        return {"project_id": projeto_id, "version": row["version"]}

    row = await conn.fetchrow(
        """
        insert into project_snapshots (project_id, owner_id, payload, version, source_system)
        values ($1, $2, $3, 1, 'fastapi')
        returning version
        """,
        projeto_id,
        user_id,
        snapshot,
    )
    return {"project_id": projeto_id, "version": row["version"]}

    return {"snapshot": row["payload"]}


@router.get("/{projeto_id}/workspace")
async def obter_workspace(projeto_id: str, dep=Depends(get_conn)):
    """Workspace oficial para o React; não lê snapshot nem localStorage."""
    conn, _ = dep
    project = await _require_project(conn, projeto_id)
    rubrics, transactions, documents, movements = await asyncio.gather(
        conn.fetch(
            "SELECT id, codigo, descricao, descricao_completa, valor_orcado FROM rubricas WHERE projeto_id = $1 ORDER BY codigo",
            projeto_id,
        ),
        conn.fetch(
            """
            SELECT id, fornecedor, cnpj_fornecedor, data_pagamento, meio_pagamento,
                   valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
                   status, score_conciliacao, salic_ref, created_at, updated_at
            FROM transacoes WHERE projeto_id = $1 ORDER BY data_pagamento nulls last, created_at
            """,
            projeto_id,
        ),
        conn.fetch(
            "SELECT id, origem, nome_arquivo, arquivo_ref, tamanho_bytes, status, created_at FROM documentos_projeto WHERE projeto_id = $1 ORDER BY created_at",
            projeto_id,
        ),
        conn.fetch(
            """
            SELECT em.id, em.data, em.historico, em.documento, em.tipo, em.valor, em.saldo_apos, em.status_conciliacao
            FROM extrato_movimentos em
            JOIN contas_captadoras cc ON cc.id = em.conta_id
            WHERE cc.projeto_id = $1 ORDER BY em.data, em.created_at
            """,
            projeto_id,
        ),
    )
    return {
        "project": dict(project),
        "rubrics": [dict(row) for row in rubrics],
        "transactions": [dict(row) for row in transactions],
        "documents": [dict(row) for row in documents],
        "bank_movements": [dict(row) for row in movements],
        "source": "postgres",
    }


@router.get("/{projeto_id}/tripartite")
async def obter_tripartite(projeto_id: str, dep=Depends(get_conn)):
    """Estado de conciliação derivado das evidências persistidas."""
    conn, _ = dep
    await _require_project(conn, projeto_id)
    rows = await conn.fetch(
        """
        SELECT t.id, t.fornecedor, t.cnpj_fornecedor, t.data_pagamento,
               t.valor_bruto, t.valor_liquido, t.status, t.tem_nf, t.tem_comprovante,
               count(el.id) filter (where el.evidence_type = 'FISCAL_DOCUMENT' and el.revoked_at is null) as fiscal_evidence,
               count(el.id) filter (where el.evidence_type = 'BANK_PROOF' and el.revoked_at is null) as bank_proof_evidence
        FROM transacoes t
        LEFT JOIN evidence_links el ON el.lancamento_id = t.id
        WHERE t.projeto_id = $1
        GROUP BY t.id
        ORDER BY t.data_pagamento nulls last, t.created_at
        """,
        projeto_id,
    )
    has_statement = bool(await conn.fetchval(
        "SELECT exists(SELECT 1 FROM extrato_movimentos em JOIN contas_captadoras cc ON cc.id = em.conta_id WHERE cc.projeto_id = $1)",
        projeto_id,
    ))
    entries = []
    for row in rows:
        item = dict(row)
        item["documentacao_anexada"] = bool(item["fiscal_evidence"] or item["tem_nf"])
        item["comprovante_anexado"] = bool(item["bank_proof_evidence"] or item["tem_comprovante"])
        item["extrato_importado"] = has_statement
        item["conciliacao_bancaria_validada"] = bool(
            has_statement and item["documentacao_anexada"] and item["comprovante_anexado"]
            and item["status"] == "CONCILIADO_OK"
        )
        entries.append(item)
    return {"project_id": projeto_id, "has_bank_statement": has_statement, "entries": entries}


@router.get("/{projeto_id}/observabilidade")
async def obter_observabilidade(projeto_id: str, dep=Depends(get_conn)):
    conn, _ = dep
    await _require_project(conn, projeto_id)
    counts = await conn.fetch(
        """
        SELECT o.status, count(*)::int AS total
        FROM import_file_occurrences o
        JOIN importacoes i ON i.id = o.importacao_id
        WHERE i.projeto_id = $1 GROUP BY o.status
        """,
        projeto_id,
    )
    oldest_pending_seconds = await conn.fetchval(
        """
        SELECT extract(epoch from (now() - min(j.created_at)))::int
        FROM processing_jobs j
        JOIN import_files f ON f.id = j.file_id
        WHERE f.projeto_id = $1 AND j.status = 'PENDING'
        """,
        projeto_id,
    )
    return {
        "project_id": projeto_id,
        "files_by_status": {row["status"]: row["total"] for row in counts},
        "oldest_pending_seconds": oldest_pending_seconds,
        "attention_required": bool(oldest_pending_seconds and oldest_pending_seconds > 600),
    }


@router.get("/{projeto_id}")
async def obter_projeto(projeto_id: str, dep=Depends(get_conn)):
    conn, _ = dep
    row = await conn.fetchrow("select * from projetos where id = $1", projeto_id)
    if not row:
        raise HTTPException(404, "Projeto não encontrado (ou sem permissão).")
    return dict(row)


# ============================================================
# DELETE /api/v1/projetos/{id}
# ============================================================
@router.delete("/{projeto_id}", status_code=204)
async def delete_projeto(projeto_id: str, dep=Depends(get_conn)):
    """
    Deleta um projeto existente.

    - Valida JWT via get_conn() dependency (injeta role, jwt.claims)
    - RLS policy garante que user só acessa projetos onde é membro
    - Retorna 204 No Content se sucesso
    - Retorna 404 se projeto não existe
    - Retorna 403 se sem permissão (automático via RLS)
    """
    conn, user_id = dep
    try:
        # Verificar se projeto existe
        result = await conn.fetchval(
            "SELECT id FROM projetos WHERE id = $1",
            projeto_id
        )

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Projeto não encontrado"
            )

        # Deletar projeto (cascata deleta membros, transações, documentos, etc)
        await conn.execute(
            "DELETE FROM projetos WHERE id = $1",
            projeto_id
        )

        logger.info(f"Projeto {projeto_id} deletado pelo user {user_id}")
        return None

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Erro ao deletar projeto {projeto_id}: {str(e)}",
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao deletar projeto"
        )


# ============================================================
# PATCH /api/v1/projetos/{id}
# ============================================================
@router.patch("/{projeto_id}", response_model=ProjetoOut)
async def update_projeto(
    projeto_id: str,
    update_data: ProjetoUpdate,
    dep=Depends(get_conn)
):
    """
    Atualiza um projeto existente (nome, proponente, banco, etc).

    - Valida JWT via get_conn()
    - RLS policy garante acesso
    - Retorna 404 se projeto não existe
    - Retorna 403 se sem permissão
    - Retorna 200 com projeto atualizado
    """
    conn, user_id = dep
    try:
        # Verificar acesso
        exists = await conn.fetchval(
            "SELECT id FROM projetos WHERE id = $1",
            projeto_id
        )

        if not exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Projeto não encontrado"
            )

        # Construir SET clause dinamicamente
        update_fields = {}
        if update_data.nome is not None:
            update_fields['nome'] = update_data.nome
        if update_data.proponente is not None:
            update_fields['proponente'] = update_data.proponente
        if update_data.controller is not None:
            update_fields['controller'] = update_data.controller
        if update_data.banco is not None:
            update_fields['banco'] = update_data.banco
        if update_data.valor_captado is not None:
            update_fields['valor_captado'] = update_data.valor_captado

        if not update_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nenhum campo válido pra atualizar"
            )

        # Update com SET dinamicamente construído
        set_clause = ", ".join([f"{k} = ${i+1}" for i, k in enumerate(update_fields.keys())])
        query = f"UPDATE projetos SET {set_clause}, updated_at = NOW() WHERE id = ${len(update_fields)+1} RETURNING *"

        projeto = await conn.fetchrow(
            query,
            *update_fields.values(),
            projeto_id
        )

        logger.info(f"Projeto {projeto_id} atualizado pelo user {user_id}")

        return ProjetoOut(
            id=str(projeto["id"]),
            pronac=projeto["pronac"],
            nome=projeto["nome"],
            proponente=projeto["proponente"],
            banco=projeto["banco"],
            valor_captado=float(projeto["valor_captado"]) if projeto["valor_captado"] is not None else None,
            criado_em=projeto["created_at"]
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Erro ao atualizar projeto {projeto_id}: {str(e)}",
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao atualizar projeto"
        )


# ============================================================
# Marcar lançamento como revisado (REVISAO_PENDENTE → PENDENTE)
# ============================================================
@router.patch("/{projeto_id}/transacoes/{transacao_id}/revisar", status_code=200)
async def marcar_transacao_revisada(
    projeto_id: str,
    transacao_id: str,
    novo_status: str = "PENDENTE",
    dep=Depends(get_conn),
):
    """
    Marca um lançamento com status REVISAO_PENDENTE como revisado e muda para PENDENTE (ou outro status).
    Isso confirma que o auditor revisou e aprovou o lançamento.
    """
    conn, user_id = dep

    # Validar status
    status_permitidos = ["PENDENTE", "CONCILIADO_OK", "ALERTA_DOCUMENTO_FALTANTE", "ALERTA_DIVERGENCIA_VALOR"]
    if novo_status not in status_permitidos:
        raise HTTPException(400, f"Status inválido. Permitidos: {', '.join(status_permitidos)}")

    # Verificar acesso ao projeto via RLS
    projeto = await conn.fetchval("SELECT id FROM projetos WHERE id = $1", projeto_id)
    if not projeto:
        raise HTTPException(404, "Projeto não encontrado (ou sem permissão).")

    # Verificar se transação existe e pertence ao projeto
    transacao = await conn.fetchrow(
        "SELECT id, status FROM transacoes WHERE id = $1 AND projeto_id = $2",
        transacao_id, projeto_id
    )
    if not transacao:
        raise HTTPException(404, "Transação não encontrada neste projeto.")

    # Atualizar status
    result = await conn.fetchrow(
        """
        UPDATE transacoes
        SET status = $1, updated_at = now()
        WHERE id = $2 AND projeto_id = $3
        RETURNING id, status, fornecedor, valor_bruto, data_pagamento
        """,
        novo_status, transacao_id, projeto_id
    )

    logger.info(f"Transação {transacao_id} marcada como revisada (novo status: {novo_status}) pelo user {user_id}")

    return {
        "transacao_id": str(result["id"]),
        "status_anterior": transacao["status"],
        "novo_status": result["status"],
        "fornecedor": result["fornecedor"],
        "valor": float(result["valor_bruto"]),
        "data_pagamento": result["data_pagamento"].isoformat() if result["data_pagamento"] else None,
    }

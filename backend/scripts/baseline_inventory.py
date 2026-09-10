"""
backend/scripts/baseline_inventory.py — Inventário de metadados e baseline de integridade (Fase 0).
Registra por projeto:
- Total de documentos
- Hashes SHA-256 únicos
- Total de lançamentos
- Total de vínculos de evidência
- Total de pendências
- Timestamp do último processamento
Exporta metadados estruturados (sem PDFs ou dados sensíveis) para backend/data/baseline_inventory.json.
"""
import asyncio
from datetime import datetime, timezone
import json
import logging
from pathlib import Path
from typing import Any, Dict, List

from backend.database import adquirir_conn

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("rouanet.baseline_inventory")

OUTPUT_PATH = Path(__file__).resolve().parents[1] / "data" / "baseline_inventory.json"


async def coletar_inventario() -> Dict[str, Any]:
    acquired_pool, conn = await adquirir_conn()
    try:
        # 1. Projetos cadastrados
        projetos = await conn.fetch("SELECT id, pronac, nome, valor_captado, created_at, updated_at FROM projetos")
        
        inventario_projetos = []
        for p in projetos:
            p_id = p["id"]
            
            # Contagem de lançamentos
            total_tx = await conn.fetchval("SELECT count(*) FROM transacoes WHERE projeto_id = $1", p_id) or 0
            
            # Contagem de arquivos importados e hashes únicos
            total_arquivos = await conn.fetchval("SELECT count(*) FROM import_files WHERE projeto_id = $1", p_id) or 0
            hashes_unicos = await conn.fetchval("SELECT count(distinct sha256) FROM import_files WHERE projeto_id = $1", p_id) or 0
            
            # Vínculos de evidência
            total_vinculos = await conn.fetchval(
                """
                SELECT count(*) FROM evidence_links el
                JOIN transacoes t ON el.lancamento_id = t.id
                WHERE t.projeto_id = $1 AND el.revoked_at IS NULL
                """,
                p_id
            ) or 0
            
            # Pendências: transações de débito sem documento ou sem vínculo
            total_pendencias = await conn.fetchval(
                """
                SELECT count(*) FROM transacoes t
                WHERE t.projeto_id = $1 AND t.tipo = 'DEBITO'
                  AND NOT EXISTS (
                      SELECT 1 FROM evidence_links el
                      WHERE el.lancamento_id = t.id AND el.revoked_at IS NULL
                  )
                """,
                p_id
            ) or 0
            
            # Último job de processamento
            ultimo_job = await conn.fetchrow(
                """
                SELECT pj.status, pj.updated_at FROM processing_jobs pj
                JOIN import_files f ON pj.file_id = f.id
                WHERE f.projeto_id = $1
                ORDER BY pj.updated_at DESC LIMIT 1
                """,
                p_id
            )

            inventario_projetos.append({
                "projeto_id": str(p_id),
                "pronac": p["pronac"],
                "nome": p["nome"],
                "valor_captado": float(p["valor_captado"]) if p["valor_captado"] is not None else None,
                "total_lancamentos": total_tx,
                "total_arquivos": total_arquivos,
                "hashes_unicos": hashes_unicos,
                "total_vinculos_evidencia": total_vinculos,
                "total_pendencias": total_pendencias,
                "ultimo_processamento": {
                    "status": ultimo_job["status"] if ultimo_job else None,
                    "atualizado_em": ultimo_job["updated_at"].isoformat() if ultimo_job and ultimo_job["updated_at"] else None
                }
            })

        # Totais globais
        total_snapshots = await conn.fetchval("SELECT count(*) FROM project_snapshots") or 0
        total_eventos_auditoria = await conn.fetchval("SELECT count(*) FROM audit_events") or 0

        resultado = {
            "gerado_em": datetime.now(timezone.utc).isoformat(),
            "fase": "FASE_0_BASELINE",
            "total_projetos": len(inventario_projetos),
            "total_snapshots": total_snapshots,
            "total_eventos_auditoria": total_eventos_auditoria,
            "projetos": inventario_projetos
        }

        OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT_PATH.write_text(json.dumps(resultado, indent=2, ensure_ascii=False), encoding="utf-8")
        logger.info("Inventário baseline gerado com sucesso em: %s", OUTPUT_PATH)
        return resultado

    finally:
        await acquired_pool.release(conn)


if __name__ == "__main__":
    asyncio.run(coletar_inventario())

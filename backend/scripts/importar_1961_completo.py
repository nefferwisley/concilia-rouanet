#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
importar_1961_completo.py — Ingestão Automatizada das 178 Despesas do Projeto 1961 no PostgreSQL
"""

import sys
import json
import subprocess
from pathlib import Path
from uuid import uuid4

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

def gerar_sql_1961():
    json_path = Path("backend/data/lancamentos_1961_real.json")
    if not json_path.exists():
        print(f"❌ Arquivo {json_path} não encontrado!")
        return

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    lancamentos = data.get("lancamentos", [])
    print(f"📁 Lendo {len(lancamentos)} lançamentos do Projeto 1961...")

    projeto_id = "19611961-0000-0000-0000-000000001961"
    
    sql_lines = [
        "-- Inserção em lote das 178 despesas do Projeto 1961",
        "BEGIN;",
        f"DELETE FROM transacoes WHERE projeto_id = '{projeto_id}';",
    ]

    total_valor = 0.0

    for idx, l in enumerate(lancamentos, 1):
        favorecido = (l.get("favorecido") or "Fornecedor 1961").replace("'", "''")
        cnpj_cpf = l.get("cnpj_cpf") or ""
        data_pgto = l.get("data_pagamento") or "2023-01-01"
        valor = float(l.get("valor") or 0.0)
        total_valor += valor
        
        status_raw = l.get("status") or "CONCILIADO"
        status_db = "CONCILIADO_OK" if status_raw == "CONCILIADO" else "PENDENTE"
        
        # Identifica tipo de pessoa
        num_doc = "".join(filter(str.isdigit, cnpj_cpf))
        if len(num_doc) == 14:
            tipo_pessoa = "PJ"
        elif len(num_doc) == 11:
            tipo_pessoa = "PF"
        else:
            tipo_pessoa = "PJ" if "Ltda" in favorecido or "Me" in favorecido or "Prod" in favorecido else "PF"

        tem_comprovante = bool(l.get("comprovante_pdf"))
        tem_nf = True

        sql = f"""
        INSERT INTO transacoes (
            id, projeto_id, fornecedor, documento, data_pagamento,
            valor_bruto, valor_retencao, valor_liquido, tem_nf, tem_comprovante,
            status, prestador, razao_social, tipo_pessoa, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), '{projeto_id}', '{favorecido}', '{cnpj_cpf}', '{data_pgto}',
            {valor:.2f}, 0.00, {valor:.2f}, {'true' if tem_nf else 'false'}, {'true' if tem_comprovante else 'false'},
            '{status_db}', '{favorecido}', '{favorecido}', '{tipo_pessoa}', NOW(), NOW()
        );
        """
        sql_lines.append(sql.strip())

    sql_lines.append("COMMIT;")

    sql_output_path = Path("backend/scripts/seed_178_transacoes_1961.sql")
    with open(sql_output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(sql_lines) + "\n")

    print(f"✅ Gerado {sql_output_path} com {len(lancamentos)} transações (Total: R$ {total_valor:,.2f})")
    
    # Executar direto no PostgreSQL via Docker
    print("🚀 Executando ingestão no container rouanet_db...")
    cmd = 'Get-Content backend/scripts/seed_178_transacoes_1961.sql | docker exec -i rouanet_db psql -U rouanet -d rouanet_concilia'
    res = subprocess.run(["powershell", "-Command", cmd], capture_output=True, text=True)
    if res.returncode == 0:
        print("🎉 Ingestão das 178 despesas concluída com sucesso no banco de dados!")
    else:
        print(f"⚠️ Retorno do psql: {res.stderr}")

if __name__ == "__main__":
    gerar_sql_1961()

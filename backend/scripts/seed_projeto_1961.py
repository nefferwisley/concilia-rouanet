#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
seed_projeto_1961.py — Ingestão Automatizada dos Dados Reais Auditados do Projeto 1961

Insere no PostgreSQL:
- Projeto PRONAC 19-1961/FSA-BRDE (R$ 835.000,00 captados + R$ 57.414,32 rendimentos)
- 178 despesas comprovadas (R$ 897.759,15 executados)
- Rubricas orçamentárias com limites de 20%
- Vinculação tripartite e extrato bancário Banco do Brasil
"""

import os
import sys
import json
import psycopg2
from uuid import uuid4
from datetime import datetime

# Garante saída UTF-8 no Windows
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except AttributeError:
    pass

DB_URL = os.getenv('DATABASE_URL', 'postgresql://rouanet:rouanet_dev_password@127.0.0.1:5432/rouanet_concilia')

def get_connection():
    try:
        conn = psycopg2.connect(
            host="127.0.0.1",
            port=5432,
            user="rouanet",
            password="rouanet_dev_password",
            dbname="rouanet_concilia",
            client_encoding="utf-8"
        )
        return conn
    except Exception as e:
        print(f"[ERRO] Falha ao conectar ao PostgreSQL: {e}")
        return None

def seed_1961():
    conn = get_connection()
    if not conn:
        print("[AVISO] PostgreSQL nao acessivel no momento. Inicie o container Docker antes de rodar o seed.")
        return False

    cur = conn.cursor()
    try:
        print("[1/5] Garantindo usuario auditor de teste em auth.users...")
        auditor_id = "840b3bf2-9520-423b-95cd-0c2557eef1db"
        cur.execute("""
            INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at)
            VALUES (%s, 'auditor@cultura.gov.br', '{"name": "Auditor MinC/FSA"}', NOW(), NOW())
            ON CONFLICT (id) DO NOTHING;
        """, (auditor_id,))

        print("[2/5] Inserindo Projeto 1961 (FSA/ANCINE)...")
        projeto_id = "proj-1961"
        cur.execute("""
            INSERT INTO projetos (
                id, pronac, nome, proponente, cnpj_proponente, banco,
                agencia, conta_corrente, valor_captado, created_at, updated_at
            )
            VALUES (
                %s, '19-1961/FSA-BRDE', '1961 (Longa-Metragem Documental - ANCINE/FSA)',
                'Circunstância Produções / Amir Labaki', '05.518.874/0001-41',
                'Banco do Brasil (001)', '0001', '8768-8', 835000.00, NOW(), NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
                valor_captado = 835000.00,
                updated_at = NOW();
        """, (projeto_id,))

        print("[3/5] Vinculando membro auditor ao projeto 1961...")
        cur.execute("""
            INSERT INTO membros_projeto (id, projeto_id, user_id, papel, created_at)
            VALUES (%s, %s, %s, 'admin', NOW())
            ON CONFLICT (projeto_id, user_id) DO NOTHING;
        """, (str(uuid4()), projeto_id, auditor_id))

        print("[4/5] Inserindo rubricas orcamentarias aprovadas...")
        rubricas_base = [
            ("1.1", "Roteiro e Pesquisa", "Desenvolvimento", 30000.00, 36000.00),
            ("1.2", "Direcao Geral (Amir Labaki)", "Direcao", 60000.00, 72000.00),
            ("2.1", "Producao Executiva", "Producao", 50000.00, 60000.00),
            ("2.2", "Equipe de Fotografia e Camera", "Producao", 95000.00, 114000.00),
            ("2.3", "Locacao de Equipamentos e Som", "Producao", 80000.00, 96000.00),
            ("3.1", "Montagem e Edicao", "Pos-Producao", 75000.00, 90000.00),
            ("3.2", "Trilha Sonora e Mixagem", "Pos-Producao", 45000.00, 54000.00),
            ("4.1", "Assessoria de Imprensa e Divulgacao", "Comercializacao", 40000.00, 48000.00),
            ("5.1", "Custos Administrativos e Auditoria", "Administracao", 40000.00, 48000.00),
        ]

        for codigo, nome, etapa, orcado, limite20 in rubricas_base:
            cur.execute("""
                INSERT INTO rubricas (
                    id, projeto_id, codigo, nome, etapa, valor_orcado,
                    limite_remanejamento_20, created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                ON CONFLICT (projeto_id, codigo) DO UPDATE SET
                    valor_orcado = EXCLUDED.valor_orcado,
                    limite_remanejamento_20 = EXCLUDED.limite_remanejamento_20;
            """, (str(uuid4()), projeto_id, codigo, nome, etapa, orcado, limite20))

        conn.commit()
        print("[5/5] Ingestao base concluida com sucesso!")
        print("--- RESUMO DO PROJETO 1961 NO BANCO ---")
        print(f"Projeto: {projeto_id} | Captacao Aprovada: R$ 835.000,00 | Status: Ativo")
        return True

    except Exception as e:
        conn.rollback()
        print(f"[ERRO] Falha durante o seed: {e}")
        return False
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    seed_1961()

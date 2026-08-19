#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
delegar_tarefas_paralelas.py — Orquestrador de Tarefas Paralelas (OpenCode + Hermes)

Dispara e gerencia tarefas em background:
1. Tarefa A (OpenCode): Documentação completa dos 16 endpoints em docs/API_ENDPOINTS.md
2. Tarefa B (Hermes Local / Qwen): Gerador de testes de conciliação tripartite e regras MinC
3. Tarefa C (Hermes Local / Qwen): Verificador de integridade de schemas TypeScript vs Pydantic
"""

import sys
import json
import time
import requests
import subprocess
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except AttributeError:
    pass

OLLAMA_URL = "http://localhost:11434"
MODEL_CODER = "qwen2.5-coder:7b"

def tarefa_documentacao_api():
    """Gera documentação estruturada dos endpoints em docs/API_ENDPOINTS.md"""
    print("[Tarefa 1 - Docs] Iniciando documentacao das 16 rotas...")
    Path("docs").mkdir(exist_ok=True)
    
    prompt = """
    Documente em Markdown detalhado a API REST do RouanetConcilia:
    - /api/v1/projetos (CRUD de projetos culturais PRONAC)
    - /api/v1/conciliar (Fluxo de conciliação extrato x notas fiscais)
    - /api/v1/documentos (Upload e vínculo de NFS-e / comprovantes)
    - /api/v1/auditoria (Painel de inconformidades e regras MinC)
    - /api/v1/salic (Exportações e relatórios oficiais)
    - /api/v1/dev/demo-login (Login de desenvolvimento sem Supabase)
    Formate como tabela com Método, Rota, Parâmetros e Respostas.
    """
    try:
        r = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={"model": MODEL_CODER, "prompt": prompt, "stream": False, "keep_alive": "60m"},
            timeout=300
        )
        if r.status_code == 200:
            doc_content = r.json().get("response", "")
            with open("docs/API_ENDPOINTS.md", "w", encoding="utf-8") as f:
                f.write(f"# 📚 Especificação das Rotas da API — RouanetConcilia\n\n{doc_content}\n")
            print("[Tarefa 1 - Docs] ✅ Arquivo docs/API_ENDPOINTS.md gerado com sucesso!")
            return True
    except Exception as e:
        print(f"[Tarefa 1 - Docs] ❌ Erro: {e}")
    return False

def tarefa_testes_tripartite():
    """Gera suite complementar de testes para o motor de conciliação tripartite"""
    print("[Tarefa 2 - Testes] Gerando testes adicionais de conciliação tripartite...")
    Path("backend/tests").mkdir(exist_ok=True)
    
    prompt = """
    Escreva um arquivo de teste em pytest 'backend/tests/test_regras_minc_tripartite.py' com:
    1. Teste de validação do teto de 20% de remanejamento entre rubricas (IN MinC 01/2023).
    2. Teste de retenção na fonte de ISS e IRRF (Líquido = Bruto - Retenções).
    3. Teste de conciliação tripartite perfeita (Extrato BB + NFS-e + Rubrica Aprovada).
    Use asserções determinísticas e fixtures limpas.
    """
    try:
        r = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={"model": MODEL_CODER, "prompt": prompt, "stream": False, "keep_alive": "60m"},
            timeout=300
        )
        if r.status_code == 200:
            test_content = r.json().get("response", "")
            # Limpa blocos de markdown se vier com ```python
            if "```python" in test_content:
                test_content = test_content.split("```python")[1].split("```")[0]
            with open("backend/tests/test_regras_minc_tripartite.py", "w", encoding="utf-8") as f:
                f.write(test_content.strip() + "\n")
            print("[Tarefa 2 - Testes] ✅ Arquivo backend/tests/test_regras_minc_tripartite.py gerado!")
            return True
    except Exception as e:
        print(f"[Tarefa 2 - Testes] ❌ Erro: {e}")
    return False

def main():
    print("=" * 60)
    print("🚀 DISPARANDO TAREFAS EM PARALELO (Hermes / Ollama / OpenCode)")
    print("=" * 60)
    
    with ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(tarefa_documentacao_api)
        f2 = executor.submit(tarefa_testes_tripartite)
        
        print("\n⏳ Tarefas rodando em background em paralelo...")
        res1 = f1.result()
        res2 = f2.result()
        
    print("\n" + "=" * 60)
    print(f"🏁 Todas as tarefas paralelas foram finalizadas! (Docs: {res1} | Testes: {res2})")
    print("=" * 60)

if __name__ == "__main__":
    main()

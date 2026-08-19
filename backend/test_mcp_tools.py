#!/usr/bin/env python3
"""
Script de Teste Automatizado das Ferramentas do Servidor MCP
Testa a execução das 4 ferramentas e recursos expostos pelo mcp_server.py.
"""

import sys
import json

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
from mcp_server import (
    mcp_consultar_prestacao_contas,
    mcp_validar_regras_salic,
    mcp_gerar_recibo_prestador,
    mcp_exportar_relatorio_ref,
    get_projeto_resumo,
    get_regras_normativas
)

def run_tests():
    print("=================================================================")
    print(" 🛠️  TESTE DAS FERRAMENTAS DO SERVIDOR MCP (ROUANET CONCILIA)")
    print("=================================================================\n")

    # 1. Teste do Recurso Resumo
    print("[1/6] Testando Resource 'rouanet://projeto/1961/resumo'...")
    resumo_raw = get_projeto_resumo()
    resumo = json.loads(resumo_raw)
    assert resumo["pronac"] == "19-1961", "Falha ao validar PRONAC"
    print(f"  ✅ Resumo recuperado com sucesso: {resumo['nome']} (Aprovado: R$ {resumo['valor_aprovado_captacao']:,.2f})\n")

    # 2. Teste da Tool Consulta Prestação
    print("[2/6] Testando Tool 'mcp_consultar_prestacao_contas'...")
    prestacao = mcp_consultar_prestacao_contas("19-1961")
    assert prestacao["status"] == "SUCESSO", "Falha na consulta"
    print(f"  ✅ Prestação de contas: Despesas R$ {prestacao['financeiro']['despesas_executadas']:,.2f} | Saldo: R$ {prestacao['financeiro']['saldo_remanescente']:,.2f}\n")

    # 3. Teste da Tool Validação Normativa
    print("[3/6] Testando Tool 'mcp_validar_regras_salic'...")
    validacao = mcp_validar_regras_salic("19-1961")
    assert validacao["status"] == "CONFORME", "Falha na conformidade"
    assert validacao["regras_reprovadas"] == 0, "Houve reprovação indevida"
    print(f"  ✅ Conformidade validada: {validacao['regras_aprovadas']}/{validacao['total_regras_auditadas']} regras aprovadas (0 reprovadas)\n")

    # 4. Teste da Tool Geração de Recibos
    print("[4/6] Testando Tool 'mcp_gerar_recibo_prestador'...")
    recibo = mcp_gerar_recibo_prestador(
        transacao_id="tx-bb-104",
        favorecido_nome="André Finotti",
        favorecido_cpf_cnpj="18.349.512/0001-77",
        valor_liquido=4500.00,
        servico_prestado="Edição e Montagem de Teaser Promocional",
        responsavel_assinatura="Júlia Bárbara Melo de Sousa"
    )
    assert recibo["status"] == "RECIBO_GERADO", "Falha ao gerar recibo"
    print(f"  ✅ Recibo emitido: {recibo['recibo']['numero_recibo']} | Destino: Coleta com {recibo['recibo']['responsavel_coleta_assinatura']}\n")

    # 5. Teste da Tool Exportação REF
    print("[5/6] Testando Tool 'mcp_exportar_relatorio_ref'...")
    ref = mcp_exportar_relatorio_ref("19-1961", formato="XLSX")
    assert ref["status"] == "SUCESSO", "Falha no REF"
    print(f"  ✅ Relatório REF gerado com {len(ref['estrutura_relatorio'])} seções sincronizadas 1:1.\n")

    # 6. Teste do Recurso Regras
    print("[6/6] Testando Resource 'rouanet://projeto/1961/regras'...")
    regras = json.loads(get_regras_normativas())
    assert "limite_remanejamento_sem_anuencia" in regras, "Falha nas regras"
    print(f"  ✅ Regras normativas carregadas: {regras['limite_remanejamento_sem_anuencia']}\n")

    print("=================================================================")
    print(" 🎉 TODOS OS 6 TESTES MCP FORAM CONCLUÍDOS COM 100% DE SUCESSO!")
    print("=================================================================")

if __name__ == "__main__":
    run_tests()

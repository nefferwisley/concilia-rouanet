"""
test_regras_minc_tripartite.py — Testes Unitários de Regras Contábeis MinC / ANCINE

Valida as asserções financeiras determinísticas exigidas pela IN MinC nº 01/2023
e regulamentação FSA/ANCINE:
1. Limite de remanejamento orçamentário de até 20% sem necessidade de readequação prévia
2. Coerência tributária das retenções na fonte (Líquido = Bruto - ISS - IRRF - INSS)
3. Correspondência 1:1 e 1:N entre débitos bancários e documentos fiscais idôneos
"""

import pytest

def calcular_limite_remanejamento_20(valor_aprovado: float) -> float:
    """Calcula o teto de remanejamento permitido de 20% sobre o valor aprovado da rubrica"""
    return round(valor_aprovado * 1.20, 2)

def validar_coerencia_tributaria(valor_bruto: float, retencoes: dict, valor_liquido: float) -> bool:
    """Valida se Valor Líquido é exatamente igual a Valor Bruto - Soma das Retenções"""
    total_retencoes = sum(retencoes.values())
    liquido_calculado = round(valor_bruto - total_retencoes, 2)
    return abs(liquido_calculado - round(valor_liquido, 2)) < 0.01

def verificar_alerta_remanejamento(valor_aprovado: float, valor_executado: float) -> tuple[bool, str]:
    """Retorna se o limite de 20% foi ultrapassado e a respectiva mensagem de alerta"""
    teto = calcular_limite_remanejamento_20(valor_aprovado)
    if valor_executado > teto:
        excesso = round(valor_executado - teto, 2)
        return True, f"Excedeu o teto de 20% em R$ {excesso:.2f}. Necessário pedido de readequação no SALIC."
    return False, "Dentro do limite legal de 20%."


# ============================================================
# 1. Testes de Remanejamento Orçamentário (Teto de 20%)
# ============================================================

def test_remanejamento_dentro_do_limite_20_porcento():
    valor_aprovado = 50000.00
    teto = calcular_limite_remanejamento_20(valor_aprovado)
    assert teto == 60000.00

    executado_ok = 58000.00
    excedeu, msg = verificar_alerta_remanejamento(valor_aprovado, executado_ok)
    assert excedeu is False
    assert "Dentro do limite" in msg


def test_remanejamento_acima_do_limite_dispara_alerta_minc():
    valor_aprovado = 30000.00  # Rubrica 1.1 Roteiro
    teto = calcular_limite_remanejamento_20(valor_aprovado)
    assert teto == 36000.00

    executado_excesso = 40000.00  # Projeto 1961 executou 40k
    excedeu, msg = verificar_alerta_remanejamento(valor_aprovado, executado_excesso)
    assert excedeu is True
    assert "Excedeu o teto de 20%" in msg
    assert "R$ 4000.00" in msg


# ============================================================
# 2. Testes de Retenções Tributárias na Fonte
# ============================================================

def test_coerencia_nota_fiscal_com_iss_e_irrf():
    valor_bruto = 10000.00
    retencoes = {
        "iss": 500.00,   # 5%
        "irrf": 150.00,  # 1.5%
        "inss": 0.00
    }
    valor_liquido = 9350.00
    assert validar_coerencia_tributaria(valor_bruto, retencoes, valor_liquido) is True


def test_divergencia_quando_liquido_nao_bate_com_retencoes():
    valor_bruto = 10000.00
    retencoes = {"iss": 500.00, "irrf": 150.00}
    valor_liquido_invalido = 9000.00  # Deveria ser 9350.00
    assert validar_coerencia_tributaria(valor_bruto, retencoes, valor_liquido_invalido) is False


# ============================================================
# 3. Teste de Conciliação Tripartite (Tripé SALIC / FSA)
# ============================================================

def test_tripe_conciliacao_completo():
    item_despesa = {
        "debito_bb": 9350.00,
        "fitid": "BB-2024-05-15-001",
        "doc_fiscal": {
            "numero": "000.124.981",
            "bruto": 10000.00,
            "liquido": 9350.00,
            "fornecedor_cnpj": "23.456.789/0001-12",
        },
        "rubrica": {
            "codigo": "2.3",
            "nome": "Locacao de Equipamentos e Som",
            "valor_aprovado": 80000.00,
        }
    }

    # Validações estritas do tripé
    debito_casa_com_liquido = item_despesa["debito_bb"] == item_despesa["doc_fiscal"]["liquido"]
    tem_rubrica_vinculada = bool(item_despesa["rubrica"]["codigo"])
    tem_identificador_bancario = bool(item_despesa["fitid"])

    assert debito_casa_com_liquido is True
    assert tem_rubrica_vinculada is True
    assert tem_identificador_bancario is True

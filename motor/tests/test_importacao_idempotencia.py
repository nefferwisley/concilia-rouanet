from datetime import date
from decimal import Decimal

from motor import importar


class CursorDuplicata:
    def __init__(self):
        self.sql = []
        self._ultimo = ""

    def execute(self, sql, params=None):
        self._ultimo = " ".join(sql.split()).lower()
        self.sql.append((self._ultimo, params))

    def fetchone(self):
        if "insert into transacoes" in self._ultimo:
            return None
        raise AssertionError(f"fetchone inesperado para: {self._ultimo}")


def _dados():
    return {
        "rubrica_salic": "1.1",
        "descricao": "Servico",
        "documento_ref": None,
        "cnpj_cpf": None,
        "razao_social": None,
        "prestador": "Pessoa Teste",
        "_revisao_pendente": False,
        "_confianca_norm": None,
        "_data_pagamento_obj": date(2024, 1, 2),
        "_valor_liquido_dec": Decimal("100.00"),
        "valor_nota_fiscal": None,
    }


def test_chave_registro_fonte_e_estavel_e_preserva_posicao():
    linha = {"valor": "100.00", "data": "2024-01-02"}
    primeira = importar.chave_registro_fonte("a" * 64, 1, linha)
    repetida = importar.chave_registro_fonte(
        "a" * 64, 1, dict(reversed(list(linha.items())))
    )
    outra_posicao = importar.chave_registro_fonte("a" * 64, 2, linha)

    assert primeira == repetida
    assert primeira != outra_posicao
    assert len(primeira) == 64


def test_reprocessamento_para_antes_de_criar_filhos(monkeypatch):
    monkeypatch.setattr(
        importar,
        "buscar_rubrica_com_fallback",
        lambda *_args, **_kwargs: ("rubrica-1", 1.0, "DETERMINISTICO"),
    )
    motor = importar.MotorImportacao({}, {}, verbose=False)
    cursor = CursorDuplicata()

    assert motor.importar_lancamento(
        cursor,
        "projeto-1",
        "conta-1",
        _dados(),
        1,
        source_record_key="c" * 64,
    )

    sql = "\n".join(comando for comando, _ in cursor.sql)
    assert motor.stats["linhas_duplicadas"] == 1
    assert "insert into despesas" not in sql
    assert "insert into extrato_movimentos" not in sql
    assert "insert into log_matching" not in sql

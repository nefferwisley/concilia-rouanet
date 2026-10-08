"""Pré-validação HTTP com XLSX sintético e conexão simulada, sem serviços reais."""

from datetime import date
from io import BytesIO

import openpyxl
import pytest
from fastapi.testclient import TestClient

from backend.database import get_conn
from backend.main import app
from backend.dominio.planilha_revisada import analisar_planilha, parse_planilha
from backend.routes.planilha import settings


def xlsx(cabecalhos=None, linhas=None):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Financeiro"
    ws.append(["Projeto sintético"])
    ws.append(cabecalhos or ["Favorecido", "Data do pagamento", "Valor do pagamento", "Observações"])
    for linha in linhas if linhas is not None else [["Fornecedor sintético", date(2026, 10, 7), 123.45, "Nota"]]:
        ws.append(linha)
    buf = BytesIO()
    wb.save(buf)
    wb.close()
    return buf.getvalue()


class Conexao:
    def __init__(self):
        self.escritas = []
        self.leituras_snapshot = 0

    async def fetchrow(self, sql, *args):
        return {"id": args[0]} if args[0] != "sem-acesso" else None

    async def fetch(self, sql, *args):
        self.leituras_snapshot += 1
        return []

    async def execute(self, sql, *args):
        self.escritas.append((sql, args))

    async def executemany(self, sql, args):
        self.escritas.append((sql, args))


@pytest.fixture
def api():
    conn = Conexao()
    anteriores = app.dependency_overrides.copy()
    app.dependency_overrides[get_conn] = lambda: (conn, "usuario-sintetico")
    try:
        yield TestClient(app), conn
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(anteriores)


def enviar(client, conteudo, rota="validar", projeto="p1", data=None, nome="teste.xlsx"):
    sufixo = "/validar" if rota == "validar" else ""
    return client.post(
        f"/api/v1/projetos/{projeto}/planilha{sufixo}",
        files={"arquivo": (nome, conteudo, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        data=data or {},
    )


def test_relatorio_sem_persistencia(api):
    client, conn = api
    conteudo = xlsx(linhas=[
        ["Fornecedor sintético", date(2026, 10, 7), 123.45, "Nota"],
        ["Subtotal", None, None, None],
    ])
    resposta = enviar(client, conteudo)
    assert resposta.status_code == 200
    relatorio = resposta.json()
    assert relatorio["projeto_id"] == "p1"
    assert relatorio["aba"] == "Financeiro"
    assert relatorio["linha_cabecalho"] == 2
    assert relatorio["linhas_validas"] == 1
    assert relatorio["colunas_reconhecidas"][0] == {"conceito": "prestador", "coluna": 1, "cabecalho": "Favorecido"}
    assert relatorio["colunas_nao_importadas"] == [{"coluna": 4, "cabecalho": "Observações"}]
    assert relatorio["linhas_ignoradas"] == [{"linha": 4, "motivo": "Sem data ou valor."}]
    assert conn.escritas == []
    assert conn.leituras_snapshot == 0


@pytest.mark.parametrize("extra", ["VALOR", "Valor pago", "FORNECEDOR", "Documento fiscal"])
@pytest.mark.parametrize("rota", ["validar", "importar"])
def test_ambiguidades_bloqueiam_ambas_rotas(api, extra, rota):
    client, conn = api
    cab = ["PRESTADOR", "DATA", "VALOR", "DOCUMENTO", extra]
    resposta = enviar(client, xlsx(cab), rota)
    assert resposta.status_code == 400
    assert "Cabeçalho ambíguo na linha 2" in resposta.json()["detail"]
    assert conn.escritas == []
    assert conn.leituras_snapshot == 0


@pytest.mark.parametrize("data,valor", [("31/02/2026", 10), ("2026-10-07", "dez"), ("2026-10-07", "NaN"), ("2026-10-07", "Infinity")])
@pytest.mark.parametrize("rota", ["validar", "importar"])
def test_linha_invalida_nao_vira_snapshot_parcial(api, data, valor, rota):
    client, conn = api
    conteudo = xlsx(linhas=[
        ["Válido", "2026-10-07", 10], ["Inválido", data, valor],
    ])
    resposta = enviar(client, conteudo, rota)
    assert resposta.status_code == 400
    assert "Linha 4" in resposta.json()["detail"]
    assert conn.escritas == []
    assert conn.leituras_snapshot == 0


@pytest.mark.parametrize("rota", ["validar", "importar"])
def test_corrompido_e_aba_ausente_viram_400(api, rota):
    client, conn = api
    assert enviar(client, b"nao e xlsx", rota).status_code == 400
    resposta = enviar(client, xlsx(), rota, data={"aba": "Inexistente"})
    assert resposta.status_code == 400
    assert "Aba não encontrada" in resposta.json()["detail"]
    assert conn.escritas == []


def test_aliases_reordenados_sao_importados(api):
    client, conn = api
    conteudo = xlsx([" Valor   pago ", "BENEFICIARIO", "DATA PAGAMENTO"], [[42.50, "Sintético", "07/10/2026"]])
    assert enviar(client, conteudo).status_code == 200
    resposta = enviar(client, conteudo, "importar")
    assert resposta.status_code == 201
    assert resposta.json()["importadas"] == 1
    assert len(conn.escritas) == 2
    assert "insert into planilha_revisada" in conn.escritas[1][0]


def test_validacao_preserva_acesso_e_limite(api, monkeypatch):
    client, conn = api
    assert enviar(client, xlsx(), projeto="sem-acesso").status_code == 404
    assert enviar(client, b"x", nome="arquivo.csv").status_code == 400
    monkeypatch.setattr(settings, "max_upload_mb", 0)
    assert enviar(client, xlsx()).status_code == 413
    assert conn.escritas == []


def test_validacao_requer_autenticacao():
    assert TestClient(app).post("/api/v1/projetos/p1/planilha/validar").status_code == 401


def test_sem_linhas_e_identidades_duplicadas_sao_bloqueadas(api):
    client, conn = api
    assert enviar(client, xlsx(linhas=[["Subtotal", None, None]])).status_code == 400
    conteudo = xlsx(["CONTROLE", "PRESTADOR", "DATA", "VALOR"], [
        [1, "A", "2026-10-07", 10], [1, "B", "2026-10-07", 20],
    ])
    assert enviar(client, conteudo).status_code == 400
    assert enviar(client, conteudo, "importar").status_code == 400
    assert conn.escritas == []


def test_contrato_compartilhado_com_adapter():
    from motor.cabecalhos_planilha import COLUNAS_FINANCEIRAS, mapear_cabecalho
    buf = xlsx(["VALOR DO PAGAMENTO", "FORNECEDOR PESSOA FÍSICA", "DATA DO PAGAMENTO"], [[10, "Sintético", "2026-10-07"]])
    assert mapear_cabecalho(
        ["VALOR DO PAGAMENTO", "FORNECEDOR PESSOA FÍSICA", "DATA DO PAGAMENTO"],
        COLUNAS_FINANCEIRAS, 2,
    ) == {"valor": 0, "prestador": 1, "data": 2}
    linhas, _ = analisar_planilha(buf)
    assert parse_planilha(buf) == linhas
    assert linhas[0].prestador == "Sintético"


def test_rubrica_legada_resolve_apenas_codigo_e_descricao_distintos(api):
    client, _ = api
    cab = ["PRESTADOR", "DATA", "VALOR", "RUBRICA", "RUBRICA"]
    conteudo = xlsx(cab, [["A", "2026-10-07", 10, "Produção", "1.5.1"]])
    resposta = enviar(client, conteudo)
    assert resposta.status_code == 200
    rubrica = next(c for c in resposta.json()["colunas_reconhecidas"] if c["conceito"] == "rubrica")
    assert rubrica["coluna"] == 5
    assert parse_planilha(conteudo)[0].rubrica == "1.5.1"
    assert enviar(client, xlsx(cab, [["A", "2026-10-07", 10, "1.2.3", "1.5.1"]])).status_code == 400
    assert enviar(client, xlsx(cab, [["A", "2026-10-07", 10, "Produção", "Serviços"]])).status_code == 400

"""
dominio/planilha_revisada.py — parser puro do XLSX da planilha revisada.

POR QUE ESTE MÓDULO EXISTE
--------------------------
A planilha de conciliação revisada era lida por um script CLI
(`backend/scripts/importar_prestador_planilha.py`) que só sabia transformar as
linhas em SQL de backfill de PRESTADOR/RAZÃO SOCIAL — e nunca era persistida no
SaaS. O relatório de divergências (`routes/divergencias.py`) então passava
`planilha=None` pro motor, e três regras voltavam como "não avaliadas".

Este módulo é o parser canônico usado pela API (routes/planilha.py): recebe os
BYTES do arquivo, devolve `list[LinhaPlanilha]` — a mesma dataclass do motor de
regras. Sem SQL, sem I/O de arquivo, sem caminho de pasta: função pura, testável.

PRINCÍPIOS (herdados do script original)
----------------------------------------
- Colunas localizadas pelo TEXTO do cabeçalho, nunca por posição. Um parser
  posicional já custou caro neste projeto (a coluna CONTROLE do 1961 só está
  preenchida até a linha 90 e filtrar por ela descartou 95 linhas válidas).
- Linhas sem data OU sem valor são ignoradas: são aporte, subtotal ou linha
  vazia — não são lançamentos e não entram no cruzamento.
- Nenhum dado é inventado: o que não está na planilha fica None.
"""
from __future__ import annotations

import datetime
import re
from zipfile import BadZipFile
from xml.etree.ElementTree import ParseError
from decimal import Decimal, InvalidOperation
from io import BytesIO

import openpyxl
from openpyxl.utils.exceptions import InvalidFileException
from motor.cabecalhos_planilha import COLUNAS_FINANCEIRAS, mapear_cabecalho

from .divergencias import LinhaPlanilha

# Sinônimos aceitos por coluna: planilhas de projetos diferentes escrevem o
# mesmo conceito de formas ligeiramente diferentes.
COLUNAS = {
    conceito: COLUNAS_FINANCEIRAS[conceito]
    for conceito in ("prestador", "razao_social", "data", "valor", "controle", "rubrica", "documento_fiscal")
}


def _data(v) -> datetime.date | None:
    if isinstance(v, (datetime.datetime, datetime.date)):
        return v.date() if isinstance(v, datetime.datetime) else v
    s = str(v or "").strip()
    m = re.match(r"^(\d{2})/(\d{2})/(\d{4})", s)
    if m:
        try:
            return datetime.date(int(m.group(3)), int(m.group(2)), int(m.group(1)))
        except ValueError:
            return None
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})", s)
    if m:
        try:
            return datetime.date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            return None
    return None


def _valor(v) -> Decimal | None:
    if v is None or v == "":
        return None
    try:
        valor = Decimal(str(v))
        return valor.quantize(Decimal("0.01")) if valor.is_finite() else None
    except (InvalidOperation, ValueError):
        return None


def achar_cabecalho(ws, limite=15) -> tuple[int, dict[str, int]]:
    """Procura a linha de cabeçalho e mapeia conceito -> índice de coluna.

    Levanta ValueError (não SystemExit) se não achar — este é o parser da API,
    e uma planilha sem cabeçalho vira 400 na rota, não morte do processo.
    """
    for i, linha in enumerate(ws.iter_rows(min_row=1, max_row=limite, values_only=True), 1):
        achadas = mapear_cabecalho(linha, COLUNAS, i, ws.iter_rows(min_row=i + 1, values_only=True))
        if achadas:
            return i, achadas
    raise ValueError(
        f"Não achei o cabeçalho com PRESTADOR/DATA/VALOR nas primeiras {limite} linhas."
    )


def analisar_planilha(conteudo: bytes, aba: str | None = None) -> tuple[list[LinhaPlanilha], dict]:
    """Interpreta o XLSX (bytes) e devolve as LinhaPlanilha na ordem da planilha.

    Linhas sem data ou sem valor são puladas (aporte/subtotal/vazia). A `linha`
    é o número físico da linha no arquivo — é o que as divergências mostram
    quando acusam AUSENTE_NO_EXTRATO ou DATA_DIVERGENTE.
    """
    try:
        wb = openpyxl.load_workbook(BytesIO(conteudo), read_only=True, data_only=True)
    except (BadZipFile, InvalidFileException, KeyError, OSError, ParseError, ValueError) as exc:
        raise ValueError("Arquivo XLSX ilegível ou corrompido.") from exc
    try:
        if aba and aba not in wb.sheetnames:
            raise ValueError(f"Aba não encontrada: {aba}.")
        ws = wb[aba] if aba else wb[wb.sheetnames[0]]
        cab, col = achar_cabecalho(ws)
        return _ler_linhas(ws, cab, col)
    finally:
        wb.close()


def _ler_linhas(ws, cab, col) -> tuple[list[LinhaPlanilha], dict]:
    cabecalhos = next(ws.iter_rows(min_row=cab, max_row=cab, values_only=True))
    relatorio = {
        "aba": ws.title,
        "linha_cabecalho": cab,
        "colunas_reconhecidas": [
            {"conceito": conceito, "coluna": j + 1, "cabecalho": str(cabecalhos[j])}
            for conceito, j in col.items()
        ],
        "colunas_nao_importadas": [
            {"coluna": j + 1, "cabecalho": str(nome)}
            for j, nome in enumerate(cabecalhos)
            if nome not in (None, "") and j not in col.values()
        ],
        "linhas_ignoradas": [],
    }

    def _cel(k: str, r: tuple):
        j = col.get(k)
        if j is None or j >= len(r) or r[j] is None:
            return None
        return str(r[j]).strip() or None

    out: list[LinhaPlanilha] = []
    for i, r in enumerate(ws.iter_rows(min_row=cab + 1, values_only=True), cab + 1):
        d, v = _data(_cel("data", r)), _valor(_cel("valor", r))
        invalidos = [
            campo for campo, convertido in (("data", d), ("valor", v))
            if _cel(campo, r) is not None and convertido is None
        ]
        if invalidos:
            raise ValueError(f"Linha {i}: {', '.join(invalidos)} inválido(s). Corrija antes de importar.")
        if not d or v is None:
            if any(c not in (None, "") for c in r):
                relatorio["linhas_ignoradas"].append({"linha": i, "motivo": "Sem data ou valor."})
            continue
        out.append(
            LinhaPlanilha(
                linha=i,
                controle=_cel("controle", r),
                prestador=_cel("prestador", r),
                razao_social=_cel("razao_social", r),
                data=d,
                valor=v,
                rubrica=_cel("rubrica", r),
                documento_fiscal=_cel("documento_fiscal", r),
            )
        )
    relatorio["linhas_validas"] = len(out)
    return out, relatorio


def parse_planilha(conteudo: bytes, aba: str | None = None) -> list[LinhaPlanilha]:
    linhas, _ = analisar_planilha(conteudo, aba)
    return linhas

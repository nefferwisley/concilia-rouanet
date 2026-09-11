"""Compatibilidade da extração em lote usada pelo importador de pastas."""

from __future__ import annotations

import base64
import hashlib
import re
from datetime import date, datetime
from io import BytesIO
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from backend.database import get_conn

router = APIRouter(prefix="/api/gemini", tags=["compatibilidade-importacao"])


class ImportedFile(BaseModel):
    name: str
    relativePath: str = ""
    subfolder: str = "Raiz"
    size: int = 0
    mimeType: str = "application/octet-stream"
    base64: str | None = None
    textContent: str | None = None


class ExtractionRequest(BaseModel):
    files: list[ImportedFile] = Field(min_length=1, max_length=10)


def _stable_id(prefix: str, *parts: object) -> str:
    raw = "|".join(str(part).strip() for part in parts)
    return f"{prefix}-{hashlib.sha256(raw.encode('utf-8')).hexdigest()[:20]}"


def _number(value: object) -> float | None:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value)
    if not isinstance(value, str):
        return None
    cleaned = value.replace("R$", "").replace(".", "").replace(",", ".").strip()
    try:
        return float(cleaned)
    except ValueError:
        return None


def _iso_date(value: object) -> str | None:
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, str):
        for pattern in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
            try:
                return datetime.strptime(value.strip(), pattern).date().isoformat()
            except ValueError:
                pass
    return None


def _decode(file: ImportedFile) -> bytes | None:
    if not file.base64:
        return None
    try:
        return base64.b64decode(file.base64, validate=True)
    except (ValueError, TypeError):
        return None


def _extract_spreadsheet(file: ImportedFile) -> tuple[dict[str, Any], list[dict[str, Any]], list[dict[str, Any]], list[str]]:
    """Extrai saídas da planilha de controle sem inferir dados ausentes."""
    content = _decode(file)
    if not content:
        return {}, [], [], [f"{file.name}: planilha sem conteúdo legível."]
    try:
        from openpyxl import load_workbook

        worksheet = load_workbook(BytesIO(content), data_only=True, read_only=True).active
    except Exception:
        return {}, [], [], [f"{file.name}: formato de planilha não suportado."]

    rows = list(worksheet.iter_rows(values_only=True))
    title = next((str(row[0]).strip() for row in rows if row and row[0]), "")
    pronac_match = re.search(r"pronac\.?\s*([\d./-]+)", title, flags=re.IGNORECASE)
    account_match = re.search(r"ag[eê]ncia:\s*([^/]+)\s*/\s*conta:\s*([^\s]+)", title, flags=re.IGNORECASE)
    project = {
        "id": _stable_id("proj", file.name, title),
        "pronac": pronac_match.group(1) if pronac_match else "",
        "nome": title.split("(")[0].strip() or "Projeto importado",
        "bancoInfo": {
            "banco": "Banco do Brasil (001)",
            "agencia": account_match.group(1).strip() if account_match else "",
            "contaMovimento": account_match.group(2).strip() if account_match else "",
        },
    }
    rubrics: dict[str, dict[str, Any]] = {}
    transactions: list[dict[str, Any]] = []
    for index, row in enumerate(rows, start=1):
        if len(row) < 8:
            continue
        supplier, transaction_date, amount, rubric = row[3], row[4], _number(row[5]), row[7]
        date_iso = _iso_date(transaction_date)
        if not isinstance(supplier, str) or not supplier.strip() or not date_iso or amount is None or amount <= 0:
            continue
        rubric_name = str(rubric).strip() if rubric else "Não identificada"
        rubric_id = _stable_id("rub", file.name, rubric_name)
        if rubric_name not in rubrics:
            rubrics[rubric_name] = {
                "id": rubric_id,
                "etapa": "Não identificada",
                "metaNumero": 0,
                "nomeRubrica": rubric_name,
                "descricaoDetalhada": "Rubrica extraída da planilha de controle.",
                "unidadeMedida": "verba",
                "quantidadeAprovada": 0,
                "valorUnitarioAprovado": 0,
                "valorTotalAprovado": 0,
                "valorExecutado": 0,
                "limiteRemanejamento20pct": 0,
                "statusExecucao": "Em Execução",
            }
        rubrics[rubric_name]["valorExecutado"] += amount
        transactions.append({
            "id": _stable_id("tx", file.name, index, date_iso, supplier, amount),
            "contaTipo": "Conta Movimento",
            "data": date_iso,
            "dataTransacao": date_iso,
            "tipo": "DEBITO",
            "valor": amount,
            "descricaoExtrato": supplier.strip(),
            "descricaoOriginalExtrato": supplier.strip(),
            "documentoNumero": f"PLAN-{index}",
            "favorecido": supplier.strip(),
            "saldoAposTransacao": _number(row[6]),
            "status": "Pendente",
            "statusConciliacao": "Pendente",
            "idRubricaVinculada": rubric_id,
        })
    return project, list(rubrics.values()), transactions, []


@router.post("/extract-project-files")
async def extract_project_files(body: ExtractionRequest, dep=Depends(get_conn)):
    """Substitui a rota Express removida; erros individuais viram avisos."""
    del dep  # A dependência autentica a requisição; a extração não lê o banco.
    project: dict[str, Any] = {}
    transactions: list[dict[str, Any]] = []
    rubrics: list[dict[str, Any]] = []
    warnings: list[str] = []
    for file in body.files:
        if file.name.lower().endswith((".xlsx", ".xlsm")):
            candidate, extracted_rubrics, extracted_transactions, file_warnings = _extract_spreadsheet(file)
            if candidate and not project:
                project = candidate
            rubrics.extend(extracted_rubrics)
            transactions.extend(extracted_transactions)
            warnings.extend(file_warnings)
    return {
        "success": True,
        "data": {
            "project": project,
            "transactions": transactions,
            "documents": [],
            "rubrics": rubrics,
            "alerts": [],
            "tripartiteEntries": [],
            "importedFilesCount": len(body.files),
            "importedFiles": [file.name for file in body.files],
            "warnings": warnings,
        },
    }

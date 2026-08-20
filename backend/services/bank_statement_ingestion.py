import csv
from dataclasses import dataclass, field
from decimal import Decimal
import io
import re
from typing import Any, Literal, Optional


@dataclass
class BankMovement:
    data: str
    descricao: str
    valor: Decimal
    tipo: Literal["DEBITO", "CREDITO"]
    documento: Optional[str] = None
    saldo: Optional[Decimal] = None
    bank_id: Optional[str] = None
    source_locator: dict[str, Any] = field(default_factory=dict)


def _clean_text(s: Optional[str]) -> str:
    if not s:
        return ""
    return s.strip()


def _parse_ofx_date(raw: str) -> str:
    # 20240115120000[-3:BRT] ou 20240115
    m = re.match(r"^(\d{4})(\d{2})(\d{2})", raw.strip())
    if m:
        y, mo, d = m.groups()
        return f"{y}-{mo}-{d}"
    return raw.strip()


def parse_ofx_content(text: str) -> list[BankMovement]:
    movements: list[BankMovement] = []
    trn_blocks = re.findall(r"<STMTTRN>(.*?)</STMTTRN>", text, flags=re.DOTALL | re.IGNORECASE)

    for block in trn_blocks:
        def get_tag(tag: str) -> Optional[str]:
            m = re.search(rf"<{tag}>(.*?)(?:<|$|\r|\n)", block, flags=re.IGNORECASE)
            return m.group(1).strip() if m else None

        trntype = get_tag("TRNTYPE") or "OTHER"
        dtposted = get_tag("DTPOSTED") or ""
        trnamt_str = get_tag("TRNAMT") or "0"
        fitid = get_tag("FITID")
        checknum = get_tag("CHECKNUM")
        memo = get_tag("MEMO") or get_tag("NAME") or "MOVIMENTAÇÃO BANCÁRIA"

        data_iso = _parse_ofx_date(dtposted)
        try:
            valor = Decimal(trnamt_str.replace(",", "."))
        except Exception:
            valor = Decimal("0")

        tipo: Literal["DEBITO", "CREDITO"] = "DEBITO" if valor < 0 or trntype.upper() == "DEBIT" else "CREDITO"

        movements.append(
            BankMovement(
                data=data_iso,
                descricao=memo,
                documento=checknum,
                valor=valor,
                tipo=tipo,
                bank_id=fitid,
                source_locator={"kind": "ofx", "fitid": fitid} if fitid else {"kind": "ofx"},
            )
        )

    return movements


def parse_csv_content(text: str) -> list[BankMovement]:
    movements: list[BankMovement] = []
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not lines:
        return []

    delimiter = ";" if ";" in lines[0] else ","
    reader = csv.reader(io.StringIO(text), delimiter=delimiter)

    for row_idx, row in enumerate(reader, start=1):
        if not row or len(row) < 3:
            continue

        # Pula cabeçalho
        first_cell = row[0].lower()
        if "data" in first_cell or "dt" in first_cell:
            continue

        data_raw = row[0].strip()
        # Normaliza data DD/MM/YYYY para YYYY-MM-DD
        m = re.match(r"^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})", data_raw)
        if m:
            d, mo, y = m.groups()
            if len(y) == 2:
                y = f"20{y}"
            data_iso = f"{y.zfill(4)}-{mo.zfill(2)}-{d.zfill(2)}"
        else:
            data_iso = data_raw

        desc = row[1].strip()
        doc = row[2].strip() if len(row) > 3 else None
        val_str = row[-1].strip()

        # Limpa formato de valor
        clean_val = re.sub(r"[^\d,\.-]", "", val_str)
        if "," in clean_val and "." in clean_val:
            if clean_val.rfind(",") > clean_val.rfind("."):
                clean_val = clean_val.replace(".", "").replace(",", ".")
            else:
                clean_val = clean_val.replace(",", "")
        elif "," in clean_val:
            clean_val = clean_val.replace(",", ".")

        try:
            valor = Decimal(clean_val)
        except Exception:
            continue

        tipo: Literal["DEBITO", "CREDITO"] = "DEBITO" if valor < 0 else "CREDITO"

        movements.append(
            BankMovement(
                data=data_iso,
                descricao=desc,
                documento=doc if doc else None,
                valor=valor,
                tipo=tipo,
                source_locator={"kind": "csv", "line": row_idx},
            )
        )

    return movements


def parse_bank_source(content: bytes, filename: str = "") -> list[BankMovement]:
    if not content:
        return []

    # Tenta decodificar texto
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        text = content.decode("latin-1", errors="ignore")

    if filename.lower().endswith(".ofx") or "<OFX>" in text.upper() or "OFXHEADER" in text:
        return parse_ofx_content(text)

    return parse_csv_content(text)

from decimal import Decimal
import re
import unicodedata
from typing import List, Tuple

from backend.domain.document_types import ClassificationResult, DocumentInput, DocumentType


def _normalize(text: str) -> str:
    if not text:
        return ""
    nfkd = unicodedata.normalize("NFKD", str(text))
    return nfkd.encode("ascii", "ignore").decode("ascii").lower()


def classify_document(doc_input: DocumentInput) -> ClassificationResult:
    norm_name = _normalize(doc_input.name)
    norm_path = _normalize(doc_input.relative_path)
    norm_text = _normalize(doc_input.text)

    full_context = f"{norm_path} {norm_name} {norm_text}"

    rules_matched: List[str] = []

    # 1. Comprovante de Pagamento (PIX, TED, Boleto, Comprovante bancário)
    payment_terms = [
        "comprovante de transferencia",
        "comprovante pix",
        "transferencia pix",
        "comprovante de pagamento",
        "pagamento de titulo",
        "liquidacao de boleto",
        "autenticacao mecanica",
        "codigo de autenticacao",
        "debito autorizado",
    ]
    if any(t in full_context for t in payment_terms):
        rules_matched.append("payment_proof_terms")
        return ClassificationResult(
            document_type="PAYMENT_PROOF",
            method="DETERMINISTIC",
            confidence=Decimal("0.9500"),
            matched_rules=tuple(rules_matched),
        )

    # 2. Recibo de Pagamento a Autônomo (RPA)
    rpa_terms = [
        "recibo de pagamento a autonomo",
        "pagamento a autonomo",
        "rpa",
        "retencao inss e irrf",
    ]
    if any(t in full_context for t in rpa_terms) and ("recibo" in full_context or "autonomo" in full_context):
        rules_matched.append("rpa_terms")
        return ClassificationResult(
            document_type="TAX_RECEIPT",
            method="DETERMINISTIC",
            confidence=Decimal("0.9000"),
            matched_rules=tuple(rules_matched),
        )

    # 3. Nota Fiscal (NFS-e, NF-e, DANFE)
    invoice_terms = [
        "nota fiscal",
        "danfe",
        "nfs-e",
        "nf-e",
        "tomador de servicos",
        "prestador de servicos",
        "discriminacao dos servicos",
        "dados da nota fiscal",
    ]
    if any(t in full_context for t in invoice_terms):
        rules_matched.append("invoice_terms")
        return ClassificationResult(
            document_type="INVOICE",
            method="DETERMINISTIC",
            confidence=Decimal("0.9000"),
            matched_rules=tuple(rules_matched),
        )

    # 4. Contrato de Prestação de Serviços
    contract_terms = [
        "instrumento particular de contrato",
        "contrato de prestacao",
        "contratante e contratada",
        "clausula primeira",
        "clausula 1",
    ]
    if any(t in full_context for t in contract_terms):
        rules_matched.append("contract_terms")
        return ClassificationResult(
            document_type="CONTRACT",
            method="DETERMINISTIC",
            confidence=Decimal("0.9000"),
            matched_rules=tuple(rules_matched),
        )

    # 5. Extrato Bancário em PDF
    statement_terms = [
        "extrato de conta",
        "extrato mensal",
        "demonstrativo de conta corrente",
        "saldo em conta",
    ]
    if any(t in full_context for t in statement_terms):
        rules_matched.append("bank_statement_terms")
        return ClassificationResult(
            document_type="BANK_STATEMENT",
            method="DETERMINISTIC",
            confidence=Decimal("0.8500"),
            matched_rules=tuple(rules_matched),
        )

    return ClassificationResult(
        document_type="UNKNOWN",
        method="DETERMINISTIC",
        confidence=Decimal("0.0000"),
        matched_rules=tuple(rules_matched),
    )

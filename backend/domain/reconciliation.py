from dataclasses import dataclass, field
from decimal import Decimal
from typing import List, Literal, Optional

DecisionType = Literal["APPROVED", "HUMAN_CONFIRMATION_REQUIRED", "AMBIGUOUS", "INCOMPLETE"]
MatchType = Literal["DETERMINISTIC", "PROBABILISTIC", "MANUAL"]


@dataclass(frozen=True)
class DeclaredSource:
    id: str
    valor: Optional[Decimal] = None
    data: Optional[str] = None
    fornecedor: Optional[str] = None
    documento: Optional[str] = None
    rubrica: Optional[str] = None


@dataclass(frozen=True)
class BankSource:
    id: str
    valor: Decimal
    data: str
    descricao: str
    documento: Optional[str] = None


@dataclass(frozen=True)
class DocumentSource:
    id: str
    valor_bruto: Optional[Decimal] = None
    valor_liquido: Optional[Decimal] = None
    data_emissao: Optional[str] = None
    fornecedor_nome: Optional[str] = None
    fornecedor_documento: Optional[str] = None
    numero_documento: Optional[str] = None


@dataclass(frozen=True)
class MatchCandidate:
    declared_id: str
    bank_id: Optional[str]
    document_id: Optional[str]
    score: Decimal
    match_type: MatchType
    decision: DecisionType
    reasons: tuple[str, ...] = field(default_factory=tuple)


def score_reconciliation_candidate(
    declared: DeclaredSource,
    bank: Optional[BankSource] = None,
    document: Optional[DocumentSource] = None,
) -> MatchCandidate:
    score = Decimal("0.0000")
    reasons: List[str] = []

    # 1. Valor (peso 40%)
    if bank and declared.valor is not None:
        if abs(bank.valor) == declared.valor:
            score += Decimal("0.4000")
            reasons.append("exact_value_bank_match")
    if document and declared.valor is not None and document.valor_bruto is not None:
        if document.valor_bruto == declared.valor:
            reasons.append("exact_value_doc_match")

    # 2. Data (peso 20%)
    if bank and declared.data and bank.data:
        if declared.data == bank.data:
            score += Decimal("0.2000")
            reasons.append("exact_date_match")
        else:
            # Proximidade
            score += Decimal("0.1000")
            reasons.append("close_date_match")

    # 3. Fornecedor (peso 25%)
    if declared.fornecedor:
        norm_fornec = declared.fornecedor.lower()
        if bank and norm_fornec[:6] in bank.descricao.lower():
            score += Decimal("0.1500")
            reasons.append("supplier_in_bank_description")
        if document and document.fornecedor_nome and norm_fornec[:6] in document.fornecedor_nome.lower():
            score += Decimal("0.1000")
            reasons.append("supplier_in_doc_name")

    # 4. Referência de Documento (peso 10%)
    if declared.documento and document and document.numero_documento:
        if document.numero_documento in declared.documento or declared.documento in document.numero_documento:
            score += Decimal("0.1000")
            reasons.append("document_number_match")

    # Decisão
    decision: DecisionType = "HUMAN_CONFIRMATION_REQUIRED" if score >= Decimal("0.5000") else "INCOMPLETE"
    match_type: MatchType = "DETERMINISTIC" if score >= Decimal("0.9000") else "PROBABILISTIC"

    return MatchCandidate(
        declared_id=declared.id,
        bank_id=bank.id if bank else None,
        document_id=document.id if document else None,
        score=min(Decimal("1.0000"), score),
        match_type=match_type,
        decision=decision,
        reasons=tuple(reasons),
    )


def rank_candidates(candidates: list[MatchCandidate]) -> list[MatchCandidate]:
    if not candidates:
        return []

    # Detecta ambiguidades (empates de score máximo)
    max_score = max(c.score for c in candidates)
    top_candidates = [c for c in candidates if c.score == max_score]

    if len(top_candidates) > 1 and max_score > Decimal("0.5000"):
        # Marca todos como AMBIGUOUS
        return [
            MatchCandidate(
                declared_id=c.declared_id,
                bank_id=c.bank_id,
                document_id=c.document_id,
                score=c.score,
                match_type=c.match_type,
                decision="AMBIGUOUS",
                reasons=c.reasons + ("tie_with_other_candidate",),
            )
            for c in candidates
        ]

    return sorted(candidates, key=lambda c: c.score, reverse=True)

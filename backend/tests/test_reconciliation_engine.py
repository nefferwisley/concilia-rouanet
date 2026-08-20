from decimal import Decimal
import pytest
from backend.domain.reconciliation import (
    DeclaredSource,
    BankSource,
    DocumentSource,
    score_reconciliation_candidate,
    rank_candidates,
)


def test_exact_value_date_and_document_produce_high_candidate():
    declared = DeclaredSource(
        id="d1",
        valor=Decimal("1500.50"),
        data="2024-01-15",
        fornecedor="Fornecedor Alpha LTDA",
        documento="NF 1234",
    )
    bank = BankSource(
        id="b1",
        valor=Decimal("-1500.50"),
        data="2024-01-15",
        descricao="PAGTO FORNECEDOR ALPHA",
    )
    doc = DocumentSource(
        id="doc1",
        valor_bruto=Decimal("1500.50"),
        data_emissao="2024-01-14",
        fornecedor_nome="Fornecedor Alpha LTDA",
        numero_documento="1234",
    )

    candidate = score_reconciliation_candidate(declared, bank, doc)

    assert candidate.score >= Decimal("0.9000")
    assert candidate.decision == "HUMAN_CONFIRMATION_REQUIRED"


def test_equal_candidates_are_marked_ambiguous():
    c1 = score_reconciliation_candidate(
        DeclaredSource(id="d1", valor=Decimal("100.00"), data="2024-01-10", fornecedor="ABC"),
        BankSource(id="b1", valor=Decimal("-100.00"), data="2024-01-10", descricao="ABC"),
    )
    c2 = score_reconciliation_candidate(
        DeclaredSource(id="d1", valor=Decimal("100.00"), data="2024-01-10", fornecedor="ABC"),
        BankSource(id="b2", valor=Decimal("-100.00"), data="2024-01-10", descricao="ABC"),
    )

    ranked = rank_candidates([c1, c2])

    assert len(ranked) == 2
    assert ranked[0].decision == "AMBIGUOUS"

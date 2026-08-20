import pytest
from backend.domain.document_types import DocumentInput, ClassificationResult
from backend.services.document_classifier import classify_document


def test_payment_proof_rule_beats_generic_pdf():
    result = classify_document(
        DocumentInput(
            name="104 - comprovante pix.pdf",
            relative_path="1. Pagamentos/104 - comprovante pix.pdf",
            text="COMPROVANTE DE TRANSFERÊNCIA PIX valor R$ 1.200,00 autenticação 987123",
        )
    )
    assert result.document_type == "PAYMENT_PROOF"
    assert result.method == "DETERMINISTIC"
    assert result.confidence >= 0.85


def test_invoice_nfse_detected_by_text():
    result = classify_document(
        DocumentInput(
            name="NF 456 - Consultoria.pdf",
            relative_path="1. Pagamentos/NF 456 - Consultoria.pdf",
            text="PREFEITURA MUNICIPAL NOTA FISCAL DE SERVIÇOS ELETRÔNICA - NFS-e Tomador de Serviços",
        )
    )
    assert result.document_type == "INVOICE"
    assert result.method == "DETERMINISTIC"


def test_rpa_tax_receipt_detected():
    result = classify_document(
        DocumentInput(
            name="RPA - Joao Silva.pdf",
            relative_path="Documentos/RPA - Joao Silva.pdf",
            text="RECIBO DE PAGAMENTO A AUTÔNOMO - RPA Retenção INSS e IRRF",
        )
    )
    assert result.document_type == "TAX_RECEIPT"


def test_contract_detected():
    result = classify_document(
        DocumentInput(
            name="Contrato de Prestação de Serviços.pdf",
            relative_path="Contratos/Contrato de Prestação de Serviços.pdf",
            text="INSTRUMENTO PARTICULAR DE CONTRATO DE PRESTAÇÃO DE SERVIÇOS CLÁUSULA PRIMEIRA",
        )
    )
    assert result.document_type == "CONTRACT"


def test_ambiguous_or_empty_returns_unknown():
    result = classify_document(
        DocumentInput(
            name="arquivo_indefinido.pdf",
            relative_path="Outros/arquivo_indefinido.pdf",
            text="Algum texto genérico sem termos fiscais ou bancários",
        )
    )
    assert result.document_type == "UNKNOWN"

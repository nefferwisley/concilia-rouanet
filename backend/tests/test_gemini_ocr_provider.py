from decimal import Decimal
import pytest
from backend.domain.extracted_evidence import OcrRequest
from backend.services.gemini_ocr_provider import GeminiOcrProvider, parse_gemini_response_to_extracted_document


def test_parse_gemini_response_schema_validation():
    valid_payload = {
        "fornecedor_nome": "Empresa XYZ LTDA",
        "fornecedor_documento": "12.345.678/0001-90",
        "numero_documento": "1002",
        "data_emissao": "2024-02-10",
        "valor_bruto": 2500.00,
        "valor_liquido": 2500.00,
        "descricao": "Serviços de Produção Cultural",
        "confidence": 0.95,
    }

    result = parse_gemini_response_to_extracted_document(
        file_id="file-xyz",
        document_type="INVOICE",
        model_version="gemini-1.5-pro",
        data=valid_payload,
    )

    assert result.file_id == "file-xyz"
    assert result.model_version == "gemini-1.5-pro"
    assert result.fields["gross_amount"].field_value == "2500.00"
    assert result.fields["supplier_name"].field_value == "Empresa XYZ LTDA"
    assert result.fields["document_number"].field_value == "1002"

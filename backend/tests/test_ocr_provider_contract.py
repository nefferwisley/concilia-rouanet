import asyncio
from decimal import Decimal
import pytest
from backend.domain.extracted_evidence import ExtractedDocument, ExtractedField, OcrRequest
from backend.services.ocr_provider import FakeOcrProvider


def test_provider_returns_field_level_provenance():
    provider = FakeOcrProvider(
        model_version="mock-ocr-v1",
        default_fields={
            "gross_amount": ExtractedField(
                field_name="gross_amount",
                field_value="1500.50",
                source_locator={"page": 1, "box": [10, 20, 100, 40]},
                confidence=Decimal("0.9800"),
            ),
            "supplier_name": ExtractedField(
                field_name="supplier_name",
                field_value="Fornecedor Alpha LTDA",
                source_locator={"page": 1},
                confidence=Decimal("0.9500"),
            ),
        },
    )

    request = OcrRequest(
        file_id="file-123",
        content=b"%PDF-1.4...",
        document_type="INVOICE",
    )

    result = asyncio.run(provider.extract(request))

    assert result.model_version == "mock-ocr-v1"
    assert "gross_amount" in result.fields
    assert result.fields["gross_amount"].source_locator["page"] == 1
    assert 0 <= result.fields["gross_amount"].confidence <= 1

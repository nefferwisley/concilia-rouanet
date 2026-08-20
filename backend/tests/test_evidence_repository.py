from decimal import Decimal
import pytest
from backend.domain.extracted_evidence import ExtractedDocument, ExtractedField
from backend.services.evidence_repository import build_field_insert_params


def test_build_field_insert_params_formats_json_and_decimals():
    extracted = ExtractedDocument(
        file_id="f1",
        document_type="INVOICE",
        model_version="gemini-1.5-flash",
        fields={
            "gross_amount": ExtractedField(
                field_name="gross_amount",
                field_value="1200.00",
                source_locator={"page": 1},
                confidence=Decimal("0.9500"),
            ),
        },
    )

    params = build_field_insert_params(
        run_id="run-1",
        document_id="doc-1",
        extracted=extracted,
    )

    assert len(params) == 1
    p = params[0]
    assert p["run_id"] == "run-1"
    assert p["document_id"] == "doc-1"
    assert p["field_name"] == "gross_amount"
    assert p["field_value"] == "1200.00"
    assert p["confidence"] == Decimal("0.9500")

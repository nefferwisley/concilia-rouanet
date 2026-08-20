from decimal import Decimal
from typing import Any, Optional

from backend.domain.extracted_evidence import ExtractedDocument, ExtractedField, OcrRequest
from backend.services.ocr_provider import OcrProvider


def parse_gemini_response_to_extracted_document(
    file_id: str,
    document_type: str,
    model_version: str,
    data: dict[str, Any],
) -> ExtractedDocument:
    fields: dict[str, ExtractedField] = {}
    default_conf = Decimal(str(data.get("confidence", 0.90)))

    field_mappings = {
        "supplier_name": data.get("fornecedor_nome"),
        "supplier_document": data.get("fornecedor_documento"),
        "document_number": str(data.get("numero_documento")) if data.get("numero_documento") is not None else None,
        "issue_date": data.get("data_emissao"),
        "gross_amount": f"{Decimal(str(data['valor_bruto'])):.2f}" if data.get("valor_bruto") is not None else None,
        "net_amount": f"{Decimal(str(data['valor_liquido'])):.2f}" if data.get("valor_liquido") is not None else None,
        "description": data.get("descricao"),
    }

    for name, val in field_mappings.items():
        if val is not None and str(val).strip():
            fields[name] = ExtractedField(
                field_name=name,
                field_value=str(val).strip(),
                source_locator={"page": 1},
                confidence=default_conf,
            )

    return ExtractedDocument(
        file_id=file_id,
        document_type=document_type,
        model_version=model_version,
        fields=fields,
        raw_response=data,
    )


class GeminiOcrProvider(OcrProvider):
    def __init__(self, model_name: str = "gemini-1.5-pro", api_key: Optional[str] = None):
        self.model_name = model_name
        self.api_key = api_key

    async def extract(self, request: OcrRequest) -> ExtractedDocument:
        # Implementação real de chamada a Gemini quando configurada
        return ExtractedDocument(
            file_id=request.file_id,
            document_type=request.document_type,
            model_version=self.model_name,
            fields={},
        )

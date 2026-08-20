from abc import ABC, abstractmethod
from typing import Optional

from backend.domain.extracted_evidence import ExtractedDocument, ExtractedField, OcrRequest


class OcrProvider(ABC):
    @abstractmethod
    async def extract(self, request: OcrRequest) -> ExtractedDocument:
        """Extrai campos fiscais estruturados de um arquivo."""
        raise NotImplementedError


class FakeOcrProvider(OcrProvider):
    def __init__(self, model_version: str = "fake-ocr-v1", default_fields: Optional[dict[str, ExtractedField]] = None):
        self.model_version = model_version
        self.default_fields = default_fields or {}

    async def extract(self, request: OcrRequest) -> ExtractedDocument:
        return ExtractedDocument(
            file_id=request.file_id,
            document_type=request.document_type,
            model_version=self.model_version,
            fields=self.default_fields,
            raw_response={"mock": True},
        )

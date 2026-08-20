from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any, Optional


@dataclass(frozen=True)
class OcrRequest:
    file_id: str
    content: bytes
    document_type: str
    pages: Optional[list[int]] = None


@dataclass(frozen=True)
class ExtractedField:
    field_name: str
    field_value: str
    source_locator: dict[str, Any] = field(default_factory=dict)
    confidence: Decimal = Decimal("1.0000")


@dataclass(frozen=True)
class ExtractedDocument:
    file_id: str
    document_type: str
    model_version: str
    fields: dict[str, ExtractedField] = field(default_factory=dict)
    raw_response: Optional[dict[str, Any]] = None

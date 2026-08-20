from dataclasses import dataclass, field
from decimal import Decimal
from typing import Literal, Optional

DocumentType = Literal[
    "INVOICE",
    "PAYMENT_PROOF",
    "CONTRACT",
    "TAX_RECEIPT",
    "BANK_STATEMENT",
    "COMPLEMENTARY",
    "UNKNOWN",
]

ClassificationMethod = Literal["DETERMINISTIC", "OCR", "MANUAL"]


@dataclass(frozen=True)
class DocumentInput:
    name: str
    relative_path: str = ""
    text: str = ""
    browser_mime: Optional[str] = None


@dataclass(frozen=True)
class ClassificationResult:
    document_type: DocumentType
    method: ClassificationMethod
    confidence: Decimal
    matched_rules: tuple[str, ...] = field(default_factory=tuple)

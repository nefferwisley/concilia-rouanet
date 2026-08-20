from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Optional


class UnsupportedRegulatoryPackage(Exception):
    pass


@dataclass(frozen=True)
class ReconciliationContext:
    valor_declarado: Optional[float] = None
    rubrica: Optional[str] = None
    tem_contrato: bool = False


@dataclass(frozen=True)
class EvidenceRequirement:
    kind: str  # e.g. "FISCAL_DOCUMENT", "PAYMENT_PROOF", "CONTRACT"
    mandatory: bool = True
    description: str = ""


@dataclass(frozen=True)
class RegulatoryIssue:
    issue_code: str
    severity: str  # "BLOCKER", "WARNING", "INFO"
    description: str


class RegulatoryPackage(ABC):
    @abstractmethod
    def requirements(self, context: ReconciliationContext) -> tuple[EvidenceRequirement, ...]:
        raise NotImplementedError

    @abstractmethod
    def validate(self, context: ReconciliationContext) -> tuple[RegulatoryIssue, ...]:
        raise NotImplementedError


def get_regulatory_package(package_name: str, version: str = "1") -> RegulatoryPackage:
    name_clean = package_name.strip().upper()
    version_clean = version.strip()

    if name_clean == "ROUANET" and version_clean == "1":
        from backend.regulatory.rouanet_v1 import RouanetV1Package

        return RouanetV1Package()

    if name_clean == "FSA_ANCINE" and version_clean == "1":
        from backend.regulatory.fsa_ancine_v1 import FsaAncineV1Package

        return FsaAncineV1Package()

    raise UnsupportedRegulatoryPackage(
        f"Pacote regulatório '{package_name}' versão '{version}' não suportado."
    )

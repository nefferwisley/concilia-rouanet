import pytest
from backend.regulatory.base import (
    EvidenceRequirement,
    ReconciliationContext,
    UnsupportedRegulatoryPackage,
    get_regulatory_package,
)


def test_fsa_payment_requires_fiscal_document_and_payment_proof():
    package = get_regulatory_package("FSA_ANCINE", "1")
    reqs = package.requirements(
        ReconciliationContext(
            valor_declarado=1500.0,
            rubrica="Direção",
        )
    )
    kinds = {r.kind for r in reqs}
    assert {"FISCAL_DOCUMENT", "PAYMENT_PROOF"}.issubset(kinds)


def test_rouanet_requires_fiscal_document_and_payment_proof():
    package = get_regulatory_package("ROUANET", "1")
    reqs = package.requirements(
        ReconciliationContext(
            valor_declarado=2000.0,
            rubrica="Cenografia",
        )
    )
    kinds = {r.kind for r in reqs}
    assert {"FISCAL_DOCUMENT", "PAYMENT_PROOF"}.issubset(kinds)


def test_unknown_package_or_version_fails_closed():
    with pytest.raises(UnsupportedRegulatoryPackage):
        get_regulatory_package("ROUANET", "999")

    with pytest.raises(UnsupportedRegulatoryPackage):
        get_regulatory_package("UNKNOWN_LAW", "1")

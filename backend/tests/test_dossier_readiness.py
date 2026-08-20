import pytest
from backend.domain.dossier import BlockItem, DossierContext, evaluate_dossier_readiness


def test_open_required_document_issue_blocks_dossier():
    ctx = DossierContext(
        project_id="p1",
        package_name="ROUANET",
        package_version="1",
        total_reconciliations=10,
        approved_reconciliations=10,
        open_issues=[
            BlockItem(
                issue_code="MISSING_PAYMENT_PROOF",
                severity="BLOCKER",
                description="Comprovante de pagamento bancário ausente",
            )
        ],
    )

    result = evaluate_dossier_readiness(ctx)

    assert result.ready is False
    assert len(result.blockers) == 1
    assert result.blockers[0].issue_code == "MISSING_PAYMENT_PROOF"


def test_ocr_error_is_reported_as_blocker_not_document_absence():
    ctx = DossierContext(
        project_id="p1",
        package_name="ROUANET",
        package_version="1",
        total_reconciliations=5,
        approved_reconciliations=5,
        open_issues=[
            BlockItem(
                issue_code="OCR_FAILED",
                severity="BLOCKER",
                description="Falha na leitura óptica do arquivo",
            )
        ],
    )

    result = evaluate_dossier_readiness(ctx)

    assert result.ready is False
    assert result.blockers[0].issue_code == "OCR_FAILED"


def test_all_approved_and_no_blockers_is_ready():
    ctx = DossierContext(
        project_id="p1",
        package_name="ROUANET",
        package_version="1",
        total_reconciliations=5,
        approved_reconciliations=5,
        open_issues=[],
    )

    result = evaluate_dossier_readiness(ctx)

    assert result.ready is True
    assert len(result.blockers) == 0

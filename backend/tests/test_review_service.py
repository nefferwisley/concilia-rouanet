from decimal import Decimal
import pytest
from backend.domain.review import (
    ReviewAction,
    ReviewCommand,
    ReviewConflictError,
    ReviewValidationError,
    validate_review_command,
)


def test_reject_and_replace_require_non_empty_reason():
    cmd = ReviewCommand(
        reconciliation_id="rec-1",
        action="REJECT",
        reason="",
        expected_version=1,
        idempotency_key="idem-1",
        actor_id="user-1",
    )
    with pytest.raises(ReviewValidationError):
        validate_review_command(cmd)


def test_valid_approval_passes_validation():
    cmd = ReviewCommand(
        reconciliation_id="rec-1",
        action="APPROVE",
        reason="",
        expected_version=1,
        idempotency_key="idem-1",
        actor_id="user-1",
    )
    # Deve passar sem erro
    validate_review_command(cmd)


def test_replace_requires_evidence_link_id():
    cmd = ReviewCommand(
        reconciliation_id="rec-1",
        action="REPLACE",
        evidence_link_id=None,
        reason="Substituindo por nota correta",
        expected_version=1,
        idempotency_key="idem-1",
        actor_id="user-1",
    )
    with pytest.raises(ReviewValidationError):
        validate_review_command(cmd)

from dataclasses import dataclass
from typing import Literal, Optional

ReviewAction = Literal["APPROVE", "REJECT", "REPLACE", "CORRECT"]


class ReviewValidationError(Exception):
    pass


class ReviewConflictError(Exception):
    pass


@dataclass(frozen=True)
class ReviewCommand:
    reconciliation_id: str
    action: ReviewAction
    reason: str
    expected_version: int
    idempotency_key: str
    actor_id: str
    evidence_link_id: Optional[str] = None


@dataclass(frozen=True)
class ReviewResult:
    decision_id: str
    reconciliation_id: str
    action: ReviewAction
    new_status: str
    new_version: int


def validate_review_command(cmd: ReviewCommand) -> None:
    if cmd.action in ("REJECT", "REPLACE", "CORRECT") and not cmd.reason.strip():
        raise ReviewValidationError(f"A ação {cmd.action} exige uma justificativa válida.")

    if cmd.action == "REPLACE" and not cmd.evidence_link_id:
        raise ReviewValidationError("A ação REPLACE exige a identificação do link de evidência a ser substituído.")

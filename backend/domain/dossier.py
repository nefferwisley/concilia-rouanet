from dataclasses import dataclass, field
from typing import List, Literal, Optional


@dataclass(frozen=True)
class BlockItem:
    issue_code: str
    severity: Literal["BLOCKER", "WARNING", "INFO"]
    description: str


@dataclass(frozen=True)
class DossierContext:
    project_id: str
    package_name: str
    package_version: str
    total_reconciliations: int
    approved_reconciliations: int
    open_issues: list[BlockItem] = field(default_factory=list)


@dataclass(frozen=True)
class DossierReadiness:
    ready: bool
    project_id: str
    package_name: str
    package_version: str
    total_reconciliations: int
    approved_reconciliations: int
    blockers: tuple[BlockItem, ...] = field(default_factory=tuple)


def evaluate_dossier_readiness(context: DossierContext) -> DossierReadiness:
    blockers: List[BlockItem] = []

    # 1. Checa pendências com severidade BLOCKER
    for issue in context.open_issues:
        if issue.severity == "BLOCKER":
            blockers.append(issue)

    # 2. Checa se existem conciliações pendentes de aprovação humana
    if context.approved_reconciliations < context.total_reconciliations:
        blockers.append(
            BlockItem(
                issue_code="UNAPPROVED_RECONCILIATIONS",
                severity="BLOCKER",
                description=f"Existem {context.total_reconciliations - context.approved_reconciliations} lançamentos pendentes de aprovação humana.",
            )
        )

    is_ready = len(blockers) == 0

    return DossierReadiness(
        ready=is_ready,
        project_id=context.project_id,
        package_name=context.package_name,
        package_version=context.package_version,
        total_reconciliations=context.total_reconciliations,
        approved_reconciliations=context.approved_reconciliations,
        blockers=tuple(blockers),
    )

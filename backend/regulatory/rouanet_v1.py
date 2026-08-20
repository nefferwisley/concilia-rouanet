from backend.regulatory.base import (
    EvidenceRequirement,
    ReconciliationContext,
    RegulatoryIssue,
    RegulatoryPackage,
)


class RouanetV1Package(RegulatoryPackage):
    def requirements(self, context: ReconciliationContext) -> tuple[EvidenceRequirement, ...]:
        reqs = [
            EvidenceRequirement(
                kind="FISCAL_DOCUMENT",
                mandatory=True,
                description="Nota Fiscal ou Recibo de Pagamento a Autônomo emitido dentro do período de execução.",
            ),
            EvidenceRequirement(
                kind="PAYMENT_PROOF",
                mandatory=True,
                description="Comprovante de pagamento bancário (PIX, TED, débito) vinculado à conta do projeto.",
            ),
        ]
        if context.valor_declarado and context.valor_declarado >= 10000.0:
            reqs.append(
                EvidenceRequirement(
                    kind="CONTRACT",
                    mandatory=False,
                    description="Contrato de prestação de serviços para pagamentos de valor elevado.",
                )
            )
        return tuple(reqs)

    def validate(self, context: ReconciliationContext) -> tuple[RegulatoryIssue, ...]:
        issues = []
        if not context.rubrica:
            issues.append(
                RegulatoryIssue(
                    issue_code="MISSING_RUBRIC",
                    severity="BLOCKER",
                    description="Lançamento sem rubrica orçamentária associada.",
                )
            )
        return tuple(issues)

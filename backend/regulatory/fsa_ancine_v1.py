from backend.regulatory.base import (
    EvidenceRequirement,
    ReconciliationContext,
    RegulatoryIssue,
    RegulatoryPackage,
)


class FsaAncineV1Package(RegulatoryPackage):
    def requirements(self, context: ReconciliationContext) -> tuple[EvidenceRequirement, ...]:
        reqs = [
            EvidenceRequirement(
                kind="FISCAL_DOCUMENT",
                mandatory=True,
                description="Nota Fiscal Eletrônica com discriminação detalhada dos serviços cinematográficos/audiovisuais.",
            ),
            EvidenceRequirement(
                kind="PAYMENT_PROOF",
                mandatory=True,
                description="Comprovante de transferência bancária originada da conta específica do FSA.",
            ),
        ]
        if context.valor_declarado and context.valor_declarado >= 5000.0:
            reqs.append(
                EvidenceRequirement(
                    kind="CONTRACT",
                    mandatory=True,
                    description="Contrato ou termo de cessão de direitos obrigatório para valores a partir de R$ 5.000,00.",
                )
            )
        return tuple(reqs)

    def validate(self, context: ReconciliationContext) -> tuple[RegulatoryIssue, ...]:
        issues = []
        if context.valor_declarado and context.valor_declarado >= 5000.0 and not context.tem_contrato:
            issues.append(
                RegulatoryIssue(
                    issue_code="MISSING_MANDATORY_CONTRACT",
                    severity="BLOCKER",
                    description="FSA/ANCINE exige contrato formal para pagamentos a partir de R$ 5.000,00.",
                )
            )
        return tuple(issues)

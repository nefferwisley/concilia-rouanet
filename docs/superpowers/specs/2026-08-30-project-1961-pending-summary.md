# Project 1961 Pending Summary Design

## Goal

Restore the mobile financial summary and navigation that make Project 1961 pending evidence visible without changing business data or hiding incomplete reconciliations.

## Approved behavior

- Show four mobile-first KPI cards: approved budget, reconciled amount, pending amount, and bank balance.
- Project 1961 must show R$ 897.759,15 executed, R$ 655.341,36 reconciled across 96 of 178 debits, and R$ 242.417,79 pending across 82 of 178 debits when those are the supplied transaction records.
- A transaction is reconciled only when it has an explicit reconciled status and a linked fiscal document. A document link alone is not enough.
- OCR may suggest and attach a document, but must not set the final reconciliation status automatically.
- Keep one mobile navigation with Painel, Tripartite, Extrato BB, Auditoria, and Mais.
- Preserve existing user changes and do not alter business records to force expected totals.

## Validation

- Unit tests cover strict reconciliation, pending amount/count, and the Project 1961 reference totals.
- Component tests verify that the four summary cards render their labels and counts.
- Type checking and production build must pass.
- A mobile smoke test verifies the cards and the single bottom navigation.

# Project 1961 Pending Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore truthful pending-reconciliation indicators and the canonical mobile navigation for Project 1961.

**Architecture:** Centralize the reconciliation predicate and financial aggregation in `projectFinancialSummary.ts`, then consume that result in `DashboardView.tsx`. Keep OCR document linking separate from final reconciliation state, and remove the duplicate mobile navigation from `App.tsx`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vitest, Vite.

**Spec:** `docs/superpowers/specs/2026-08-30-project-1961-pending-summary.md`

## Global Constraints

- Preserve all pre-existing local changes.
- Do not change imported financial records to manufacture totals.
- A linked document without an explicit reconciled status remains pending.
- OCR linking must not set the final reconciliation status.
- Keep exactly one mobile bottom navigation.

---

### Task 1: Strict reconciliation summary

**Files:**
- Modify: `src/utils/projectFinancialSummary.test.ts`
- Modify: `src/utils/projectFinancialSummary.ts`

**Interfaces:**
- Consumes: `BankTransaction[]`.
- Produces: `calculateProjectFinancialSummary(transactions)` with executed, reconciled, pending amounts and counts.

- [ ] Add failing tests proving status-only and document-only records remain pending, while status plus document is reconciled.
- [ ] Add a failing reference-fixture test with 178 debits, 96 reconciled, R$ 897.759,15 executed, R$ 655.341,36 reconciled, and R$ 242.417,79 pending.
- [ ] Run the focused test and confirm the expected failure.
- [ ] Implement the strict predicate and pending count with the smallest change.
- [ ] Run the focused test and confirm it passes.

### Task 2: Truthful dashboard cards

**Files:**
- Create: `src/components/DashboardView.test.tsx`
- Modify: `src/components/DashboardView.tsx`

**Interfaces:**
- Consumes: `ProjectFinancialSummary` from Task 1.
- Produces: four accessible KPI regions with approved, reconciled, pending, and bank-balance labels.

- [ ] Add a failing component test for the four labels, 96/178 reconciled, and 82 pending.
- [ ] Run the focused component test and confirm the expected failure.
- [ ] Replace the combined executed card with separate reconciled and pending cards in the mobile-first grid while retaining executed context.
- [ ] Reuse the strict predicate for dashboard counts and filters.
- [ ] Run the focused component test and confirm it passes.

### Task 3: Safe OCR linking

**Files:**
- Create: `src/utils/autoLinkTransaction.test.ts`
- Create: `src/utils/autoLinkTransaction.ts`
- Modify: `src/components/DocumentsView.tsx`

**Interfaces:**
- Consumes: a transaction and document identifier after value/date matching.
- Produces: a transaction with the linked document preserved but without a final reconciled status.

- [ ] Add a failing test proving auto-linking cannot create `CONCILIADO` or `Conciliado` state.
- [ ] Run the focused test and confirm the expected failure.
- [ ] Add the pure linking helper and use it in `DocumentsView.tsx`.
- [ ] Update the success message to say that the link awaits validation.
- [ ] Run the focused test and confirm it passes.

### Task 4: Single mobile navigation

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `activeTab`, project alerts, and mobile-menu state.
- Produces: one bottom navigation with Painel, Tripartite, Extrato BB, Auditoria, and Mais.

- [ ] Remove the second duplicated mobile navigation block, preserving the earlier canonical navigation.
- [ ] Confirm the main content retains enough bottom padding for the fixed navigation.
- [ ] Run TypeScript validation.

### Task 5: Full verification

**Files:**
- Update: `docs/superpowers/plans/2026-08-30-project-1961-pending-summary.md`

**Interfaces:**
- Consumes: completed Tasks 1-4.
- Produces: verified local build and recorded results.

- [ ] Run all Vitest tests once.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run the app and perform a mobile browser smoke test of Project 1961.
- [ ] Record actual verification results and residual risks in the final handoff.

## Verification results

- Vitest: 4 files, 8 tests passed.
- TypeScript: `tsc --noEmit` passed.
- Production build: Vite and server bundle completed successfully.
- Mobile smoke test at 390 × 844: all four KPI cards visible.
- Mobile navigation: exactly one `nav`, containing Painel, Tripartite, Extrato BB, Auditoria, and Mais.
- Browser console: no errors during the smoke test.
- Residual data note: the bundled local demo currently marks all 178 debits as reconciled. The restored 96/82 result appears when the site supplies the validated 1961 records; the regression fixture protects those exact totals without rewriting financial records.

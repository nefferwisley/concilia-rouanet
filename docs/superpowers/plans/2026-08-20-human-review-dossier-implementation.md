# Human Review and Dossier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let authorized reviewers resolve evidence links and pending documents with a complete audit trail, then generate a dossier only when regulatory blockers are resolved or justified.

**Architecture:** Review commands use optimistic concurrency and idempotency keys, append immutable audit events, and update the current reconciliation state transactionally. Readiness is calculated by a pure regulatory service; exports use a frozen dossier snapshot so later corrections cannot silently change an already generated package.

**Tech Stack:** FastAPI, asyncpg, PostgreSQL/Supabase, React, TypeScript, Realtime Broadcast, pytest, Vitest, existing export utilities.

**Spec:** `docs/superpowers/specs/2026-08-20-importacao-real-conciliacao-online-design.md`

## Global Constraints

- Requires OCR and Reconciliation Release Gate 3.
- AI suggestions cannot approve themselves.
- Every decision stores actor, timestamp, reason, previous state, new state, rule version, and correlation ID.
- Audit events are append-only.
- A missing document is not equivalent to a failed OCR read.
- Dossier generation must fail closed on unresolved blockers.
- Signed document URLs are short lived and never persisted in browser storage.

---

### Task 1: Review, audit, and dossier snapshot schema

**Files:**
- Create: `db/migrations/0018_human_review_dossier.sql`
- Create: `backend/tests/test_migration_0018_contract.py`

**Interfaces:**
- Consumes: `reconciliations`, `evidence_links`, `issues`, `regulatory_packages`.
- Produces: `review_decisions`, `audit_events`, `dossier_snapshots`, optimistic `version` columns.

- [ ] **Step 1: Write the failing contract test**

```py
from pathlib import Path

SQL = Path("db/migrations/0018_human_review_dossier.sql").read_text(encoding="utf-8").lower()

def test_review_schema_is_append_only_and_versioned():
    assert "create table public.review_decisions" in SQL
    assert "create table public.audit_events" in SQL
    assert "create table public.dossier_snapshots" in SQL
    assert "version bigint" in SQL
    assert "on delete restrict" in SQL
```

- [ ] **Step 2: Verify RED**

Run: `python -m pytest backend/tests/test_migration_0018_contract.py -q`

Expected: FAIL.

- [ ] **Step 3: Implement immutable audit constraints and RLS**

Use JSONB `before_state`/`after_state`, text `reason`, UUID `actor_id`, and `timestamptz`. Revoke `UPDATE` and `DELETE` on `audit_events` from client roles. Index `(project_id, created_at, id)` and all foreign keys. `review_decisions.idempotency_key` is unique per project.

- [ ] **Step 4: Verify GREEN**

Run:

```powershell
python -m pytest backend/tests/test_migration_0018_contract.py -q
```

Expected: PASS. Migration execution is reserved for an isolated integration database.

- [ ] **Step 5: Commit**

```powershell
git add db/migrations/0018_human_review_dossier.sql backend/tests/test_migration_0018_contract.py
git commit -m "feat: add immutable review and dossier records"
```

---

### Task 2: Transactional review command service

**Files:**
- Create: `backend/domain/review.py`
- Create: `backend/services/review_service.py`
- Create: `backend/tests/test_review_service.py`

**Interfaces:**
- Consumes: `ReviewCommand(reconciliation_id, action, evidence_link_id, reason, expected_version, idempotency_key)`.
- Produces: `ReviewResult`; updated current state plus append-only decision/audit rows.

- [ ] **Step 1: Write failing idempotency and concurrency tests**

```py
async def test_duplicate_command_returns_same_result(service, approve_command):
    first = await service.apply(approve_command)
    second = await service.apply(approve_command)
    assert first.decision_id == second.decision_id

async def test_stale_version_is_rejected(service, approve_command):
    approve_command.expected_version = 1
    await service.bump_version(approve_command.reconciliation_id)
    with pytest.raises(ReviewConflict):
        await service.apply(approve_command)
```

- [ ] **Step 2: Verify RED**

Run: `python -m pytest backend/tests/test_review_service.py -q`

Expected: FAIL.

- [ ] **Step 3: Implement approve, reject, replace, and correct commands**

Lock the reconciliation row, compare `expected_version`, validate project membership and evidence ownership, apply the state change, resolve/create issues, append decision and audit event, increment version, and commit once. Require a non-empty reason for reject, replace, correction, or blocker override.

- [ ] **Step 4: Verify GREEN**

Run: `python -m pytest backend/tests/test_review_service.py backend/tests/test_conciliacao_auditoria.py -q`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/domain/review.py backend/services/review_service.py backend/tests/test_review_service.py
git commit -m "feat: apply human review decisions transactionally"
```

---

### Task 3: Review and audit API

**Files:**
- Create: `backend/routes/reviews.py`
- Modify: `backend/routes/reconciliations.py`
- Modify: `backend/main.py`
- Create: `backend/tests/test_review_routes.py`

**Interfaces:**
- Consumes: authenticated `ReviewCommand` JSON and `Idempotency-Key` header.
- Produces: `POST /api/v1/reconciliations/{id}/decisions`; cursor-paginated `GET /api/v1/projects/{id}/audit-events`.

- [ ] **Step 1: Write failing route tests**

Assert missing auth is 401, missing idempotency header is 400, stale version is 409, foreign-project evidence is 404, valid approval is 200, and replay returns the same decision.

- [ ] **Step 2: Verify RED**

Run: `python -m pytest backend/tests/test_review_routes.py -q`

Expected: FAIL.

- [ ] **Step 3: Implement thin routes over the service**

Routes parse/validate input and map domain exceptions to HTTP status; they do not duplicate reconciliation logic. Audit pagination uses `(created_at, id)` cursor and excludes sensitive OCR payloads.

- [ ] **Step 4: Verify GREEN**

Run: `python -m pytest backend/tests/test_review_routes.py -q`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/routes/reviews.py backend/routes/reconciliations.py backend/main.py backend/tests/test_review_routes.py
git commit -m "feat: expose secure human review commands"
```

---

### Task 4: Interactive review actions and live state

**Files:**
- Create: `src/features/reviews/reviewApi.ts`
- Create: `src/features/reviews/ReviewActions.tsx`
- Create: `src/features/reviews/ReviewActions.test.tsx`
- Create: `src/features/reviews/useReviewEvents.ts`
- Modify: `src/features/reconciliations/ReconciliationDetail.tsx`

**Interfaces:**
- Consumes: Task 3 API and private project Broadcast events.
- Produces: approve/reject/replace/correct UI with conflict refresh.

- [ ] **Step 1: Write failing interaction tests**

```tsx
it("requires a reason before rejecting a suggested link", async () => {
  render(<ReviewActions reconciliation={candidate} api={api} />);
  await user.click(screen.getByRole("button", { name: /rejeitar/i }));
  expect(api.decide).not.toHaveBeenCalled();
  expect(screen.getByText(/informe a justificativa/i)).toBeInTheDocument();
});
```

Add a test where the API returns 409 and the component reloads the latest detail instead of overwriting another reviewer.

- [ ] **Step 2: Verify RED**

Run: `npm run test -- --run src/features/reviews`

Expected: FAIL.

- [ ] **Step 3: Implement accessible actions**

Generate one UUID idempotency key per user intent, send `expectedVersion`, disable controls while pending, and show the stored actor/time after success. On a Realtime update, merge by version and refresh detail if the event version is newer.

- [ ] **Step 4: Verify GREEN**

Run:

```powershell
npm run test -- --run src/features/reviews src/features/reconciliations
npm run lint
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/features/reviews src/features/reconciliations/ReconciliationDetail.tsx
git commit -m "feat: review evidence links with live conflict handling"
```

---

### Task 5: Document inventory and pending-document workflow

**Files:**
- Create: `src/features/documents/documentApi.ts`
- Create: `src/features/documents/DocumentInventory.tsx`
- Create: `src/features/documents/DocumentInventory.test.tsx`
- Create: `src/features/issues/IssueList.tsx`
- Create: `src/features/issues/IssueList.test.tsx`
- Modify: `src/App.tsx`
- Modify: `backend/routes/documentos.py`

**Interfaces:**
- Consumes: documents/issues APIs and signed URLs.
- Produces: linked/unlinked document inventory; derived pending list with assignment/status.

- [ ] **Step 1: Write failing truthfulness tests**

```tsx
it("distinguishes unreadable from missing", async () => {
  render(<IssueList projectId="p1" api={apiWithUnreadableDocument} />);
  expect(await screen.findByText(/erro de leitura/i)).toBeInTheDocument();
  expect(screen.queryByText(/documento ausente confirmado/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Verify RED**

Run: `npm run test -- --run src/features/documents src/features/issues`

Expected: FAIL.

- [ ] **Step 3: Implement inventory and issue workflow**

Support filters for type, extraction status, link status, and path. Opening a document requests a fresh signed URL. Issues display requirement code, related launch/document, assigned user, status, and full history. Counts come from API results, never constants.

- [ ] **Step 4: Verify GREEN**

Run:

```powershell
npm run test -- --run src/features/documents src/features/issues
npm run lint
python -m pytest backend/tests/test_documentos_sincronizar_drive.py backend/tests/test_review_routes.py -q
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/features/documents src/features/issues src/App.tsx backend/routes/documentos.py
git commit -m "feat: track linked documents and real pending evidence"
```

---

### Task 6: Pure dossier readiness service

**Files:**
- Create: `backend/domain/dossier.py`
- Create: `backend/services/dossier_readiness.py`
- Create: `backend/tests/test_dossier_readiness.py`

**Interfaces:**
- Consumes: project reconciliations, open issues, package version, approved overrides.
- Produces: `evaluate_readiness(project_id) -> DossierReadiness` with blockers and evidence counts.

- [ ] **Step 1: Write failing fail-closed tests**

```py
def test_open_required_document_issue_blocks_dossier():
    result = evaluate_readiness(project_with_issue("MISSING_PAYMENT_PROOF"))
    assert result.ready is False
    assert result.blockers[0].code == "MISSING_PAYMENT_PROOF"

def test_ocr_error_is_not_counted_as_document_absence():
    result = evaluate_readiness(project_with_issue("OCR_FAILED"))
    assert result.blockers[0].code == "OCR_FAILED"
```

- [ ] **Step 2: Verify RED**

Run: `python -m pytest backend/tests/test_dossier_readiness.py -q`

Expected: FAIL.

- [ ] **Step 3: Implement package-driven readiness**

Readiness is a pure function over immutable inputs. It returns counts by evidence requirement, unresolved blockers, justified overrides, and the regulatory package/version. It never mutates issues or links.

- [ ] **Step 4: Verify GREEN**

Run: `python -m pytest backend/tests/test_dossier_readiness.py backend/tests/test_regulatory_packages.py -q`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/domain/dossier.py backend/services/dossier_readiness.py backend/tests/test_dossier_readiness.py
git commit -m "feat: calculate dossier readiness from real evidence"
```

---

### Task 7: Frozen dossier snapshot and export

**Files:**
- Create: `backend/services/dossier_service.py`
- Create: `backend/routes/dossier.py`
- Modify: `backend/main.py`
- Create: `backend/tests/test_dossier_service.py`
- Create: `src/features/dossier/DossierView.tsx`
- Create: `src/features/dossier/DossierView.test.tsx`
- Modify: `src/utils/exportUtils.ts`

**Interfaces:**
- Consumes: Task 6 readiness plus authorized generation command.
- Produces: `POST /api/v1/projects/{id}/dossiers`; immutable snapshot; downloadable index/export.

- [ ] **Step 1: Write failing generation tests**

Assert 409 when blockers exist, successful snapshot hash when ready, identical replay for the same idempotency key, and a new snapshot after later reviewed data changes.

- [ ] **Step 2: Verify RED**

Run: `python -m pytest backend/tests/test_dossier_service.py -q`

Expected: FAIL.

- [ ] **Step 3: Implement snapshot generation**

Freeze project identity, package/version, reconciliations, evidence links, resolved issues, approved overrides, and audit range into canonical JSON. Hash the canonical bytes with SHA-256 and store the snapshot before export. Generated spreadsheets/PDFs reference the snapshot ID and hash.

- [ ] **Step 4: Implement DossierView**

Show readiness, blockers, last snapshot, and generation action. Disable generation while blocked and link each blocker back to its launch or document.

- [ ] **Step 5: Verify GREEN**

Run:

```powershell
python -m pytest backend/tests/test_dossier_service.py -q
npm run test -- --run src/features/dossier
npm run lint
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add backend/services/dossier_service.py backend/routes/dossier.py backend/main.py backend/tests/test_dossier_service.py src/features/dossier src/utils/exportUtils.ts
git commit -m "feat: generate evidence-backed dossier snapshots"
```

---

### Task 8: Security, audit, and real-project Release Gate 4

**Files:**
- Create: `backend/tests/security/test_project_isolation.py`
- Create: `backend/tests/security/test_storage_rls.py`
- Create: `backend/tests/security/test_audit_immutability.py`
- Modify: `backend/tests/e2e/test_real_project_1961.py`
- Create: `docs/REAL_PROJECT_TEST.md`

**Interfaces:**
- Consumes: all prior plans.
- Produces: final evidence for the functional real-project test.

- [ ] **Step 1: Add security tests**

Prove that one organization cannot list, open, link, review, or export another organization's data; anon cannot access the private bucket; authenticated frontend code cannot call privileged worker operations; audit rows cannot be updated/deleted by client roles.

- [ ] **Step 2: Extend the opt-in real-folder test**

After import processing, assert:

- exactly 211 files are inventoried;
- no production response contains known demo suppliers or seeded Project 1961 IDs;
- every displayed monetary field has a source locator;
- each reconciliation has explicit present/missing/error evidence states;
- reload returns the same project and progress;
- re-import does not increase unique file or movement counts;
- one ambiguous suggestion can be approved and appears in audit history;
- dossier readiness matches the remaining blockers.

- [ ] **Step 3: Run the complete verification suite**

Run:

```powershell
npm run lint
npm run test -- --run
npm run build
python -m pytest backend/tests -q
$env:CONCILIA_REAL_PROJECT_DIR='C:\Users\Dell\Desktop\meu_sistema_rouanet\3. 1961'
python -m pytest backend/tests/e2e/test_real_project_1961.py -m real_project -v
```

Expected: all standard suites pass; the real-project test builds the online data only from the selected folder.

- [ ] **Step 4: Run Supabase advisors against the test project**

Run the current Supabase CLI help first, then the supported advisors command. Fix all security findings and any missing foreign-key/RLS indexes caused by these plans. Record the advisor timestamp and resolved findings in `docs/REAL_PROJECT_TEST.md` without storing credentials.

- [ ] **Step 5: Commit the final gate**

```powershell
git add backend/tests/security backend/tests/e2e/test_real_project_1961.py docs/REAL_PROJECT_TEST.md
git commit -m "test: certify the real project review and dossier flow"
```

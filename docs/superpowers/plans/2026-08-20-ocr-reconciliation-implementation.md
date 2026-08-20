# OCR and Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract auditable document evidence, apply versioned regulatory requirements, build reconciliation candidates, and expose a real launches list with an individual evidence panel.

**Architecture:** A deterministic classifier and parser run first; a versioned OCR provider handles unresolved PDFs and returns schema-validated fields with provenance. A reconciliation service preserves declared, bank, and documentary sources independently, scores candidates, creates explicit issues, and never silently approves an AI-proposed financial link.

**Tech Stack:** FastAPI, Pydantic, asyncpg, PyMuPDF, Gemini structured extraction, PostgreSQL, React, TypeScript, Vitest, pytest.

**Spec:** `docs/superpowers/specs/2026-08-20-importacao-real-conciliacao-online-design.md`

## Global Constraints

- Requires Real Folder Import Release Gate 2.
- Deterministic parsing precedes OCR/AI.
- Every field stores source file, page/row, method, model version, and confidence.
- OCR output is untrusted input and must pass Pydantic validation.
- The launch remains incomplete when required evidence is absent.
- First-release AI links remain suggestions until a human decision.
- Regulatory weights and document requirements are versioned per project.

---

### Task 1: Evidence, regulatory package, and reconciliation schema

**Files:**
- Create: `db/migrations/0017_evidence_reconciliation.sql`
- Create: `backend/tests/test_migration_0017_contract.py`

**Interfaces:**
- Consumes: `declared_entries`, `extrato_movimentos`, `import_files`, `projetos` from prior plans.
- Produces: `regulatory_packages`, `documents`, `document_extraction_runs`, `document_fields`, `reconciliations`, `evidence_links`, and `issues`.

- [ ] **Step 1: Write the failing contract test**

```py
from pathlib import Path

SQL = Path("db/migrations/0017_evidence_reconciliation.sql").read_text(encoding="utf-8").lower()

def test_evidence_tables_keep_provenance_and_tenant_security():
    for table in ("regulatory_packages", "documents", "document_extraction_runs", "document_fields", "reconciliations", "evidence_links", "issues"):
        assert f"create table public.{table}" in SQL
    assert "source_locator jsonb" in SQL
    assert "model_version text" in SQL
    assert "enable row level security" in SQL
```

- [ ] **Step 2: Verify RED**

Run: `python -m pytest backend/tests/test_migration_0017_contract.py -q`

Expected: FAIL.

- [ ] **Step 3: Implement exact financial and provenance types**

Use `numeric(15,2)` for money, `numeric(5,4)` for confidence, `timestamptz` for events, and check constraints for states. Index every foreign key and add:

```sql
create unique index evidence_link_unique_active_idx
  on public.evidence_links (reconciliation_id, evidence_type, evidence_id)
  where revoked_at is null;

create index issues_open_project_idx
  on public.issues (project_id, created_at, id)
  where status = 'OPEN';
```

RLS policies must use indexed project membership and `(select auth.uid())`. Client roles receive only the required table privileges; worker writes use a dedicated backend path, not public `SECURITY DEFINER` functions.

- [ ] **Step 4: Verify GREEN**

Run:

```powershell
python -m pytest backend/tests/test_migration_0017_contract.py -q
```

Expected: PASS. Migration execution is reserved for an isolated integration database.

- [ ] **Step 5: Commit**

```powershell
git add db/migrations/0017_evidence_reconciliation.sql backend/tests/test_migration_0017_contract.py
git commit -m "feat: add auditable evidence and reconciliation schema"
```

---

### Task 2: Deterministic document classification

**Files:**
- Create: `backend/domain/document_types.py`
- Create: `backend/services/document_classifier.py`
- Create: `backend/tests/test_document_classifier.py`

**Interfaces:**
- Consumes: `ImportFile` metadata plus text extracted by PyMuPDF when available.
- Produces: `classify_document(input) -> ClassificationResult` with type, method, confidence, and matched rules.

- [ ] **Step 1: Write failing classification tests**

```py
def test_payment_proof_rule_beats_generic_pdf():
    result = classify_document(DocumentInput(
        name="104 - comprovante pix.pdf",
        relative_path="1. Pagamentos/104 - comprovante pix.pdf",
        text="COMPROVANTE DE PIX valor R$ 1.200,00",
    ))
    assert result.document_type == "PAYMENT_PROOF"
    assert result.method == "DETERMINISTIC"
```

Include tests for invoice, receipt/RPA, contract, bank statement, complementary evidence, and unknown.

- [ ] **Step 2: Verify RED**

Run: `python -m pytest backend/tests/test_document_classifier.py -q`

Expected: FAIL.

- [ ] **Step 3: Implement normalized rule evaluation**

Normalize Unicode/case and combine path, filename, MIME/signature, and text markers. Return `UNKNOWN` when rules conflict or lack evidence; do not call OCR inside this pure classifier.

- [ ] **Step 4: Verify GREEN**

Run: `python -m pytest backend/tests/test_document_classifier.py -q`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/domain/document_types.py backend/services/document_classifier.py backend/tests/test_document_classifier.py
git commit -m "feat: classify project documents deterministically"
```

---

### Task 3: Versioned OCR provider and schema validation

**Files:**
- Create: `backend/domain/extracted_evidence.py`
- Create: `backend/services/ocr_provider.py`
- Create: `backend/services/gemini_ocr_provider.py`
- Modify: `backend/config.py`
- Create: `backend/tests/test_ocr_provider_contract.py`
- Create: `backend/tests/test_gemini_ocr_provider.py`

**Interfaces:**
- Consumes: document bytes, detected type, page selection.
- Produces: `OcrProvider.extract(request) -> ExtractedDocument`; no database writes in the provider.

- [ ] **Step 1: Write the failing provider contract test**

```py
async def test_provider_returns_field_level_provenance(fake_provider, pdf_bytes):
    result = await fake_provider.extract(OcrRequest(file_id="f1", content=pdf_bytes, document_type="INVOICE"))
    assert result.model_version
    assert result.fields["gross_amount"].source_locator["page"] == 1
    assert 0 <= result.fields["gross_amount"].confidence <= 1
```

- [ ] **Step 2: Verify RED**

Run: `python -m pytest backend/tests/test_ocr_provider_contract.py backend/tests/test_gemini_ocr_provider.py -q`

Expected: FAIL.

- [ ] **Step 3: Implement strict models and provider adapter**

Pydantic models must represent supplier name/document, issue date, document number, gross amount, withholdings, net amount, payment date/reference, and description. Each field is optional but, when present, requires confidence and a page locator. Gemini output must be JSON/schema constrained, validated once, and rejected as `OCR_SCHEMA_INVALID` rather than coerced into guessed values.

Add backend-only environment values:

```py
ocr_model: str = ""
ocr_max_pages: int = 20
ocr_timeout_seconds: int = 90
```

The configured model name is recorded with every extraction; tests use a fake transport and never call the cloud.

- [ ] **Step 4: Verify GREEN**

Run:

```powershell
python -m pytest backend/tests/test_ocr_provider_contract.py backend/tests/test_gemini_ocr_provider.py -q
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/domain/extracted_evidence.py backend/services/ocr_provider.py backend/services/gemini_ocr_provider.py backend/config.py backend/tests/test_ocr_provider_contract.py backend/tests/test_gemini_ocr_provider.py
git commit -m "feat: extract schema-validated OCR evidence"
```

---

### Task 4: Persist OCR provenance without destroying prior results

**Files:**
- Create: `backend/services/evidence_repository.py`
- Modify: `backend/workers/import_worker.py`
- Create: `backend/tests/test_evidence_repository.py`
- Modify: `backend/tests/test_import_worker_queue.py`

**Interfaces:**
- Consumes: `ExtractedDocument` from Task 3.
- Produces: immutable extraction run plus current document classification/fields.

- [ ] **Step 1: Write the failing reprocessing test**

```py
async def test_reprocessing_keeps_previous_extraction(repo, extracted_v1, extracted_v2):
    await repo.save(extracted_v1)
    await repo.save(extracted_v2)
    history = await repo.list_runs(extracted_v1.file_id)
    assert [run.model_version for run in history] == ["model-v1", "model-v2"]
```

- [ ] **Step 2: Verify RED**

Run: `python -m pytest backend/tests/test_evidence_repository.py -q`

Expected: FAIL.

- [ ] **Step 3: Implement transactional persistence**

Insert a new extraction run, fields, and processing event in one transaction. Mark the newest successful run as current without updating old field rows. Sanitized OCR excerpts must be bounded in length; full raw model responses belong in protected diagnostic storage only when explicitly enabled.

- [ ] **Step 4: Verify GREEN**

Run: `python -m pytest backend/tests/test_evidence_repository.py backend/tests/test_import_worker_queue.py -q`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/services/evidence_repository.py backend/workers/import_worker.py backend/tests/test_evidence_repository.py backend/tests/test_import_worker_queue.py
git commit -m "feat: retain OCR evidence provenance across retries"
```

---

### Task 5: Versioned Rouanet and FSA/ANCINE requirement packages

**Files:**
- Create: `backend/regulatory/__init__.py`
- Create: `backend/regulatory/base.py`
- Create: `backend/regulatory/rouanet_v1.py`
- Create: `backend/regulatory/fsa_ancine_v1.py`
- Create: `backend/tests/test_regulatory_packages.py`

**Interfaces:**
- Consumes: project package/version and launch context.
- Produces: `RegulatoryPackage.requirements(context) -> tuple[EvidenceRequirement, ...]`; `validate(context) -> tuple[RegulatoryIssue, ...]`.

- [ ] **Step 1: Write failing package tests**

```py
def test_fsa_payment_requires_fiscal_document_and_payment_proof():
    package = get_package("FSA_ANCINE", "1")
    kinds = {r.kind for r in package.requirements(payment_context())}
    assert {"FISCAL_DOCUMENT", "PAYMENT_PROOF"}.issubset(kinds)

def test_unknown_version_fails_closed():
    with pytest.raises(UnsupportedRegulatoryPackage):
        get_package("ROUANET", "999")
```

- [ ] **Step 2: Verify RED**

Run: `python -m pytest backend/tests/test_regulatory_packages.py -q`

Expected: FAIL.

- [ ] **Step 3: Implement the shared interface and initial packages**

Rules must be data-driven where practical and return machine-readable requirement codes. Do not encode uncertain legal interpretation as automatic rejection; create a `REVIEW_REQUIRED` issue with the rule/version. Keep document presence requirements separate from value/date/name matching.

- [ ] **Step 4: Verify GREEN**

Run: `python -m pytest backend/tests/test_regulatory_packages.py backend/tests/test_regras_minc_tripartite.py -q`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/regulatory backend/tests/test_regulatory_packages.py
git commit -m "feat: version Rouanet and FSA evidence requirements"
```

---

### Task 6: Deterministic and probabilistic reconciliation service

**Files:**
- Create: `backend/domain/reconciliation.py`
- Create: `backend/services/reconciliation_engine.py`
- Modify: `backend/services/conciliacao_service.py`
- Create: `backend/tests/test_reconciliation_engine.py`
- Modify: `backend/tests/test_conciliacao_service.py`

**Interfaces:**
- Consumes: declared entries, bank movements, documents, package requirements.
- Produces: `build_candidates(context) -> list[MatchCandidate]`; `reconcile_project(project_id) -> ReconciliationRunSummary`.

- [ ] **Step 1: Write failing scoring and ambiguity tests**

```py
def test_exact_value_date_and_document_produce_high_candidate():
    candidate = score_candidate(declared(), bank(), fiscal_document())
    assert candidate.score >= Decimal("0.9000")
    assert candidate.decision == "HUMAN_CONFIRMATION_REQUIRED"

def test_equal_candidates_are_ambiguous():
    result = rank_candidates([candidate("a", "0.90"), candidate("b", "0.90")])
    assert result.status == "AMBIGUOUS"
```

- [ ] **Step 2: Verify RED**

Run: `python -m pytest backend/tests/test_reconciliation_engine.py -q`

Expected: FAIL.

- [ ] **Step 3: Implement ordered matching**

Normalize first, then exact identifiers, then weighted candidates: value 40%, date 20%, name/document 25%, document reference 10%, tax consistency 5%. Persist score components and package version. Never mutate source records and never mark the link approved. Generate one issue per unmet regulatory requirement or conflict.

- [ ] **Step 4: Verify GREEN and regression**

Run:

```powershell
python -m pytest backend/tests/test_reconciliation_engine.py backend/tests/test_conciliacao_service.py backend/tests/test_divergencias.py -q
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/domain/reconciliation.py backend/services/reconciliation_engine.py backend/services/conciliacao_service.py backend/tests/test_reconciliation_engine.py backend/tests/test_conciliacao_service.py
git commit -m "feat: reconcile declared bank and document evidence"
```

---

### Task 7: Cursor-paginated launches and protected document API

**Files:**
- Create: `backend/routes/reconciliations.py`
- Modify: `backend/main.py`
- Create: `backend/tests/test_reconciliation_routes.py`

**Interfaces:**
- Consumes: authenticated project membership.
- Produces: `GET /api/v1/projects/{id}/reconciliations?after=&limit=`; `GET /api/v1/reconciliations/{id}`; `GET /api/v1/documents/{id}/signed-url`.

- [ ] **Step 1: Write failing API tests**

Assert 401 without a token, 404 across tenant boundaries, stable keyset ordering by `(created_at, id)`, and a short-lived URL only for authorized project members.

- [ ] **Step 2: Verify RED**

Run: `python -m pytest backend/tests/test_reconciliation_routes.py -q`

Expected: FAIL.

- [ ] **Step 3: Implement DTOs and keyset queries**

The list response must include counts and summaries only; the detail endpoint returns sources, links, issues, and provenance. Do not include raw OCR text in list responses. Use a `(created_at, id)` cursor, not `OFFSET`.

- [ ] **Step 4: Verify GREEN**

Run: `python -m pytest backend/tests/test_reconciliation_routes.py -q`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/routes/reconciliations.py backend/main.py backend/tests/test_reconciliation_routes.py
git commit -m "feat: expose protected reconciliation evidence APIs"
```

---

### Task 8: Real launches list and individual evidence panel

**Files:**
- Create: `src/features/reconciliations/reconciliationTypes.ts`
- Create: `src/features/reconciliations/reconciliationApi.ts`
- Create: `src/features/reconciliations/useReconciliations.ts`
- Create: `src/features/reconciliations/ReconciliationList.tsx`
- Create: `src/features/reconciliations/ReconciliationDetail.tsx`
- Create: `src/features/reconciliations/ReconciliationList.test.tsx`
- Create: `src/features/reconciliations/ReconciliationDetail.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: Task 7 endpoints.
- Produces: searchable/filterable launches list and synchronized individual detail.

- [ ] **Step 1: Write failing list and detail tests**

```tsx
it("shows an explicit empty result without demo rows", async () => {
  render(<ReconciliationList projectId="p1" api={emptyApi} />);
  expect(await screen.findByText(/nenhum lançamento criado/i)).toBeInTheDocument();
  expect(screen.queryByText(/Luz & Cena/)).not.toBeInTheDocument();
});

it("shows every required evidence slot", async () => {
  render(<ReconciliationDetail reconciliationId="r1" api={detailApi} />);
  expect(await screen.findByText(/planilha-base/i)).toBeInTheDocument();
  expect(screen.getByText(/extrato bancário/i)).toBeInTheDocument();
  expect(screen.getByText(/documento fiscal/i)).toBeInTheDocument();
  expect(screen.getByText(/comprovante de pagamento/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Verify RED**

Run: `npm run test -- --run src/features/reconciliations`

Expected: FAIL.

- [ ] **Step 3: Implement list, filters, and synchronized detail**

Use API pagination, debounced search, status/document filters, and a selected reconciliation ID. Show “Não encontrado” for absent evidence, not a generated value. Each field displays source and confidence. Document links are requested on click and expire; never persist signed URLs in localStorage.

- [ ] **Step 4: Verify GREEN and Release Gate 3**

Run:

```powershell
npm run test -- --run src/features/reconciliations
npm run lint
npm run build
python -m pytest backend/tests/test_reconciliation_routes.py backend/tests/test_reconciliation_engine.py -q
```

Expected: PASS; a project with no derived records shows zero real rows, and an imported project shows only sourced records.

- [ ] **Step 5: Commit**

```powershell
git add src/features/reconciliations src/App.tsx
git commit -m "feat: review real launches with source evidence"
```

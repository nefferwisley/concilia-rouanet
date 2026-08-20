# Real Folder Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upload a selected folder into private storage, persist a 211-file manifest, detect the disguised workbook, import declared rows and bank movements, and stream truthful progress.

**Architecture:** The browser builds a metadata manifest and uploads files to a project-scoped private bucket. FastAPI finalizes the manifest and enqueues independent PostgreSQL jobs; a persistent worker claims jobs with `FOR UPDATE SKIP LOCKED`, detects actual file formats, parses structured sources, and publishes progress through database-backed Realtime events.

**Tech Stack:** React, TypeScript, Supabase Storage, `tus-js-client`, FastAPI, asyncpg, PostgreSQL, openpyxl, PyMuPDF, existing `motor` parsers, pytest, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-20-importacao-real-conciliacao-online-design.md`

## Global Constraints

- Requires the Online Foundation plan and Release Gate 1.
- Preserve every selected file's original name and relative path.
- Detect actual formats by magic bytes/content, never extension alone.
- Store SHA-256 and enforce `(project_id, sha256)` idempotency.
- A failed file must not cancel its import batch.
- Worker state must survive browser/backend restarts.
- Never commit real uploaded files or extracted Project 1961 data.

---

### Task 1: Persistent import, file, and job schema

**Files:**
- Create: `db/migrations/0016_real_import_pipeline.sql`
- Create: `backend/tests/test_migration_0016_contract.py`

**Interfaces:**
- Consumes: `projetos`, `membros_projeto`, `importacoes`, `documentos_projeto`.
- Produces: `import_files`, `source_sheets`, `declared_entries`, private `processing_jobs`, public `processing_events`, and extended import status fields.

- [ ] **Step 1: Write the failing schema contract test**

```py
from pathlib import Path

SQL = Path("db/migrations/0016_real_import_pipeline.sql").read_text(encoding="utf-8").lower()

def test_import_files_are_idempotent_and_rls_protected():
    assert "create table public.import_files" in SQL
    assert "unique (projeto_id, sha256)" in SQL
    assert "alter table public.import_files enable row level security" in SQL
    assert "create table private.processing_jobs" in SQL
    assert "create table public.processing_events" in SQL
    assert "create table public.source_sheets" in SQL
    assert "create table public.declared_entries" in SQL
```

- [ ] **Step 2: Verify RED**

Run: `python -m pytest backend/tests/test_migration_0016_contract.py -q`

Expected: FAIL because the migration does not exist.

- [ ] **Step 3: Implement the schema**

Use these columns and constraints:

```sql
create table public.import_files (
  id uuid primary key default gen_random_uuid(),
  importacao_id uuid not null references public.importacoes(id) on delete cascade,
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  relative_path text not null,
  original_name text not null,
  storage_key text not null unique,
  browser_mime text,
  detected_type text,
  size_bytes bigint not null check (size_bytes >= 0),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  status text not null default 'RECEIVING',
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (projeto_id, sha256)
);
```

`source_sheets` must retain file, sheet name, header row, detected column map, confidence, and confirmation state. `declared_entries` must retain project, sheet, physical row, declared values, cell locators, and status `DECLARED`; add a unique constraint on `(source_sheet_id, row_number)`. `private.processing_jobs` must include `file_id`, `job_type`, `status`, `attempts`, `max_attempts`, `available_at`, `locked_by`, `locked_at`, `error_code`, and timestamps. Add composite/partial indexes for pending-job claims and project file queries. Apply RLS to client-visible tables and revoke access to `private.processing_jobs` from `PUBLIC`, `anon`, and `authenticated`.

- [ ] **Step 4: Verify GREEN**

Run:

```powershell
python -m pytest backend/tests/test_migration_0016_contract.py -q
```

Expected: PASS. Migration execution is reserved for an isolated integration database.

- [ ] **Step 5: Commit**

```powershell
git add db/migrations/0016_real_import_pipeline.sql backend/tests/test_migration_0016_contract.py
git commit -m "feat: add persistent real import pipeline schema"
```

---

### Task 2: Browser folder manifest and content hashes

**Files:**
- Create: `src/features/import/importTypes.ts`
- Create: `src/features/import/buildManifest.ts`
- Create: `src/features/import/buildManifest.test.ts`
- Modify: `src/components/DriveFolderImportModal.tsx`

**Interfaces:**
- Consumes: browser `File[]` with optional `webkitRelativePath`.
- Produces: `buildManifest(files): Promise<PreparedImportFile[]>` where each item retains its `File` plus normalized metadata and SHA-256.

- [ ] **Step 1: Write the failing manifest test**

```ts
import { describe, expect, it } from "vitest";
import { buildManifest } from "./buildManifest";

it("keeps relative paths and stable hashes", async () => {
  const file = new File(["abc"], "nota.pdf", { type: "application/pdf" });
  Object.defineProperty(file, "webkitRelativePath", { value: "Projeto/1. Pagamentos/nota.pdf" });
  const [item] = await buildManifest([file]);
  expect(item.relativePath).toBe("Projeto/1. Pagamentos/nota.pdf");
  expect(item.sha256).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});
```

- [ ] **Step 2: Verify RED**

Run: `npm run test -- --run src/features/import/buildManifest.test.ts`

Expected: FAIL because `buildManifest` is missing.

- [ ] **Step 3: Implement manifest creation**

```ts
export type PreparedImportFile = {
  file: File;
  relativePath: string;
  originalName: string;
  browserMime: string;
  sizeBytes: number;
  sha256: string;
};
```

Hash with `crypto.subtle.digest("SHA-256", await file.arrayBuffer())`. Normalize separators to `/`, reject traversal segments (`..`), empty names, and duplicate relative paths. Do not base64-encode PDFs or place their contents into React state.

- [ ] **Step 4: Integrate the modal and verify GREEN**

The modal must show file count, total bytes, duplicates, and validation errors before upload. Remove the current `preparedFiles` JSON/base64 request to `/api/gemini/extract-project-files` from the real-folder path.

Run:

```powershell
npm run test -- --run src/features/import/buildManifest.test.ts
npm run lint
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/features/import/importTypes.ts src/features/import/buildManifest.ts src/features/import/buildManifest.test.ts src/components/DriveFolderImportModal.tsx
git commit -m "feat: build auditable browser folder manifests"
```

---

### Task 3: Import manifest API and private upload authorization

**Files:**
- Modify: `backend/models.py`
- Create: `backend/routes/real_imports.py`
- Modify: `backend/main.py`
- Modify: `backend/services/storage_service.py`
- Create: `backend/tests/test_real_import_routes.py`
- Create: `backend/tests/test_storage_authorization.py`

**Interfaces:**
- Consumes: `ImportManifestCreate(project_id, files[])` with authenticated user.
- Produces: `POST /api/v1/projects/{id}/imports`; `POST /api/v1/imports/{id}/files/{file_id}/complete`; private storage keys scoped to the project.

- [ ] **Step 1: Write failing authorization tests**

```py
def test_create_manifest_requires_auth(client):
    response = client.post("/api/v1/projects/fake/imports", json={"files": []})
    assert response.status_code == 401

def test_storage_key_is_project_scoped():
    key = build_storage_key("user-1", "project-1", "a" * 64, "Nota Á.pdf")
    assert key.startswith("user-1/project-1/")
    assert ".." not in key
```

- [ ] **Step 2: Verify RED**

Run: `python -m pytest backend/tests/test_real_import_routes.py backend/tests/test_storage_authorization.py -q`

Expected: FAIL because the route and `build_storage_key` are missing.

- [ ] **Step 3: Implement manifest insertion and upload authorization**

Insert the import and file rows atomically with `INSERT ... ON CONFLICT`. The backend must verify project membership through RLS before returning any upload authorization. Storage keys must be deterministic:

```py
def build_storage_key(user_id: str, project_id: str, sha256: str, original_name: str) -> str:
    safe_name = sanitizar_chave(original_name).replace("/", "_")
    return f"{user_id}/{project_id}/{sha256}/{safe_name}"
```

The browser uploads with its authenticated Supabase session; the bucket remains private. Storage RLS must validate the first two folder segments against `auth.uid()` and project membership. Do not return or log the service-role key.

- [ ] **Step 4: Verify GREEN**

Run:

```powershell
python -m pytest backend/tests/test_real_import_routes.py backend/tests/test_storage_authorization.py backend/tests/test_storage_service.py -q
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/models.py backend/routes/real_imports.py backend/main.py backend/services/storage_service.py backend/tests/test_real_import_routes.py backend/tests/test_storage_authorization.py
git commit -m "feat: authorize project-scoped private imports"
```

---

### Task 4: Resumable upload client and finalize flow

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/features/import/resumableUpload.ts`
- Create: `src/features/import/resumableUpload.test.ts`
- Create: `src/features/import/importApi.ts`
- Modify: `src/components/DriveFolderImportModal.tsx`

**Interfaces:**
- Consumes: `PreparedImportFile[]`, Supabase session, manifest response.
- Produces: `uploadImportFiles(input, onProgress): Promise<void>` and `finalizeImport(importId)`.

- [ ] **Step 1: Pin the resumable upload client**

Run: `npm install --save-exact tus-js-client`

Expected: exact dependency and lockfile update.

- [ ] **Step 2: Write the failing retry/progress test**

Inject an `UploadFactory` so the test does not contact Supabase. Assert that aggregate progress is computed from bytes, not file count, and that a resumed upload does not create a second manifest entry.

```ts
it("reports aggregate byte progress", async () => {
  const seen: number[] = [];
  await uploadImportFiles(fakeInput, (p) => seen.push(p.percent), fakeFactory);
  expect(seen.at(-1)).toBe(100);
});
```

- [ ] **Step 3: Verify RED**

Run: `npm run test -- --run src/features/import/resumableUpload.test.ts`

Expected: FAIL because the upload function is missing.

- [ ] **Step 4: Implement upload and finalize**

Use the Supabase resumable endpoint, `Authorization: Bearer <access_token>`, `x-upsert: false`, and metadata containing the assigned storage key. Limit concurrency to three files. On completion, call the per-file completion endpoint, then finalize the import exactly once with an idempotency key equal to the manifest hash.

- [ ] **Step 5: Verify GREEN**

Run:

```powershell
npm run test -- --run src/features/import/resumableUpload.test.ts
npm run lint
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add package.json package-lock.json src/features/import/resumableUpload.ts src/features/import/resumableUpload.test.ts src/features/import/importApi.ts src/components/DriveFolderImportModal.tsx
git commit -m "feat: upload project folders with resumable progress"
```

---

### Task 5: Worker queue and file signature detection

**Files:**
- Create: `backend/workers/__init__.py`
- Create: `backend/workers/import_worker.py`
- Create: `backend/services/file_signature.py`
- Create: `backend/tests/test_file_signature.py`
- Create: `backend/tests/test_import_worker_queue.py`
- Modify: `backend/main.py`

**Interfaces:**
- Consumes: pending rows in `private.processing_jobs`; bytes from `storage_service.baixar_arquivo`.
- Produces: `detect_file_type(content, name) -> DetectedFileType`; `claim_next_job(conn, worker_id)`; durable file status/events.

- [ ] **Step 1: Write the disguised-workbook failing test**

```py
def test_xlsx_signature_wins_over_csv_extension(xlsx_bytes):
    detected = detect_file_type(xlsx_bytes, "3. 1961.csv")
    assert detected.media_type == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert detected.kind == "WORKBOOK"
```

- [ ] **Step 2: Write the non-blocking claim test**

Assert the SQL contains one atomic `UPDATE ... WHERE id = (SELECT ... FOR UPDATE SKIP LOCKED) RETURNING *` and increments attempts only after a successful claim.

- [ ] **Step 3: Verify RED**

Run: `python -m pytest backend/tests/test_file_signature.py backend/tests/test_import_worker_queue.py -q`

Expected: FAIL.

- [ ] **Step 4: Implement detection and worker lifecycle**

Detect ZIP/OOXML, PDF, OLE/XLS, UTF-8/Latin-1 text, OFX, and CSV. The worker handles one job in a short transaction: claim, release transaction, process outside the lock, then persist success/failure in a second transaction. Retries use `available_at` and a capped exponential delay; exhausting attempts marks only that file `FAILED`.

- [ ] **Step 5: Verify GREEN**

Run: `python -m pytest backend/tests/test_file_signature.py backend/tests/test_import_worker_queue.py -q`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add backend/workers backend/services/file_signature.py backend/tests/test_file_signature.py backend/tests/test_import_worker_queue.py backend/main.py
git commit -m "feat: process import files with a durable worker"
```

---

### Task 6: Discover and import the hand-filled workbook

**Files:**
- Create: `backend/services/workbook_discovery.py`
- Create: `backend/services/declared_entries.py`
- Modify: `backend/dominio/planilha_revisada.py`
- Create: `backend/tests/test_workbook_discovery.py`
- Create: `backend/tests/test_declared_entries.py`

**Interfaces:**
- Consumes: workbook bytes from a detected `WORKBOOK` file.
- Produces: `discover_base_sheet(content) -> SheetCandidate`; `parse_declared_entries(content, candidate) -> list[DeclaredEntry]` with cell provenance.

- [ ] **Step 1: Write a generated six-sheet fixture and failing discovery test**

The fixture must use the real sheet names but synthetic values. Save the workbook to `BytesIO`, then call the service with the filename `3. 1961.csv`.

```py
def test_discovers_conciliacao_sheet_in_mislabeled_workbook(six_sheet_workbook):
    candidate = discover_base_sheet(six_sheet_workbook)
    assert "concilia" in candidate.sheet_name.casefold()
    assert candidate.header_row == 3
```

- [ ] **Step 2: Verify RED**

Run: `python -m pytest backend/tests/test_workbook_discovery.py backend/tests/test_declared_entries.py -q`

Expected: FAIL.

- [ ] **Step 3: Implement discovery and provenance**

Score sheets by normalized header matches for controle, fornecedor, data, valor, and rubrica. Reject total/subtotal rows. `DeclaredEntry` must contain `source_file_id`, `sheet_name`, `row_number`, `value_cell`, `date_cell`, `supplier_cell`, and `rubric_cell`. Store formula text and cached/displayed value separately when both exist.

- [ ] **Step 4: Verify GREEN and existing parser regression**

Run:

```powershell
python -m pytest backend/tests/test_workbook_discovery.py backend/tests/test_declared_entries.py backend/tests/test_planilha.py -q
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/services/workbook_discovery.py backend/services/declared_entries.py backend/dominio/planilha_revisada.py backend/tests/test_workbook_discovery.py backend/tests/test_declared_entries.py
git commit -m "feat: import declared entries from the base workbook"
```

---

### Task 7: Import independent bank movements

**Files:**
- Create: `backend/services/bank_statement_ingestion.py`
- Modify: `motor/parse_extrato_bb.py`
- Modify: `motor/extrato_importer.py`
- Create: `backend/tests/test_bank_statement_ingestion.py`
- Modify: `backend/tests/test_parse_extrato_bb.py`

**Interfaces:**
- Consumes: detected OFX/CSV/workbook/text-PDF bank source.
- Produces: `parse_bank_source(file) -> list[BankMovement]`; idempotent insert into `extrato_movimentos`.

- [ ] **Step 1: Write failing source-independence tests**

Test OFX FITID preservation, CSV debit parsing, PDF text parsing, and a duplicate movement insert. Assert no movement is created from a summary line.

```py
def test_ofx_fitid_is_the_idempotency_key(ofx_file):
    movements = parse_bank_source(ofx_file)
    assert movements[0].bank_id == "FIT-001"
    assert movements[0].source_locator == {"kind": "ofx", "fitid": "FIT-001"}
```

- [ ] **Step 2: Verify RED**

Run: `python -m pytest backend/tests/test_bank_statement_ingestion.py -q`

Expected: FAIL.

- [ ] **Step 3: Implement normalized bank movements**

Use `Decimal`, timezone-neutral bank dates, explicit credit/debit nature, masked account data, and exact source locators. Insert with `ON CONFLICT DO NOTHING`; do not mark a movement reconciled during ingestion.

- [ ] **Step 4: Verify GREEN**

Run:

```powershell
python -m pytest backend/tests/test_bank_statement_ingestion.py backend/tests/test_parse_extrato_bb.py backend/tests/test_extrato_importer.py -q
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/services/bank_statement_ingestion.py motor/parse_extrato_bb.py motor/extrato_importer.py backend/tests/test_bank_statement_ingestion.py backend/tests/test_parse_extrato_bb.py
git commit -m "feat: ingest bank movements as independent evidence"
```

---

### Task 8: Live import progress and Release Gate 2

**Files:**
- Create: `src/features/import/useImportProgress.ts`
- Create: `src/features/import/useImportProgress.test.tsx`
- Create: `src/features/import/ImportProgressPanel.tsx`
- Create: `backend/tests/e2e/test_real_project_1961.py`
- Modify: `src/components/DriveFolderImportModal.tsx`

**Interfaces:**
- Consumes: private Supabase Broadcast topic `project:{project_id}:imports`; REST import status fallback.
- Produces: resumable, reload-safe progress and opt-in real-folder acceptance test.

- [ ] **Step 1: Write the failing hook test**

Mock a Broadcast event and assert a file moves from `EXTRACTING` to `CLASSIFIED` without replacing unrelated files. Simulate channel failure and assert REST polling resumes.

- [ ] **Step 2: Verify RED**

Run: `npm run test -- --run src/features/import/useImportProgress.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement the hook and panel**

Subscribe only after session/project/import IDs exist. Filter events by import ID, unsubscribe on cleanup, and poll `GET /imports/{id}` every five seconds only while Realtime is unavailable. Display received, processed, failed, declared rows, and bank movement counts from the API.

- [ ] **Step 4: Add the opt-in real-folder acceptance test**

The test must be skipped unless `CONCILIA_REAL_PROJECT_DIR` exists. It reads the folder, asserts exactly 211 manifest entries, uploads to an isolated test project, waits by condition rather than fixed sleep, and asserts the disguised workbook plus at least one declared entry and bank movement. It must never compare against old JSON outputs.

- [ ] **Step 5: Run Release Gate 2**

Run:

```powershell
npm run test -- --run
python -m pytest backend/tests -q
$env:CONCILIA_REAL_PROJECT_DIR='C:\Users\Dell\Desktop\meu_sistema_rouanet\3. 1961'
python -m pytest backend/tests/e2e/test_real_project_1961.py -m real_project -v
```

Expected: unit/integration suites pass; opt-in test inventories 211 files and derives real records only from the upload.

- [ ] **Step 6: Commit**

```powershell
git add src/features/import/useImportProgress.ts src/features/import/useImportProgress.test.tsx src/features/import/ImportProgressPanel.tsx src/components/DriveFolderImportModal.tsx backend/tests/e2e/test_real_project_1961.py
git commit -m "test: prove real folder ingestion with live progress"
```

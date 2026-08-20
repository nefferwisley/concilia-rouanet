# Real Project Import Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver an online, evidence-backed reconciliation flow that starts empty and builds project data only from an uploaded folder.

**Architecture:** Keep the existing React/Vite frontend and FastAPI modular monolith. Use Supabase Auth, PostgreSQL, private Storage, and Realtime Broadcast; process files in persistent background workers and use cloud OCR only behind a versioned provider interface.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, FastAPI 0.115, Python 3.11+, asyncpg, PostgreSQL/Supabase, Supabase Storage/Realtime, PyMuPDF, openpyxl, Gemini OCR, pytest, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-20-importacao-real-conciliacao-online-design.md`

## Global Constraints

- The production flow must start with no seeded project, transaction, document, metric, or prior Project 1961 result.
- The selected folder is the only source for the real-project test.
- The hand-filled workbook is declared evidence and must be compared with bank and documentary evidence.
- Detect file type by content signature; `3. 1961.csv` is an XLSX workbook with an incorrect extension.
- Never infer a missing financial value merely to complete the interface.
- Keep files in a private bucket and enforce organization/project access with RLS.
- Keep privileged Supabase keys on the backend only.
- Every extracted field must retain file, page or row, method, model version, and confidence.
- The first release requires human confirmation for AI-proposed financial links.
- Every write endpoint and processing job must be idempotent.
- Do not commit real Project 1961 files, extracted PII, access tokens, or OCR payloads.
- Preserve unrelated uncommitted files already present in the repository.

---

## Delivery Sequence

Implement these plans in order. Each plan ends with a runnable, reviewable vertical slice and is a gate for the next plan.

1. `2026-08-20-online-foundation-implementation.md`
   - authenticated online persistence;
   - genuine empty state;
   - create/list/select a project without mock fallback.

2. `2026-08-20-real-folder-import-implementation.md`
   - folder manifest and private upload;
   - persistent processing queue;
   - file signature detection;
   - planilha-base and bank movement import;
   - live progress.

3. `2026-08-20-ocr-reconciliation-implementation.md`
   - document classification and OCR provenance;
   - regulatory requirements;
   - deterministic/probabilistic links;
   - launches list and individual evidence panel.

4. `2026-08-20-human-review-dossier-implementation.md`
   - approve/reject/replace links;
   - pending-document workflow;
   - immutable audit events;
   - dossier readiness and export;
   - end-to-end acceptance with the real folder.

## Release Gates

- **Gate 1:** A fresh account sees an empty project list, can create one project, reload, and see the same project from PostgreSQL.
- **Gate 2:** Selecting the real folder inventories 211 files, detects the disguised workbook, imports declared rows and bank movements, and survives reload without duplication.
- **Gate 3:** Every displayed launch links to source evidence or an explicit pending reason; no mock record appears.
- **Gate 4:** A reviewer can resolve links, see an audit trail, and produce a dossier only when blockers are resolved or formally justified.

## Final Verification Commands

Run after every plan and once after all plans:

```powershell
npm run lint
npm run test -- --run
npm run build
python -m pytest backend/tests -q
```

The real-folder acceptance test is opt-in and must never upload without explicit local configuration:

```powershell
$env:CONCILIA_REAL_PROJECT_DIR='C:\Users\Dell\Desktop\meu_sistema_rouanet\3. 1961'
python -m pytest backend/tests/e2e/test_real_project_1961.py -m real_project -v
```

# Online Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mock/local-only startup with authenticated PostgreSQL persistence and a genuine empty project state.

**Architecture:** The React app reads projects through the FastAPI API using a Supabase access token. FastAPI validates the JWT, sets the RLS context on its asyncpg transaction, and remains the only business-data API; the browser uses the Supabase client only for Auth and later Realtime/Storage.

**Tech Stack:** React 19, TypeScript, Vite, `@supabase/supabase-js`, Vitest, Testing Library, FastAPI, asyncpg, PostgreSQL/Supabase, pytest.

**Spec:** `docs/superpowers/specs/2026-08-20-importacao-real-conciliacao-online-design.md`

## Global Constraints

- Start with no seeded project or domain data.
- Do not use `src/data/mockData.ts` as a runtime fallback.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` or database credentials to Vite.
- Use publishable/anon credentials only in the browser.
- RLS must combine authentication with project membership.
- Keep existing user changes in unrelated files.

---

### Task 1: Frontend test harness and environment contract

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/test/env.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: Vite `import.meta.env` values.
- Produces: `npm run test`; browser-safe `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_API_URL` contract.

- [ ] **Step 1: Install and pin the test/runtime dependencies**

Run:

```powershell
npm install --save-exact @supabase/supabase-js
npm install --save-dev --save-exact vitest jsdom @testing-library/react @testing-library/jest-dom
```

Expected: exact versions are written to `package.json` and `package-lock.json`.

- [ ] **Step 2: Write the failing environment test**

```ts
// src/test/env.test.ts
import { describe, expect, it } from "vitest";
import { readPublicEnv } from "../config/publicEnv";

describe("readPublicEnv", () => {
  it("rejects a service-role key in browser configuration", () => {
    expect(() => readPublicEnv({
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "service_role.secret",
      VITE_API_URL: "https://api.example.test/api/v1",
    })).toThrow(/privilegiada/i);
  });
});
```

- [ ] **Step 3: Run the test and verify RED**

Run: `npm run test -- --run src/test/env.test.ts`

Expected: FAIL because `src/config/publicEnv.ts` does not exist.

- [ ] **Step 4: Add Vitest configuration and the minimal environment reader**

```ts
// src/config/publicEnv.ts
export type PublicEnv = {
  supabaseUrl: string;
  supabasePublishableKey: string;
  apiUrl: string;
};

export function readPublicEnv(env: Record<string, string | undefined>): PublicEnv {
  const supabaseUrl = env.VITE_SUPABASE_URL?.trim() ?? "";
  const supabasePublishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
  const apiUrl = env.VITE_API_URL?.trim() ?? "http://localhost:8000/api/v1";
  if (/service[_-]?role/i.test(supabasePublishableKey)) {
    throw new Error("Chave privilegiada não pode ser usada no navegador.");
  }
  return { supabaseUrl, supabasePublishableKey, apiUrl };
}
```

Add `"test": "vitest"` to `scripts`, set `test.environment = "jsdom"` in `vite.config.ts`, import `@testing-library/jest-dom/vitest` from `src/test/setup.ts`, and document only the three browser-safe variables in `.env.example`.

- [ ] **Step 5: Run the test and the type checker**

Run:

```powershell
npm run test -- --run src/test/env.test.ts
npm run lint
```

Expected: PASS and no TypeScript errors.

- [ ] **Step 6: Commit**

```powershell
git add package.json package-lock.json vite.config.ts .env.example src/config/publicEnv.ts src/test/setup.ts src/test/env.test.ts
git commit -m "test: establish browser configuration contract"
```

---

### Task 2: Supabase session boundary

**Files:**
- Create: `src/services/supabaseClient.ts`
- Create: `src/hooks/useSession.ts`
- Create: `src/components/AuthGate.tsx`
- Create: `src/components/AuthGate.test.tsx`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `readPublicEnv(import.meta.env)`.
- Produces: `supabase`; `useSession(): { session: Session | null; loading: boolean }`; `AuthGate` that renders authenticated children.

- [ ] **Step 1: Write the failing AuthGate test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthGate } from "./AuthGate";

vi.mock("../hooks/useSession", () => ({
  useSession: () => ({ session: null, loading: false }),
}));

describe("AuthGate", () => {
  it("does not render project data without a session", () => {
    render(<AuthGate><div>dados privados</div></AuthGate>);
    expect(screen.queryByText("dados privados")).not.toBeInTheDocument();
    expect(screen.getByText(/entrar/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Verify RED**

Run: `npm run test -- --run src/components/AuthGate.test.tsx`

Expected: FAIL because `AuthGate` is missing.

- [ ] **Step 3: Implement the client, hook, and gate**

```ts
// src/services/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";
import { readPublicEnv } from "../config/publicEnv";

const env = readPublicEnv(import.meta.env);
export const supabase = createClient(env.supabaseUrl, env.supabasePublishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
```

`useSession` must call `supabase.auth.getSession()` once, subscribe with `onAuthStateChange`, and unsubscribe on cleanup. `AuthGate` must expose a simple email sign-in form and never contain development credentials or call `/dev/demo-login` outside `import.meta.env.DEV`.

- [ ] **Step 4: Verify GREEN**

Run:

```powershell
npm run test -- --run src/components/AuthGate.test.tsx
npm run lint
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/services/supabaseClient.ts src/hooks/useSession.ts src/components/AuthGate.tsx src/components/AuthGate.test.tsx src/main.tsx
git commit -m "feat: add authenticated application boundary"
```

---

### Task 3: Empty online project repository

**Files:**
- Create: `src/features/projects/projectTypes.ts`
- Create: `src/features/projects/projectApi.ts`
- Create: `src/features/projects/useProjects.ts`
- Create: `src/features/projects/useProjects.test.tsx`
- Modify: `src/services/apiClient.ts`

**Interfaces:**
- Consumes: Supabase `Session.access_token`; FastAPI `GET/POST /api/v1/projetos`.
- Produces: `OnlineProject`; `listProjects(token): Promise<OnlineProject[]>`; `createProject(token, input): Promise<OnlineProject>`; `useProjects()`.

- [ ] **Step 1: Write the failing repository test**

```tsx
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useProjects } from "./useProjects";

vi.mock("./projectApi", () => ({ listProjects: vi.fn().mockResolvedValue([]) }));
vi.mock("../../hooks/useSession", () => ({
  useSession: () => ({ session: { access_token: "token" }, loading: false }),
}));

it("keeps a fresh account empty", async () => {
  const { result } = renderHook(() => useProjects());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.projects).toEqual([]);
  expect(result.current.activeProject).toBeNull();
});
```

- [ ] **Step 2: Verify RED**

Run: `npm run test -- --run src/features/projects/useProjects.test.tsx`

Expected: FAIL because the hook does not exist.

- [ ] **Step 3: Implement strict API errors and project mapping**

```ts
export type OnlineProject = {
  id: string;
  identifier: string;
  name: string;
  proponent: string;
  regulatoryPackage: "ROUANET" | "FSA_ANCINE";
  status: "EMPTY" | "IMPORTING" | "REVIEW" | "READY";
  createdAt: string;
};
```

`projectApi` must throw a typed `ApiError` on non-2xx responses instead of returning `null`. `useProjects` must initialize with `[]`, preserve `activeProjectId` only as a UI preference, and never hydrate projects from `localStorage` or `mockData`.

- [ ] **Step 4: Verify GREEN**

Run:

```powershell
npm run test -- --run src/features/projects/useProjects.test.tsx
npm run lint
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/features/projects src/services/apiClient.ts
git commit -m "feat: load projects from the authenticated API"
```

---

### Task 4: Regulatory package and project status migration

**Files:**
- Create: `db/migrations/0015_real_import_foundation.sql`
- Create: `backend/tests/test_migration_0015_contract.py`
- Modify: `backend/models.py`
- Modify: `backend/routes/projetos.py`

**Interfaces:**
- Consumes: existing `projetos`, `membros_projeto`, and `criar_projeto_com_membro`.
- Produces: `projetos.pacote_regulatorio`; `projetos.status_processamento`; updated `ProjetoCreate`/`ProjetoOut`.

- [ ] **Step 1: Write the failing migration contract test**

```py
from pathlib import Path

SQL = Path("db/migrations/0015_real_import_foundation.sql").read_text(encoding="utf-8")

def test_project_defaults_are_empty_and_regulatory():
    normalized = " ".join(SQL.lower().split())
    assert "pacote_regulatorio" in normalized
    assert "status_processamento" in normalized
    assert "default 'empty'" in normalized
    assert "enable row level security" in normalized
```

- [ ] **Step 2: Verify RED**

Run: `python -m pytest backend/tests/test_migration_0015_contract.py -q`

Expected: FAIL because the migration is missing.

- [ ] **Step 3: Write the migration and model changes**

The migration must use `text` plus check constraints for package/status, backfill existing rows without inserting new projects, index membership lookups used by RLS, and update the project creation function with explicit `auth.uid()` validation. Use `(select auth.uid())` inside policies and do not grant execution to `PUBLIC` or `anon`.

```sql
alter table public.projetos
  add column if not exists pacote_regulatorio text not null default 'FSA_ANCINE',
  add column if not exists status_processamento text not null default 'EMPTY';

create index if not exists membros_projeto_user_project_idx
  on public.membros_projeto (user_id, projeto_id);
```

Add safe check constraints with guarded `pg_constraint` blocks. Update `ProjetoCreate` to require `pacote_regulatorio` and make financial totals optional rather than defaulting to fabricated values.

- [ ] **Step 4: Verify GREEN and schema safety**

Run:

```powershell
python -m pytest backend/tests/test_migration_0015_contract.py backend/tests/test_endpoints_delete_patch.py -q
```

Expected: PASS. Apply the migration only to the isolated integration database in Task 6; the repository migration runner has no dry-run option.

- [ ] **Step 5: Commit**

```powershell
git add db/migrations/0015_real_import_foundation.sql backend/models.py backend/routes/projetos.py backend/tests/test_migration_0015_contract.py
git commit -m "feat: model empty regulatory projects"
```

---

### Task 5: Replace seeded App state with the online workspace

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/DashboardView.tsx`
- Modify: `src/components/DriveFolderImportModal.tsx`
- Create: `src/components/EmptyProjectState.tsx`
- Create: `src/components/EmptyProjectState.test.tsx`

**Interfaces:**
- Consumes: `useProjects()` from Task 3.
- Produces: empty project screen; project selector based only on API records.

- [ ] **Step 1: Write the failing empty-state test**

```tsx
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { EmptyProjectState } from "./EmptyProjectState";

it("offers import without showing Project 1961 or financial totals", () => {
  render(<EmptyProjectState onCreate={() => undefined} />);
  expect(screen.getByRole("button", { name: /criar primeiro projeto/i })).toBeInTheDocument();
  expect(screen.queryByText(/1961/)).not.toBeInTheDocument();
  expect(screen.queryByText(/835\.000/)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Verify RED**

Run: `npm run test -- --run src/components/EmptyProjectState.test.tsx`

Expected: FAIL because the component is missing.

- [ ] **Step 3: Remove runtime mock and localStorage fallbacks**

Delete imports of `initialProjects`, `initialRubrics`, `initialTransactions`, `initialDocuments`, `initialAlerts`, and `initialTripartiteEntries` from `App.tsx`. Remove `handleActivateProject1961` and its buttons from `DriveFolderImportModal.tsx`. Keep `src/data/mockData.ts` only for Storybook/test fixtures if still referenced outside runtime; otherwise delete it in a later cleanup commit after `rg` confirms no production import.

Render `EmptyProjectState` when `projects.length === 0`. For a created-but-unprocessed project, pass empty arrays and render “Ainda não calculado” rather than falling back to any initial collection.

- [ ] **Step 4: Verify GREEN and scan for production mock imports**

Run:

```powershell
npm run test -- --run src/components/EmptyProjectState.test.tsx
npm run lint
rg -n "initialProjects|handleActivateProject1961" src/App.tsx src/components/DriveFolderImportModal.tsx
```

Expected: tests and lint pass; `rg` returns no matches in the two runtime files.

- [ ] **Step 5: Commit**

```powershell
git add src/App.tsx src/components/DashboardView.tsx src/components/DriveFolderImportModal.tsx src/components/EmptyProjectState.tsx src/components/EmptyProjectState.test.tsx
git commit -m "feat: start real workspaces without demo data"
```

---

### Task 6: Foundation integration gate

**Files:**
- Create: `backend/tests/integration/test_empty_project_lifecycle.py`
- Create: `src/features/projects/projectLifecycle.test.tsx`
- Modify: `docs/DEPLOY_GUIA.md`

**Interfaces:**
- Consumes: Tasks 1-5.
- Produces: evidence for Release Gate 1.

- [ ] **Step 1: Write the backend lifecycle test**

Use an isolated database transaction and a real signed test JWT. Assert: list is empty; create returns status `EMPTY`; a second list returns exactly one project; an unrelated user cannot read it.

```py
def test_new_user_starts_empty_then_sees_only_created_project(api_client, user_token):
    assert api_client.get("/api/v1/projetos", token=user_token).json()["total"] == 0
    created = api_client.post("/api/v1/projetos", token=user_token, json={
        "pronac": "TEST-EMPTY-001",
        "nome": "Projeto vazio",
        "proponente": "Teste",
        "pacote_regulatorio": "FSA_ANCINE",
    })
    assert created.status_code == 201
    assert created.json()["status_processamento"] == "EMPTY"
```

- [ ] **Step 2: Write the frontend reload-persistence test**

Mock only the HTTP boundary, render the project workspace, create a project, unmount, render again, and assert that the selected project comes from the second `GET /api/v1/projetos` response rather than local demo state.

```tsx
it('reloads the created project from the API without demo fallback', async () => {
  server.use(
    http.get('/api/v1/projetos', sequence(
      HttpResponse.json({ total: 0, page: 1, projetos: [] }),
      HttpResponse.json({ total: 1, page: 1, projetos: [createdProject] }),
    )),
    http.post('/api/v1/projetos', () => HttpResponse.json(createdProject, { status: 201 })),
  )

  const first = render(<App />)
  await userEvent.click(await screen.findByRole('button', { name: /novo projeto/i }))
  await completeProjectForm(createdProject)
  first.unmount()

  render(<App />)
  expect(await screen.findByText('Projeto vazio')).toBeInTheDocument()
  expect(screen.queryByText(/Festival de Cinema 2026/i)).not.toBeInTheDocument()
})
```

- [ ] **Step 3: Run the gate and fix only failures in this plan**

Run:

```powershell
python -m pytest backend/tests/integration/test_empty_project_lifecycle.py -q
npm run test -- --run
npm run lint
npm run build
```

Expected: all PASS.

- [ ] **Step 4: Document required environment variables and local startup**

Document frontend public keys separately from backend secrets. State that production must set `APP_ENV=production`, disabling `/dev/demo-login`.

- [ ] **Step 5: Commit the gate**

```powershell
git add backend/tests/integration/test_empty_project_lifecycle.py src/features/projects/projectLifecycle.test.tsx docs/DEPLOY_GUIA.md
git commit -m "test: prove empty online project lifecycle"
```

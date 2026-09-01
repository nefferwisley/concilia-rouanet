# Fundação Online v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o Concilia Rouanet iniciar com estado online verificável e listar projetos reais da API, sem apresentar dados fictícios como produção.

**Architecture:** Uma fronteira de sessão consulta saúde e lista de projetos, classificando em carregando, offline, vazio, pronto ou erro. O demo existe somente com `VITE_DEMO_MODE=true`; produção não usa dados financeiros locais como fallback. A lista usa um contrato próprio e pequeno, sem converter resumo incompleto em `PronacProject`.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, FastAPI, asyncpg.

**Spec:** `docs/superpowers/specs/2026-09-01-online-foundation-v2-design.md`

## Global Constraints

- Tratar a árvore Git como compartilhada: não usar reset, checkout destrutivo ou limpeza ampla.
- Usar `VITE_API_URL` como única origem configurável para chamadas da API e para o health check derivado dela.
- Em produção, não usar `mockData` ou `localStorage` como fallback de dados financeiros, documentos, rubricas, transações ou alertas.
- `VITE_DEMO_MODE` só vale quando seu valor é exatamente `true`; deve ficar visível ao operador.
- Não usar `VITE_GEMINI_API_KEY` nem chamadas diretas ao Gemini/OCR no navegador para dados reais.
- Esta onda cobre conexão, sessão e lista de projetos. Lançamentos, documentos, conciliação, rubricas e exportações ficam fora dela.
- Não instalar dependências novas.

---

## File Structure

- Create: `src/contracts/online.ts` — contrato estável entre API, sessão e interface.
- Create: `src/services/onlineSession.ts` — regras puras dos cinco estados.
- Create: `src/services/onlineSession.test.ts` — testes de sessão.
- Create: `src/services/apiClient.test.ts` — testes de URL/envelope HTTP.
- Create: `src/components/online/OnlineSessionBoundary.tsx` — estados visuais, sem `fetch`.
- Create: `src/components/online/OnlineSessionBoundary.test.tsx` — testes de renderização.
- Modify: `src/services/apiClient.ts` — URL configurável, health derivado e adaptador.
- Modify: `src/App.tsx` — inicia e integra a sessão.
- Modify: `src/components/Navbar.tsx` — somente props de selo demo/seleção online, se necessárias.
- Modify: `backend/routes/projetos.py` — mantém o envelope real de projetos.
- Modify: `backend/tests/test_endpoints_delete_patch.py` — confirmação do endpoint.

## Contract frozen before visual work

```ts
export type OnlineSessionStatus = "loading" | "offline" | "empty" | "ready" | "error";

export interface OnlineProjectSummary {
  id: string; pronac: string; nome: string; transacoesCount: number; criadoEm: string;
}
export interface OnlineProjectList {
  total: number; page: number; projetos: OnlineProjectSummary[];
}
export interface OnlineSessionState {
  status: OnlineSessionStatus;
  projects: OnlineProjectSummary[];
  activeProjectId: string | null;
  message: string | null;
}
export interface OnlineSessionApi {
  checkHealth(): Promise<{ online: boolean; version?: string }>;
  listProjects(): Promise<OnlineProjectList>;
}
export interface OnlineSessionBoundaryProps {
  session: OnlineSessionState; isDemoMode: boolean; onRetry: () => void;
  onSelectProject: (projectId: string) => void; children: React.ReactNode;
}
```

Antigravity pode iniciar o visual somente após esse contrato estar comprometido na branch. Sua propriedade é limitada a arquivos novos em `src/components/online/**`; não pode alterar `App.tsx`, `apiClient.ts`, `src/contracts/**`, `backend/**`, `src/types.ts`, dados, autenticação ou regras de negócio.

### Task 1: Contrato e carregador puro de sessão

**Files:**
- Create: `src/contracts/online.ts`
- Create: `src/services/onlineSession.ts`
- Test: `src/services/onlineSession.test.ts`

**Interfaces:**
- Consumes: `OnlineSessionApi` e `OnlineProjectList` do contrato congelado.
- Produces: `loadOnlineSession(api, preferredProjectId?)` e `chooseActiveProjectId(projects, preferredProjectId?)`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import type { OnlineSessionApi } from "../contracts/online";
import { loadOnlineSession } from "./onlineSession";

const project = { id: "1961", pronac: "19-1961", nome: "Projeto 1961", transacoesCount: 178, criadoEm: "2026-09-01T10:00:00Z" };

describe("loadOnlineSession", () => {
  it("returns ready and keeps the saved project", async () => {
    const api: OnlineSessionApi = { checkHealth: async () => ({ online: true }), listProjects: async () => ({ total: 1, page: 1, projetos: [project] }) };
    await expect(loadOnlineSession(api, "1961")).resolves.toEqual({ status: "ready", projects: [project], activeProjectId: "1961", message: null });
  });
  it("returns empty for a healthy API with no project", async () => {
    const api: OnlineSessionApi = { checkHealth: async () => ({ online: true }), listProjects: async () => ({ total: 0, page: 1, projetos: [] }) };
    await expect(loadOnlineSession(api)).resolves.toEqual({ status: "empty", projects: [], activeProjectId: null, message: "Nenhum projeto disponível para esta conta." });
  });
  it("returns offline when health is unavailable", async () => {
    const api: OnlineSessionApi = { checkHealth: async () => ({ online: false }), listProjects: async () => ({ total: 1, page: 1, projetos: [project] }) };
    await expect(loadOnlineSession(api)).resolves.toMatchObject({ status: "offline", projects: [] });
  });
  it("returns error when the list request fails", async () => {
    const api: OnlineSessionApi = { checkHealth: async () => ({ online: true }), listProjects: async () => { throw new Error("HTTP 500"); } };
    await expect(loadOnlineSession(api)).resolves.toMatchObject({ status: "error", projects: [] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/services/onlineSession.test.ts`

Expected: FAIL because the contract and loader do not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { OnlineProjectSummary, OnlineSessionApi, OnlineSessionState } from "../contracts/online";

export function chooseActiveProjectId(projects: OnlineProjectSummary[], preferredProjectId?: string | null): string | null {
  return projects.some((project) => project.id === preferredProjectId) ? preferredProjectId ?? null : projects[0]?.id ?? null;
}
export async function loadOnlineSession(api: OnlineSessionApi, preferredProjectId?: string | null): Promise<OnlineSessionState> {
  const health = await api.checkHealth();
  if (!health.online) return { status: "offline", projects: [], activeProjectId: null, message: "Não foi possível conectar ao serviço online." };
  try {
    const result = await api.listProjects();
    if (!result.projetos.length) return { status: "empty", projects: [], activeProjectId: null, message: "Nenhum projeto disponível para esta conta." };
    return { status: "ready", projects: result.projetos, activeProjectId: chooseActiveProjectId(result.projetos, preferredProjectId), message: null };
  } catch {
    return { status: "error", projects: [], activeProjectId: null, message: "A conexão foi realizada, mas os projetos não puderam ser carregados." };
  }
}
```

Create `src/contracts/online.ts` with exactly the frozen contract above.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/services/onlineSession.test.ts`

Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/contracts/online.ts src/services/onlineSession.ts src/services/onlineSession.test.ts
git commit -m "feat: add explicit online session states"
```

### Task 2: Cliente HTTP configurável e envelope FastAPI

**Files:**
- Modify: `src/services/apiClient.ts`
- Create: `src/services/apiClient.test.ts`
- Modify: `backend/routes/projetos.py:49-91`
- Modify: `backend/tests/test_endpoints_delete_patch.py`

**Interfaces:**
- Consumes: `OnlineProjectList`.
- Produces: `resolveApiUrls(apiBaseUrl?)`, `ApiClientError`, `ApiClient.createForTesting(apiBaseUrl)` e `ApiClient.listProjects()`.

- [ ] **Step 1: Write the failing frontend test**

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClient, resolveApiUrls } from "./apiClient";
afterEach(() => vi.restoreAllMocks());

describe("API URLs", () => {
  it("derives health from configured API origin", () => {
    expect(resolveApiUrls("https://api.example.com/api/v1")).toEqual({ apiBaseUrl: "https://api.example.com/api/v1", healthUrl: "https://api.example.com/health" });
  });
  it("maps the FastAPI project envelope", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ total: 1, page: 1, projetos: [{ id: "1961", pronac: "19-1961", nome: "Projeto 1961", transacoes_count: 178, criado_em: "2026-09-01T10:00:00Z" }] }), { status: 200 })));
    const client = ApiClient.createForTesting("https://api.example.com/api/v1");
    await expect(client.listProjects()).resolves.toEqual({ total: 1, page: 1, projetos: [{ id: "1961", pronac: "19-1961", nome: "Projeto 1961", transacoesCount: 178, criadoEm: "2026-09-01T10:00:00Z" }] });
  });
  it("throws a typed error for a failed response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));
    await expect(ApiClient.createForTesting("https://api.example.com/api/v1").listProjects()).rejects.toMatchObject({ name: "ApiClientError", status: 401 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/services/apiClient.test.ts`

Expected: FAIL because the resolver and list API do not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { OnlineProjectList } from "../contracts/online";
const DEFAULT_API_BASE_URL = "http://localhost:8000/api/v1";
export function resolveApiUrls(apiBaseUrl = import.meta.env.VITE_API_URL || DEFAULT_API_BASE_URL) {
  const normalized = apiBaseUrl.replace(/\/$/, "");
  return { apiBaseUrl: normalized, healthUrl: `${new URL(normalized).origin}/health` };
}
export class ApiClientError extends Error {
  constructor(public readonly status: number, message: string) { super(message); this.name = "ApiClientError"; }
}
```

Store those URLs in the client. `checkHealth` calls `this.healthUrl`, never a literal localhost URL. `listProjects` calls the configured `/projetos`, sends bearer token when present, rejects failed HTTP responses with `ApiClientError`, and maps only `transacoes_count` to `transacoesCount` plus `criado_em` to `criadoEm`. `createForTesting` builds an isolated client without changing singleton/localStorage. Preserve old methods until their callers are migrated; do not add a financial fallback.

The backend endpoint already returns `total`, `page`, `projetos`, `id`, `pronac`, `nome`, `transacoes_count`, `criado_em`. Preserve that envelope; do not add bank balances or financial totals.

- [ ] **Step 4: Write and run the backend endpoint test**

Use the existing fake connection/dependency override convention in `backend/tests/test_endpoints_delete_patch.py` to call `GET /api/v1/projetos`. Assert 200 and response JSON fields `total`, `page`, `projetos`; the first project must contain `id`, `pronac`, `nome`, `transacoes_count`, `criado_em`.

Run: `python -m pytest backend/tests/test_endpoints_delete_patch.py -v`

Expected: PASS. If collection is blocked by known NUL bytes in `backend/routes/documentos.py` or `backend/routes/real_imports.py`, record the exact error and do not edit them in this task.

- [ ] **Step 5: Validate and commit**

Run: `npm test -- --run src/services/apiClient.test.ts; npm run lint`

Expected: PASS, 3 tests and no type errors.

```bash
git add src/services/apiClient.ts src/services/apiClient.test.ts backend/routes/projetos.py backend/tests/test_endpoints_delete_patch.py
git commit -m "feat: connect project session to configured API"
```

### Task 3: Fronteira visual da sessão online

**Owner:** Antigravity only after Tasks 1–2 are committed; Codex reviews the diff before integration.

**Files:**
- Create: `src/components/online/OnlineSessionBoundary.tsx`
- Create: `src/components/online/OnlineSessionBoundary.test.tsx`

**Interfaces:**
- Consumes: the frozen `OnlineSessionBoundaryProps`.
- Produces: named export `OnlineSessionBoundary`.

- [ ] **Step 1: Write the failing test**

```tsx
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { OnlineSessionBoundary } from "./OnlineSessionBoundary";
const props = { isDemoMode: false, onRetry: vi.fn(), onSelectProject: vi.fn(), children: <p>Painel real</p> };

describe("OnlineSessionBoundary", () => {
  it("shows offline instead of dashboard data", () => {
    const html = renderToStaticMarkup(<OnlineSessionBoundary {...props} session={{ status: "offline", projects: [], activeProjectId: null, message: "Não foi possível conectar ao serviço online." }} />);
    expect(html).toContain("Sistema offline"); expect(html).toContain("Tentar novamente"); expect(html).not.toContain("Painel real");
  });
  it("shows only real summary data when ready", () => {
    const html = renderToStaticMarkup(<OnlineSessionBoundary {...props} session={{ status: "ready", activeProjectId: "1961", message: null, projects: [{ id: "1961", pronac: "19-1961", nome: "Projeto 1961", transacoesCount: 178, criadoEm: "2026-09-01T10:00:00Z" }] }} />);
    expect(html).toContain("Projeto 1961"); expect(html).toContain("178 lançamentos cadastrados"); expect(html).toContain("Painel real");
  });
  it("suppresses demo children while production session loads", () => {
    const html = renderToStaticMarkup(<OnlineSessionBoundary {...props} session={{ status: "loading", projects: [], activeProjectId: null, message: null }} />);
    expect(html).toContain("Carregando dados online"); expect(html).not.toContain("Painel real");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/online/OnlineSessionBoundary.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Write minimal implementation**

The component returns children immediately only in demo mode. Render:
- `loading`: `<section aria-live="polite">Carregando dados online...</section>`;
- `offline`: heading `Sistema offline`, session message, and `Tentar novamente` button;
- `error`: heading `Não foi possível carregar os projetos`, message, retry;
- `empty`: heading `Nenhum projeto disponível`, message;
- `ready`: labelled `<select aria-label="Projeto online">`, options `PRONAC — nome`, summary `N lançamentos cadastrados`, then children.

For ready include exact visible copy: `Dados financeiros detalhados serão carregados da API nas próximas etapas.` Do not render balances, documents, reconciliation totals or local financial values.

- [ ] **Step 4: Run test to verify it passes and commit**

Run: `npm test -- --run src/components/online/OnlineSessionBoundary.test.tsx`

Expected: PASS, 3 tests.

```bash
git add src/components/online/OnlineSessionBoundary.tsx src/components/online/OnlineSessionBoundary.test.tsx
git commit -m "feat: add online session boundary"
```

### Task 4: Integrar a sessão no App sem fallback silencioso

**Files:**
- Modify: `src/App.tsx:1-110` and root render around `src/App.tsx:550-700`
- Modify: `src/components/Navbar.tsx` only if a presentation prop is needed.

**Interfaces:**
- Consumes: `apiClient`, `loadOnlineSession`, `OnlineSessionBoundary`.
- Produces: startup online by default; demo only when explicit.

- [ ] **Step 1: Add startup code**

```ts
const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";
const ONLINE_ACTIVE_PROJECT_STORAGE_KEY = "concilia_rouanet_online_active_project_v1";
const [onlineSession, setOnlineSession] = useState<OnlineSessionState>({ status: "loading", projects: [], activeProjectId: null, message: null });
const refreshOnlineSession = useCallback(async () => {
  const preferredProjectId = localStorage.getItem(ONLINE_ACTIVE_PROJECT_STORAGE_KEY);
  setOnlineSession({ status: "loading", projects: [], activeProjectId: null, message: null });
  setOnlineSession(await loadOnlineSession(apiClient, preferredProjectId));
}, []);
```

Import `useCallback`, online types/service/component and run `refreshOnlineSession()` in an effect only when `!IS_DEMO_MODE`. An online selection updates only `ONLINE_ACTIVE_PROJECT_STORAGE_KEY` and `onlineSession.activeProjectId`.

- [ ] **Step 2: Gate the current application shell**

Wrap the shell with `OnlineSessionBoundary`. Demo preserves current behavior and Navbar visibly says `Modo demonstração`. In non-demo mode, do not pass `initialProjects`, local transactions, documents, rubrics, alerts or `currentProjectWithLiveStats` to Navbar, Sidebar, DashboardView or business views. Its ready child is a phase-one information section, with no local dashboard numbers. Navbar gets session data only by props; remove literal `localhost:8000/health` usage from it.

- [ ] **Step 3: Validate integration**

Run: `npm test -- --run src/services/onlineSession.test.ts src/services/apiClient.test.ts src/components/online/OnlineSessionBoundary.test.tsx; npm run lint; npm run build`

Expected: PASS, 10 tests, no type errors and successful build.

Run: `npm run dev`

Manual checks:
1. API off/no demo: **Sistema offline**, retry, no financial values.
2. Healthy API/no projects: **Nenhum projeto disponível**.
3. Healthy API/project: real PRONAC, name and `transacoes_count`, plus phase-one notice.
4. `VITE_DEMO_MODE=true`: existing demo remains available and visibly labelled.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/Navbar.tsx
git commit -m "feat: gate production UI behind online session"
```

### Task 5: Operação, riscos e revisão final

**Files:**
- Create: `docs/operacao-online.md`
- Modify: `docs/superpowers/specs/2026-09-01-online-foundation-v2-design.md` only after evidence exists.

**Interfaces:**
- Consumes: delivered variables and test outputs.
- Produces: short no-secret runbook.

- [ ] **Step 1: Document configuration**

Write this table verbatim:

| Variable | Required in production | Meaning |
| --- | --- | --- |
| `VITE_API_URL` | Yes | Base URL ending in `/api/v1` for the FastAPI service. |
| `VITE_DEMO_MODE` | No | Set exactly to `true` only for the clearly labelled local demonstration mode. |

Explain: offline is not financial zero; empty means the account has no project; error means API responded but listing failed. Never publish tokens or Gemini keys.

- [ ] **Step 2: Scan configuration and run full validation**

Run: `rg -n "VITE_API_URL|VITE_DEMO_MODE|localhost:8000/health|VITE_GEMINI_API_KEY" src README.md docs`

Expected: no literal `localhost:8000/health`; existing browser-side Gemini references are recorded as a residual risk until their separate server-side migration.

Run: `npm run lint; npm test -- --run; npm run build`

Expected: all frontend checks PASS. If unrelated tests fail, record exact path; do not change behavior without scoped task.

- [ ] **Step 3: Review and commit**

Run: `git diff codex/frontend-v2...HEAD --check; git status --short; git log --oneline codex/frontend-v2..HEAD`

Expected: no whitespace issue; planned source/docs only; clear history.

```bash
git add docs/operacao-online.md docs/superpowers/specs/2026-09-01-online-foundation-v2-design.md
git commit -m "docs: explain online session operation"
```

## Self-review

- **Spec coverage:** Tasks 1–2 provide five states, configuration and a real list adapter. Task 3 provides visual/retry states. Task 4 removes implicit production mock fallback while preserving explicit demo. Task 5 documents operation. Domain data, AI/OCR server migration, authentication/RBAC, uploads and deployment are outside this first scope.
- **Placeholder scan:** No TODO/TBD appears; states, tests, fields and commands are named.
- **Type consistency:** `OnlineProjectSummary`, `OnlineProjectList`, `OnlineSessionApi`, `OnlineSessionState`, `loadOnlineSession`, `chooseActiveProjectId` and `OnlineSessionBoundaryProps` use the same shape throughout. Snake_case converts only in `ApiClient.listProjects`.

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import App from "../../App";
import { AuthGate } from "../../components/AuthGate";

vi.mock("../../hooks/useSession", () => ({
  useSession: () => ({ session: { access_token: "signed-test-token" }, loading: false }),
}));
vi.mock("../../services/supabaseClient", () => ({
  supabase: { auth: { signInWithOtp: vi.fn() } },
}));

const persistedProject = {
  id: "project-empty-lifecycle",
  pronac: "TEST-EMPTY-001",
  nome: "Projeto vazio",
  proponente: "Proponente de teste",
  pacote_regulatorio: "FSA_ANCINE",
  status_processamento: "EMPTY",
  banco: null,
  valor_captado: null,
  criado_em: "2026-08-20T12:00:00.000Z",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function installHttpBoundary(): { projectGetCount: () => number } {
  const projects: typeof persistedProject[] = [];
  let projectGetCount = 0;

  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : null;
    const url = new URL(request?.url ?? input.toString());
    const method = init?.method ?? request?.method ?? "GET";
    const headers = new Headers(init?.headers ?? request?.headers);

    if (url.pathname === "/health" && method === "GET") {
      return jsonResponse({ status: "ok", version: "test" });
    }

    if (url.pathname !== "/api/v1/projetos") {
      throw new Error(`Requisição HTTP inesperada no teste: ${method} ${url.pathname}`);
    }
    if (headers.get("Authorization") !== "Bearer signed-test-token") {
      return jsonResponse({ detail: "Token de teste ausente." }, 401);
    }

    if (method === "GET") {
      projectGetCount += 1;
      const listedProjects = projects.map((project) => (
        projectGetCount >= 3
          ? { ...project, nome: "Projeto vazio retornado somente no remount" }
          : project
      ));
      return jsonResponse({
        total: listedProjects.length,
        page: 1,
        projetos: listedProjects.map((project) => ({ ...project, transacoes_count: 0 })),
      });
    }

    if (method === "POST") {
      const rawBody = init?.body ?? request?.body;
      const body = typeof rawBody === "string" ? JSON.parse(rawBody) : null;
      const expectedBody = {
        pronac: "TEST-EMPTY-001",
        nome: "Projeto vazio",
        proponente: "Proponente de teste",
        pacote_regulatorio: "FSA_ANCINE",
      };

      if (!body || Object.entries(expectedBody).some(([key, value]) => body[key] !== value)) {
        return jsonResponse({ detail: "Contrato de criação inválido." }, 422);
      }

      projects.splice(0, projects.length, persistedProject);
      return jsonResponse(persistedProject, 201);
    }

    return jsonResponse({ detail: "Método não permitido." }, 405);
  }));

  return { projectGetCount: () => projectGetCount };
}

function renderAuthenticatedApp() {
  return render(
    <AuthGate>
      <App />
    </AuthGate>,
  );
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

it("starts empty, creates a project, and reloads it from HTTP without demo fallback", async () => {
  const httpBoundary = installHttpBoundary();

  const firstMount = renderAuthenticatedApp();
  fireEvent.click(await screen.findByRole("button", { name: /criar primeiro projeto/i }));
  expect(httpBoundary.projectGetCount()).toBe(1);

  fireEvent.change(screen.getByRole("textbox", { name: /pronac \/ identificador/i }), {
    target: { value: "TEST-EMPTY-001" },
  });
  fireEvent.change(screen.getByRole("combobox", { name: /pacote regulatório/i }), {
    target: { value: "FSA_ANCINE" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: /nome do projeto/i }), {
    target: { value: "Projeto vazio" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: /razão social \/ proponente/i }), {
    target: { value: "Proponente de teste" },
  });
  fireEvent.click(screen.getByRole("button", { name: /criar e abrir projeto/i }));

  await waitFor(() => expect(screen.getAllByText("Projeto vazio").length).toBeGreaterThan(0));
  expect(httpBoundary.projectGetCount()).toBe(2);
  firstMount.unmount();
  localStorage.clear();

  renderAuthenticatedApp();

  await waitFor(() => expect(httpBoundary.projectGetCount()).toBe(3));
  expect((await screen.findAllByText("Projeto vazio retornado somente no remount")).length).toBeGreaterThan(0);
  expect(screen.queryByText(/Festival de Cinema 2026/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/Circunstância Cinematográfica/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/^1961$/i)).not.toBeInTheDocument();
});

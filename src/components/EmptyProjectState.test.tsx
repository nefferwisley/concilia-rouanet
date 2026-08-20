import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import App from "../App";
import type { PronacProject } from "../types";
import { DashboardView } from "./DashboardView";
import { DriveFolderImportModal } from "./DriveFolderImportModal";
import { EmptyProjectState } from "./EmptyProjectState";

vi.mock("../features/projects/useProjects", () => ({
  useProjects: () => ({
    projects: [],
    activeProject: null,
    activeProjectId: null,
    loading: false,
    error: null,
    setActiveProjectId: vi.fn(),
    reload: vi.fn(),
  }),
}));

vi.mock("../hooks/useSession", () => ({
  useSession: () => ({ session: { access_token: "test-token" }, loading: false }),
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

it("offers import without showing Project 1961 or financial totals", () => {
  render(<EmptyProjectState onCreate={() => undefined} />);

  expect(screen.getByRole("button", { name: /criar primeiro projeto/i })).toBeInTheDocument();
  expect(screen.queryByText(/1961/)).not.toBeInTheDocument();
  expect(screen.queryByText(/835\.000/)).not.toBeInTheDocument();
});

it("uses the authenticated project list instead of cached demo records", () => {
  localStorage.setItem(
    "concilia_rouanet_projects_v5",
    JSON.stringify([{ id: "proj-1", pronac: "1961", nome: "Projeto demonstrativo" }]),
  );

  render(<App />);

  expect(screen.getByRole("button", { name: /criar primeiro projeto/i })).toBeInTheDocument();
  expect(screen.queryByText(/1961/)).not.toBeInTheDocument();
});

it("does not present unprocessed project metrics as calculated or compliant", () => {
  const project: PronacProject = {
    id: "project-empty",
    pronac: "246810",
    nome: "Projeto recém-criado",
    proponente: "",
    cnpjCpf: "",
    segmento: "Lei Rouanet",
    artigoEnquadramento: "Lei Rouanet",
    dataInicioVigencia: "",
    dataFimVigencia: "",
    prazoLimitePrestacao: "",
    valorAprovado: 0,
    valorCaptado: 0,
    valorExecutado: 0,
    bancoInfo: {
      banco: "",
      agencia: "",
      contaCaptacao: "",
      contaMovimento: "",
      saldoBloqueado: 0,
      saldoMovimento: 0,
      rendimentoAplicacao: 0,
    },
    status: "EMPTY",
    resumoProjeto: "",
  };

  render(
    <DashboardView
      project={project}
      rubrics={[]}
      transactions={[]}
      documents={[]}
      alerts={[]}
      onNavigateTab={() => undefined}
      onRunAiAudit={() => undefined}
      isAuditing={false}
    />,
  );

  expect(screen.getAllByText(/ainda não calculado/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/proponente não informado/i)).toBeInTheDocument();
  expect(screen.queryByText(/nenhuma pendência crítica/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/100% dos débitos amarrados/i)).not.toBeInTheDocument();
});

it("keeps normal folder import without instant demo activation", () => {
  render(
    <DriveFolderImportModal
      isOpen
      onClose={() => undefined}
      onImportComplete={() => undefined}
    />,
  );

  expect(screen.getByRole("button", { name: /selecionar pastas \/ zip/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /extrair dados do projeto/i })).toBeInTheDocument();
  expect(screen.queryByText(/1961/)).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /ativar instantaneamente/i })).not.toBeInTheDocument();
});

it("does not prefill the Drive importer with a demonstration folder", () => {
  render(
    <DriveFolderImportModal
      isOpen
      onClose={() => undefined}
      onImportComplete={() => undefined}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /google drive link/i }));

  expect(screen.getByPlaceholderText(/drive\.google\.com\/drive\/folders/i)).toHaveValue("");
});

it("reports extraction failures without offering demonstration data", async () => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ success: false, error: "503 UNAVAILABLE" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    }),
  );
  const { container } = render(
    <DriveFolderImportModal
      isOpen
      onClose={() => undefined}
      onImportComplete={() => undefined}
    />,
  );
  const fileInputs = container.querySelectorAll<HTMLInputElement>('input[type="file"]');
  const file = new File(["conteúdo"], "extrato.txt", { type: "text/plain" });

  fireEvent.change(fileInputs[2], { target: { files: [file] } });
  await waitFor(() => expect(screen.getByText(/1 arquivos carregados/i)).toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: /extrair dados do projeto/i }));

  await waitFor(() => expect(screen.getByText(/servidores com alta demanda/i)).toBeInTheDocument());
  expect(screen.queryByText(/195 lançamentos/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/ativar projeto/i)).not.toBeInTheDocument();
});

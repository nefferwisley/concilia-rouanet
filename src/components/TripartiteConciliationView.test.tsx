import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { BudgetRubric, PronacProject } from "../types";
import { TripartiteConciliationView } from "./TripartiteConciliationView";

const project: PronacProject = {
  id: "project-empty",
  pronac: "246810",
  nome: "Projeto sem rubricas",
  proponente: "Associação Cultural",
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

const rubric: BudgetRubric = {
  id: "rubric-1",
  nome: "Serviço técnico",
  etapa: "Produção / Execução",
  valorAprovado: 100,
  valorExecutado: 0,
};

afterEach(cleanup);

const renderView = (rubrics: BudgetRubric[], onUpdateTripartiteEntries = vi.fn()) =>
  render(
    <TripartiteConciliationView
      project={project}
      rubrics={rubrics}
      transactions={[]}
      documents={[]}
      tripartiteEntries={[]}
      alerts={[]}
      onUpdateTripartiteEntries={onUpdateTripartiteEntries}
      onUpdateDocuments={() => undefined}
      onUpdateTransactions={() => undefined}
    />,
  );

it("keeps the new-entry action visible but disabled until a rubric exists", () => {
  const onUpdateTripartiteEntries = vi.fn();
  renderView([], onUpdateTripartiteEntries);

  const newEntryButton = screen.getByRole("button", { name: /novo lançamento/i });
  expect(newEntryButton).toBeVisible();
  expect(newEntryButton).toBeDisabled();
  expect(newEntryButton).toHaveAttribute("title", expect.stringMatching(/rubrica/i));

  fireEvent.click(newEntryButton);
  expect(screen.queryByText(/cadastrar novo lançamento tripartite/i)).not.toBeInTheDocument();
  expect(onUpdateTripartiteEntries).not.toHaveBeenCalled();
});

it("refuses submission safely if rubrics disappear while the form is open", () => {
  const onUpdateTripartiteEntries = vi.fn();
  const { rerender } = renderView([rubric], onUpdateTripartiteEntries);

  fireEvent.click(screen.getByRole("button", { name: /novo lançamento/i }));
  expect(screen.getByText(/cadastrar novo lançamento tripartite/i)).toBeInTheDocument();

  rerender(
    <TripartiteConciliationView
      project={project}
      rubrics={[]}
      transactions={[]}
      documents={[]}
      tripartiteEntries={[]}
      alerts={[]}
      onUpdateTripartiteEntries={onUpdateTripartiteEntries}
      onUpdateDocuments={() => undefined}
      onUpdateTransactions={() => undefined}
    />,
  );

  const form = screen.getByRole("button", { name: /salvar lançamento/i }).closest("form");
  expect(form).not.toBeNull();
  expect(() => fireEvent.submit(form!)).not.toThrow();
  expect(onUpdateTripartiteEntries).not.toHaveBeenCalled();
});

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { BudgetRubric, PronacProject, TripartiteEntry } from "../types";
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

const renderViewWithEntries = (
  entries: TripartiteEntry[],
  onUpdateTripartiteEntries = vi.fn(),
) => render(
  <TripartiteConciliationView
    project={project}
    rubrics={[rubric]}
    transactions={[]}
    documents={[]}
    tripartiteEntries={entries}
    alerts={[]}
    onUpdateTripartiteEntries={onUpdateTripartiteEntries}
    onUpdateDocuments={() => undefined}
    onUpdateTransactions={() => undefined}
  />,
);

function fieldByLabel(label: RegExp): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
  const labelElement = screen.getByText(label);
  const field = labelElement.parentElement?.querySelector("input, select, textarea");
  expect(field).not.toBeNull();
  return field as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
}

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

it("creates a declared manual entry as incomplete without synthetic bank or document evidence", () => {
  const onUpdateTripartiteEntries = vi.fn();
  renderView([rubric], onUpdateTripartiteEntries);

  fireEvent.click(screen.getByRole("button", { name: /novo lançamento/i }));
  fireEvent.change(fieldByLabel(/período \/ mês/i), { target: { value: "2026-08" } });
  fireEvent.change(fieldByLabel(/número do documento/i), { target: { value: "NF-REAL-123" } });
  fireEvent.change(fieldByLabel(/fornecedor \/ razão social/i), { target: { value: "Fornecedor real" } });
  fireEvent.change(fieldByLabel(/valor bruto documento/i), { target: { value: "125" } });
  fireEvent.change(fieldByLabel(/valor débito bb/i), { target: { value: "125" } });
  fireEvent.click(screen.getByRole("button", { name: /salvar lançamento/i }));

  const [created, ...previous] = onUpdateTripartiteEntries.mock.calls[0][0] as TripartiteEntry[];
  expect(previous).toEqual([]);
  expect(created).toMatchObject({
    periodo: "2026-08",
    idRubrica: rubric.id,
    numeroDoc: "NF-REAL-123",
    fornecedor: "Fornecedor real",
    valorBrutoDoc: 125,
    valorDebitoBB: 125,
    statusTripartite: "PENDENTE DE VÍNCULO",
    statusSalic: "Pendente",
    checkTripe: {
      fiscalDocAnexo: false,
      comprovanteBancarioAnexo: false,
      relatorioExecucaoAnexo: false,
      rubricaValida: true,
    },
    gedArquivos: [],
  });
  expect(created.idDocFiscal).toBeUndefined();
  expect(created.idTransacaoBB).toBeUndefined();
  expect(created.dataEmissao).toBeUndefined();
  expect(created.dataCompensacao).toBeUndefined();
  expect(created.cnpjCpf).toBeUndefined();
});

it("offers no one-click action that fabricates a fiscal document file", () => {
  const onUpdateTripartiteEntries = vi.fn();
  renderViewWithEntries([
    {
      id: "manual-entry",
      periodo: "2026-08",
      idRubrica: rubric.id,
      descricaoRubrica: rubric.nome,
      fornecedor: "Fornecedor real",
      valorBrutoDoc: 125,
      valorDebitoBB: 125,
      statusTripartite: "PENDENTE DE VÍNCULO",
      statusSalic: "Pendente",
      checkTripe: {
        fiscalDocAnexo: false,
        comprovanteBancarioAnexo: false,
        relatorioExecucaoAnexo: false,
        rubricaValida: true,
      },
      gedArquivos: [],
    },
  ], onUpdateTripartiteEntries);

  expect(screen.queryByRole("button", { name: /gerar nf/i })).not.toBeInTheDocument();
  expect(screen.getByText(/anexe um documento real/i)).toBeInTheDocument();
  expect(onUpdateTripartiteEntries).not.toHaveBeenCalled();
});

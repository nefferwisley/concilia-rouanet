import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import type { BankTransaction, PronacProject } from "../types";
import { SalicReportView } from "./SalicReportView";

const makeProject = (status: PronacProject["status"]): PronacProject => ({
  id: `project-${status}`,
  pronac: "246810",
  nome: "Projeto online",
  proponente: "Associação Cultural",
  cnpjCpf: "",
  segmento: "Lei Rouanet",
  artigoEnquadramento: "Lei Rouanet",
  dataInicioVigencia: "",
  dataFimVigencia: "",
  prazoLimitePrestacao: "",
  valorAprovado: 1000,
  valorCaptado: 500,
  valorExecutado: 200,
  bancoInfo: {
    banco: "",
    agencia: "",
    contaCaptacao: "",
    contaMovimento: "",
    saldoBloqueado: 0,
    saldoMovimento: 100,
    rendimentoAplicacao: 5,
  },
  status,
  resumoProjeto: "",
});

const transactions: BankTransaction[] = [
  { id: "transaction-real", tipo: "DEBITO", valor: 10, status: "PENDENTE" },
];

afterEach(cleanup);

it("does not render report totals or export controls before review", () => {
  render(
    <SalicReportView
      project={makeProject("EMPTY")}
      rubrics={[]}
      transactions={transactions}
      documents={[]}
      alerts={[]}
    />,
  );

  expect(screen.getByRole("heading", { name: "Ainda não calculado" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /exportar|gerar pdf/i })).not.toBeInTheDocument();
  expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();
});

it("renders the SALIC report for REVIEW with real evidence", () => {
  render(
    <SalicReportView
      project={makeProject("REVIEW")}
      rubrics={[]}
      transactions={transactions}
      documents={[]}
      alerts={[]}
    />,
  );

  expect(screen.getByRole("heading", { name: /dossiê oficial/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /exportar xlsx/i })).toBeEnabled();
});

import { expect, it } from "vitest";
import type { BankTransaction, FiscalDocument, PronacProject } from "../types";
import {
  assertFinancialMetricsAvailable,
  canRevealFinancialMetrics,
  FinancialMetricsUnavailableError,
} from "./financialMetricGate";
import { TigerBeetleReconciliationLedger } from "../services/reconciliationCore/tigerBeetleLedger";
import { runPanderaValidationSuite } from "../services/reconciliationCore/panderaValidationSuite";

const project = (status: PronacProject["status"]): PronacProject => ({
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
  valorAprovado: 999,
  valorCaptado: 888,
  valorExecutado: 777,
  bancoInfo: {
    banco: "",
    agencia: "",
    contaCaptacao: "",
    contaMovimento: "",
    saldoBloqueado: 0,
    saldoMovimento: 666,
    rendimentoAplicacao: 555,
  },
  status,
  resumoProjeto: "",
});

const transaction: BankTransaction = {
  id: "transaction-real",
  tipo: "DEBITO",
  valor: 10,
};

const document: FiscalDocument = {
  id: "document-real",
  tipo: "NFS-e (Serviço)",
  numeroDoc: "NF-1",
  dataEmissao: "2026-08-20",
  fornecedorNome: "Fornecedor real",
  fornecedorCnpjCpf: "",
  descricaoServico: "Serviço",
  valorBruto: 10,
  valorLiquido: 10,
};

it("requires REVIEW or READY together with real financial evidence", () => {
  expect(canRevealFinancialMetrics(project("EMPTY"), { transactions: [transaction] })).toBe(false);
  expect(canRevealFinancialMetrics(project("REVIEW"), {})).toBe(false);
  expect(canRevealFinancialMetrics(project("REVIEW"), { transactions: [transaction] })).toBe(true);
  expect(canRevealFinancialMetrics(project("READY"), { documents: [document] })).toBe(true);
});

it("blocks direct financial actions using the same central rule", () => {
  expect(() =>
    assertFinancialMetricsAvailable(project("IMPORTING"), { documents: [document] }),
  ).toThrow(FinancialMetricsUnavailableError);
  expect(() =>
    assertFinancialMetricsAvailable(project("READY"), { documents: [document] }),
  ).not.toThrow();
});

it("does not seed the ledger with a sample funding total", () => {
  const emptyProject = project("READY");
  emptyProject.valorAprovado = 0;
  emptyProject.valorCaptado = 0;

  const report = new TigerBeetleReconciliationLedger().buildProjectLedger(
    emptyProject,
    [],
    [],
  );

  expect(report.transferCount).toBe(0);
  expect(report.totalDebits).toBe(0);
});

it("validates resources against source-backed project and transaction values", () => {
  const reviewedProject = project("REVIEW");
  reviewedProject.valorCaptado = 120;
  reviewedProject.valorAprovado = 120;
  reviewedProject.bancoInfo.rendimentoAplicacao = 30;

  const report = runPanderaValidationSuite(
    reviewedProject,
    [{ id: "credit-real", tipo: "CREDITO", valor: 30 }],
    [],
    [],
  );
  const resourceExpectation = report.expectations.find(
    (expectation) => expectation.id === "EXP_001_TOTAL_RESOURCES",
  );

  expect(resourceExpectation).toMatchObject({
    passed: true,
    anomalyCount: 0,
  });
  expect(resourceExpectation?.actualValue).toContain("150");
  expect(resourceExpectation?.expectedValue).toContain("150");
});

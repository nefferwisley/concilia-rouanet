import { beforeEach, expect, it, vi } from "vitest";
import type { BankTransaction, PronacProject } from "../types";

const xlsxMocks = vi.hoisted(() => ({
  bookNew: vi.fn(() => ({})),
  aoaToSheet: vi.fn((rows: unknown[][]) => ({ rows })),
  appendSheet: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock("xlsx", () => ({
  utils: {
    book_new: xlsxMocks.bookNew,
    aoa_to_sheet: xlsxMocks.aoaToSheet,
    book_append_sheet: xlsxMocks.appendSheet,
  },
  writeFile: xlsxMocks.writeFile,
}));

import { exportSalicExcel } from "./exportUtils";
import { FinancialMetricsUnavailableError } from "./financialMetricGate";

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
  status,
  resumoProjeto: "",
});

const transactions: BankTransaction[] = [
  { id: "transaction-real", tipo: "DEBITO", valor: 10, data: "2026-08-20" },
];

beforeEach(() => vi.clearAllMocks());

it("blocks a direct export before financial metrics are available", () => {
  expect(() => exportSalicExcel(project("EMPTY"), [], transactions, [])).toThrow(
    FinancialMetricsUnavailableError,
  );
  expect(xlsxMocks.bookNew).not.toHaveBeenCalled();
  expect(xlsxMocks.writeFile).not.toHaveBeenCalled();
});

it("exports source zeroes without substituting sample financial totals", () => {
  exportSalicExcel(project("REVIEW"), [], transactions, []);

  const serializedSheets = JSON.stringify(xlsxMocks.aoaToSheet.mock.calls);
  expect(serializedSheets).not.toContain("835000");
  expect(serializedSheets).not.toContain("57414.32");
  expect(serializedSheets).not.toContain("897759.15");
  expect(xlsxMocks.writeFile).toHaveBeenCalledOnce();
});

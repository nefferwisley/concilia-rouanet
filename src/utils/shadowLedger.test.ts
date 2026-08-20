import { expect, it } from "vitest";
import type { BankTransaction, BudgetRubric, FiscalDocument } from "../types";
import { runRealtimeTripartiteReconciliation } from "./shadowLedger";

const rubric: BudgetRubric = {
  id: "rubric-real",
  nome: "Serviço técnico",
  etapa: "Produção / Execução",
  valorAprovado: 500,
  valorExecutado: 0,
};

function pendingDocument(overrides: Partial<FiscalDocument> = {}): FiscalDocument {
  return {
    id: "document-real",
    tipo: "NFS-e (Serviço)",
    numeroDoc: "",
    dataEmissao: "",
    fornecedorNome: "",
    fornecedorCnpjCpf: "",
    descricaoServico: "",
    valorBruto: 0,
    valorLiquido: 0,
    statusComprovacao: "Pendente",
    ...overrides,
  };
}

function debit(overrides: Partial<BankTransaction> = {}): BankTransaction {
  return {
    id: "transaction-real",
    tipo: "DEBITO",
    valor: 125,
    data: "2026-08-20",
    status: "PENDENTE",
    ...overrides,
  };
}

it("does not repair missing evidence by position, value, filename, rubric, or confidence", () => {
  const document = pendingDocument();
  const transaction = debit();

  const result = runRealtimeTripartiteReconciliation(
    [transaction],
    [document],
    [rubric],
  );

  expect(result.documents).toEqual([document]);
  expect(result.transactions).toEqual([transaction]);
  expect(result.tripartiteEntries).toEqual([]);
  expect(result.alerts).toEqual([]);
  expect(result.healedCount).toBe(0);
  expect(result.matchedCount).toBe(0);
});

it("keeps an explicit document link pending while real files and rubric evidence are absent", () => {
  const document = pendingDocument();
  const transaction = debit({ matchedDocId: document.id });

  const result = runRealtimeTripartiteReconciliation(
    [transaction],
    [document],
    [rubric],
  );

  expect(result.documents).toEqual([document]);
  expect(result.transactions[0]).toMatchObject({
    id: transaction.id,
    matchedDocId: document.id,
    status: "PENDENTE",
    statusConciliacao: "PENDENTE",
  });
  expect(result.transactions[0].matchedRubricId).toBeUndefined();
  expect(result.tripartiteEntries).toHaveLength(1);
  expect(result.tripartiteEntries[0]).toMatchObject({
    idDocFiscal: document.id,
    idTransacaoBB: transaction.id,
    valorDebitoBB: 125,
    statusTripartite: "PENDENTE DE VÍNCULO",
    statusSalic: "Pendente",
    checkTripe: {
      fiscalDocAnexo: false,
      comprovanteBancarioAnexo: false,
      relatorioExecucaoAnexo: false,
      rubricaValida: false,
    },
    gedArquivos: [],
  });
  expect(result.tripartiteEntries[0].idRubrica).toBeUndefined();
  expect(result.tripartiteEntries[0].numeroDoc).toBeUndefined();
  expect(result.tripartiteEntries[0].documentoBancarioNumero).toBeUndefined();
});

it("derives reconciliation only from explicit links and actual evidence fields", () => {
  const document = pendingDocument({
    numeroDoc: "NF-REAL-123",
    fornecedorNome: "Fornecedor real",
    valorBruto: 125,
    valorLiquido: 125,
    rubricaId: rubric.id,
    arquivoNotaNome: "nota-real.pdf",
    arquivoComprovanteNome: "comprovante-real.pdf",
  });
  const transaction = debit({
    matchedDocId: document.id,
    matchedRubricId: rubric.id,
    documentoBancario: "FITID-REAL-123",
  });

  const result = runRealtimeTripartiteReconciliation(
    [transaction],
    [document],
    [rubric],
  );

  expect(result.matchedCount).toBe(1);
  expect(result.totalReconciledValue).toBe(125);
  expect(result.documents).toEqual([document]);
  expect(result.tripartiteEntries[0]).toMatchObject({
    idRubrica: rubric.id,
    numeroDoc: "NF-REAL-123",
    documentoBancarioNumero: "FITID-REAL-123",
    statusTripartite: "CONCILIADO_PERFEITO",
    statusSalic: "Pendente",
    anexoFiscalUrl: "nota-real.pdf",
    anexoComprovanteUrl: "comprovante-real.pdf",
    gedArquivos: [],
  });
});

import { describe, expect, it } from "vitest";
import type { BankTransaction, BudgetRubric, FiscalDocument } from "../types";
import { runRealtimeTripartiteReconciliation } from "./shadowLedger";

describe("runRealtimeTripartiteReconciliation", () => {
  it("keeps a transaction pending when only the bank receipt is complete", () => {
    const transaction: BankTransaction = {
      id: "tx-pending-fiscal",
      tipo: "DEBITO",
      valor: 200,
      documentoNumero: "DOC-8",
      favorecido: "Fornecedor",
      status: "PENDENTE",
      statusConciliacao: "PENDENTE",
      documentoFiscalCompleto: false,
      temComprovante: true,
      matchedDocId: "doc-8",
    };
    const document: FiscalDocument = {
      id: "doc-8",
      tipo: "NFS-e (Serviço)",
      numeroDoc: "NF-8",
      dataEmissao: "2024-01-01",
      fornecedorNome: "Fornecedor",
      fornecedorCnpjCpf: "00.000.000/0001-00",
      descricaoServico: "Serviço",
      valorBruto: 200,
      valorLiquido: 200,
      arquivoNotaNome: "arquivo-nao-validado.pdf",
      arquivoComprovanteNome: "pix.pdf",
    };
    const rubric: BudgetRubric = {
      id: "rub-1",
      etapa: "Produção / Execução",
      nomeRubrica: "Serviço",
      valorAprovado: 1_000,
      valorExecutado: 200,
    };

    const result = runRealtimeTripartiteReconciliation(
      [transaction],
      [document],
      [rubric],
    );

    expect(result.transactions[0].status).toBe("PENDENTE");
    expect(result.tripartiteEntries[0].statusTripartite).toBe("PENDENTE DE VÍNCULO");
    expect(result.tripartiteEntries[0].gedArquivos?.[0].status).toBe("PENDENTE");
  });
});

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

  it("does not fabricate a positional match for a document without extracted evidence", () => {
    const result = runRealtimeTripartiteReconciliation(
      [{ id: "tx-1", tipo: "DEBITO", valor: 750, favorecido: "Fornecedor real", controleNumero: "12" }],
      [{
        id: "doc-1",
        tipo: "NFS-e (Serviço)",
        numeroDoc: "",
        dataEmissao: "",
        fornecedorNome: "Outro fornecedor",
        fornecedorCnpjCpf: "",
        descricaoServico: "",
        valorBruto: 0,
        valorLiquido: 0,
        controleNumero: "99",
      }],
      [],
    );

    expect(result.matchedCount).toBe(0);
    expect(result.transactions[0].matchedDocId).toBeUndefined();
    expect(result.documents[0].valorBruto).toBe(0);
    expect(result.documents[0].statusComprovacao).not.toBe("Completo");
  });

  it("reconciles when value, control, fiscal evidence, bank evidence and rubric are real", () => {
    const result = runRealtimeTripartiteReconciliation(
      [{
        id: "tx-2",
        tipo: "DEBITO",
        valor: 30_000,
        favorecido: "Circunstância Produções Ltda",
        controleNumero: "1",
        idRubricaVinculada: "rub-direcao",
      }],
      [{
        id: "doc-2",
        tipo: "NFS-e (Serviço)",
        numeroDoc: "222",
        dataEmissao: "2022-01-05",
        fornecedorNome: "Circunstância Produções Ltda",
        fornecedorCnpjCpf: "05.518.874/0001-41",
        descricaoServico: "Direção geral",
        valorBruto: 30_000,
        valorLiquido: 30_000,
        controleNumero: "1",
        evidenciaFiscalExtraida: true,
        evidenciaBancariaExtraida: true,
        arquivoNotaNome: "1. Circunstância Produções - Diretor Geral.pdf",
      }],
      [{
        id: "rub-direcao",
        etapa: "Não identificada nos arquivos",
        nomeRubrica: "Diretor Geral",
        valorAprovado: 0,
        valorExecutado: 0,
      }],
    );

    expect(result.matchedCount).toBe(1);
    expect(result.transactions[0].matchedDocId).toBe("doc-2");
    expect(result.transactions[0].status).toBe("CONCILIADO");
    expect(result.tripartiteEntries[0].checkTripe.rubricaValida).toBe(true);
  });
});

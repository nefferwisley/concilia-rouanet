import { describe, expect, it } from "vitest";
import { initialDocuments, initialRubrics, initialTransactions } from "../data/mockData";
import type { BankTransaction, BudgetRubric, FiscalDocument } from "../types";
import { runRealtimeTripartiteReconciliation } from "./shadowLedger";

describe("runRealtimeTripartiteReconciliation", () => {
  it("does not erase the 96 validated Project 1961 links when incomplete uploads are present", () => {
    const incompleteUploads: FiscalDocument[] = Array.from({ length: 28 }, (_, index) => ({
      id: `incomplete-${index}`,
      tipo: "Documento importado",
      numeroDoc: "",
      dataEmissao: "2026-09-07",
      fornecedorNome: `Arquivo ${index}`,
      fornecedorCnpjCpf: "",
      descricaoServico: "Documento importado",
      valorBruto: 0,
      valorLiquido: 0,
    }));

    const result = runRealtimeTripartiteReconciliation(
      initialTransactions["proj-1961"],
      [...initialDocuments["proj-1961"], ...incompleteUploads],
      initialRubrics["proj-1961"],
    );

    expect(result.matchedCount).toBe(96);
    expect(result.transactions.filter((transaction) => transaction.status === "CONCILIADO")).toHaveLength(96);
  });

  it("preserves a validated legacy reconciliation when the stored document predates file metadata", () => {
    const result = runRealtimeTripartiteReconciliation(
      [{
        id: "tx-legacy",
        tipo: "DEBITO",
        valor: 500,
        status: "CONCILIADO",
        statusConciliacao: "Conciliado",
        matchedDocId: "doc-legacy",
        idDocumentoFiscalVinculado: "doc-legacy",
        idRubricaVinculada: "rub-legacy",
        temComprovante: true,
      }],
      [{
        id: "doc-legacy",
        tipo: "NFS-e (Serviço)",
        numeroDoc: "10",
        dataEmissao: "2022-11-04",
        fornecedorNome: "Fornecedor",
        fornecedorCnpjCpf: "",
        descricaoServico: "Serviço",
        valorBruto: 500,
        valorLiquido: 500,
        idTransacao: "tx-legacy",
        status: "Aprovado / Conciliado",
      }],
      [{
        id: "rub-legacy",
        etapa: "Produção / Execução",
        nomeRubrica: "Serviço",
        valorAprovado: 500,
        valorExecutado: 500,
      }],
    );

    expect(result.matchedCount).toBe(1);
    expect(result.transactions[0].status).toBe("CONCILIADO");
  });

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

  it("propagates the bank document extracted from the payment proof", () => {
    const result = runRealtimeTripartiteReconciliation(
      [{ id: "tx-bank-doc", tipo: "DEBITO", valor: 100, documentoNumero: "1" }],
      [{
        id: "doc-bank-doc",
        tipo: "Documento importado",
        numeroDoc: "NF-1",
        dataEmissao: "2026-09-08",
        fornecedorNome: "Prestador",
        fornecedorCnpjCpf: "",
        descricaoServico: "Serviço",
        valorBruto: 100,
        valorLiquido: 100,
        controleNumero: "1",
        documentoBancarioNumero: "110401",
        evidenciaFiscalExtraida: true,
        evidenciaBancariaExtraida: true,
      }],
      [],
    );

    expect(result.transactions[0].documentoBancario).toBe("110.401");
    expect(result.tripartiteEntries[0].documentoBancarioNumero).toBe("110.401");
  });
});

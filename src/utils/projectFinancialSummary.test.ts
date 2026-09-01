import { describe, expect, it } from "vitest";
import type { BankTransaction } from "../types";
import { initialTransactions } from "../data/mockData";
import { calculateProjectFinancialSummary } from "./projectFinancialSummary";

const debit = (overrides: Partial<BankTransaction> = {}): BankTransaction => ({
  id: "tx-1",
  tipo: "DEBITO",
  valor: 100,
  ...overrides,
});

describe("calculateProjectFinancialSummary", () => {
  it("separates executed, reconciled and pending debit amounts", () => {
    const summary = calculateProjectFinancialSummary([
      debit({ id: "reconciled", valor: 100, status: "CONCILIADO", matchedDocId: "doc-1" }),
      debit({ id: "pending", valor: 40, status: "PENDENTE" }),
      debit({ id: "fee", tipo: "TARIFA", valor: 10, status: "PENDENTE" }),
      debit({ id: "credit", tipo: "CREDITO", valor: 999, status: "CONCILIADO" }),
    ]);

    expect(summary).toEqual({
      totalExecutado: 150,
      totalConciliado: 100,
      totalAConciliar: 50,
      debitCount: 3,
      reconciledDebitCount: 1,
      pendingDebitCount: 2,
    });
  });

  it("does not treat a document link alone as a completed reconciliation", () => {
    const summary = calculateProjectFinancialSummary([
      debit({ id: "linked-only", valor: 75, status: "PENDENTE", matchedDocId: "doc-1" }),
    ]);

    expect(summary.totalConciliado).toBe(0);
    expect(summary.totalAConciliar).toBe(75);
  });

  it("does not treat a reconciled status without a fiscal document as complete", () => {
    const summary = calculateProjectFinancialSummary([
      debit({ id: "status-only", valor: 125, status: "CONCILIADO" }),
    ]);

    expect(summary.totalConciliado).toBe(0);
    expect(summary.totalAConciliar).toBe(125);
    expect(summary.pendingDebitCount).toBe(1);
  });

  it("does not reconcile a transaction explicitly marked with an incomplete fiscal document", () => {
    const summary = calculateProjectFinancialSummary([
      debit({
        id: "incomplete-fiscal-document",
        valor: 125,
        status: "CONCILIADO",
        matchedDocId: "doc-1",
        documentoFiscalCompleto: false,
      }),
    ]);

    expect(summary.totalConciliado).toBe(0);
    expect(summary.totalAConciliar).toBe(125);
    expect(summary.pendingDebitCount).toBe(1);
  });

  it("reconciles only a debit with explicit status and a linked fiscal document", () => {
    const summary = calculateProjectFinancialSummary([
      debit({ id: "complete", valor: 125, status: "CONCILIADO", matchedDocId: "doc-1" }),
    ]);

    expect(summary.totalConciliado).toBe(125);
    expect(summary.totalAConciliar).toBe(0);
    expect(summary.reconciledDebitCount).toBe(1);
    expect(summary.pendingDebitCount).toBe(0);
  });

  it("preserves the verified Project 1961 totals and 96/82 split", () => {
    const reconciled = [
      ...Array.from({ length: 95 }, (_, index) =>
        debit({
          id: `reconciled-${index}`,
          valor: 6_500,
          status: "CONCILIADO",
          matchedDocId: `doc-${index}`,
        }),
      ),
      debit({
        id: "reconciled-final",
        valor: 37_841.36,
        statusConciliacao: "Conciliado",
        idDocumentoFiscalVinculado: "doc-final",
      }),
    ];
    const pending = [
      ...Array.from({ length: 81 }, (_, index) =>
        debit({ id: `pending-${index}`, valor: 2_900, status: "PENDENTE" }),
      ),
      debit({ id: "pending-final", valor: 7_517.79, status: "PENDENTE" }),
    ];

    const summary = calculateProjectFinancialSummary([...reconciled, ...pending]);

    expect(summary).toEqual({
      totalExecutado: 897_759.15,
      totalConciliado: 655_341.36,
      totalAConciliar: 242_417.79,
      debitCount: 178,
      reconciledDebitCount: 96,
      pendingDebitCount: 82,
    });
  });

  it("keeps the real Project 1961 seed aligned with the verified audit", () => {
    const summary = calculateProjectFinancialSummary(initialTransactions["proj-1961"]);

    expect(summary).toEqual({
      totalExecutado: 897_759.15,
      totalConciliado: 655_341.36,
      totalAConciliar: 242_417.79,
      debitCount: 178,
      reconciledDebitCount: 96,
      pendingDebitCount: 82,
    });
  });
});

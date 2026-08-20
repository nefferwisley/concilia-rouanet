import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReconciliationDetail } from "./ReconciliationDetail";

describe("ReconciliationDetail", () => {
  it("shows every required evidence slot", async () => {
    const detailApi = {
      fetchDetail: vi.fn().mockResolvedValue({
        id: "r1",
        projectId: "p1",
        valorDeclarado: 1500.50,
        status: "HUMAN_CONFIRMATION_REQUIRED",
        confidence: 0.95,
        fornecedorDeclarado: "Fornecedor Alpha",
        dataDeclarada: "2024-01-15",
        documentoDeclarado: "NF 1234",
        rubricaDeclarada: "Produção",
        createdAt: "2024-01-15T12:00:00Z",
        links: [
          {
            id: "l1",
            evidenceType: "BANK_MOVEMENT",
            evidenceId: "b1",
            matchType: "DETERMINISTIC",
            score: 0.95,
          },
        ],
        issues: [],
      }),
    };

    render(
      <ReconciliationDetail
        reconciliationId="r1"
        accessToken="token"
        api={detailApi}
      />
    );

    expect(await screen.findByText("Planilha-Base")).toBeInTheDocument();
    expect(screen.getByText("Extrato Bancário")).toBeInTheDocument();
    expect(screen.getByText("Documento Fiscal")).toBeInTheDocument();
    expect(screen.getByText("Comprovante de Pagamento")).toBeInTheDocument();
  });
});

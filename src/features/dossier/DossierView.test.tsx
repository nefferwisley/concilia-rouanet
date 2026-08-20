import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DossierView } from "./DossierView";

describe("DossierView", () => {
  it("disables generation action when blockers are present", async () => {
    const apiWithBlockers = {
      fetchReadiness: vi.fn().mockResolvedValue({
        ready: false,
        projectId: "p1",
        packageName: "ROUANET",
        packageVersion: "1",
        totalReconciliations: 10,
        approvedReconciliations: 5,
        blockers: [
          {
            issueCode: "UNAPPROVED_RECONCILIATIONS",
            severity: "BLOCKER",
            description: "Existem 5 lançamentos pendentes de aprovação humana.",
          },
        ],
      }),
      generateSnapshot: vi.fn(),
    };

    render(
      <DossierView
        projectId="p1"
        accessToken="token"
        api={apiWithBlockers}
      />
    );

    expect(await screen.findByText(/pendências bloqueantes/i)).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: /emitir dossiê oficial/i });
    expect(btn).toBeDisabled();
  });
});

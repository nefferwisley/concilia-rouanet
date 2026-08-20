import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { IssueList } from "./IssueList";

describe("IssueList", () => {
  it("distinguishes unreadable from missing", async () => {
    const apiWithIssues = {
      fetchIssues: vi.fn().mockResolvedValue([
        {
          id: "i1",
          projectId: "p1",
          issueCode: "OCR_FAILED",
          severity: "BLOCKER",
          status: "OPEN",
          description: "Erro de leitura OCR no arquivo NF.pdf",
          createdAt: "2024-01-15T10:00:00Z",
        },
      ]),
    };

    render(
      <IssueList
        projectId="p1"
        accessToken="token"
        api={apiWithIssues}
      />
    );

    expect(await screen.findByText(/erro de leitura ocr/i)).toBeInTheDocument();
    expect(screen.queryByText(/documento ausente confirmado/i)).not.toBeInTheDocument();
  });
});

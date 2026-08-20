import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReconciliationList } from "./ReconciliationList";

describe("ReconciliationList", () => {
  it("shows an explicit empty result without demo rows", async () => {
    const emptyApi = {
      fetchList: vi.fn().mockResolvedValue({
        items: [],
        nextCursor: null,
        totalCount: 0,
      }),
    };

    render(
      <ReconciliationList
        projectId="p1"
        accessToken="token"
        api={emptyApi}
        onSelect={() => {}}
      />
    );

    expect(await screen.findByText(/nenhum lançamento encontrado/i)).toBeInTheDocument();
    expect(screen.queryByText(/Luz & Cena/)).not.toBeInTheDocument();
  });
});

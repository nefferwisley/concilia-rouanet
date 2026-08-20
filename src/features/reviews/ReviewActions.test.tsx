import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReviewActions } from "./ReviewActions";

describe("ReviewActions", () => {
  it("requires a reason before rejecting a suggested link", async () => {
    const mockDecide = vi.fn();
    const api = { decide: mockDecide };

    render(
      <ReviewActions
        reconciliationId="rec-1"
        version={1}
        status="HUMAN_CONFIRMATION_REQUIRED"
        accessToken="token"
        api={api}
        onSuccess={() => {}}
      />
    );

    const rejectBtn = screen.getByRole("button", { name: /rejeitar/i });
    fireEvent.click(rejectBtn);

    const confirmBtn = screen.getByRole("button", { name: /confirmar decisão/i });
    fireEvent.click(confirmBtn);

    expect(mockDecide).not.toHaveBeenCalled();
    expect(await screen.findByText(/informe a justificativa/i)).toBeInTheDocument();
  });
});

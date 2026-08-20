import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthGate } from "./AuthGate";

vi.mock("../hooks/useSession", () => ({
  useSession: () => ({ session: null, loading: false }),
}));

vi.mock("../services/supabaseClient", () => ({
  supabase: { auth: { signInWithOtp: vi.fn() } },
}));

describe("AuthGate", () => {
  it("does not render project data without a session", () => {
    render(
      <AuthGate>
        <div>dados privados</div>
      </AuthGate>,
    );

    expect(screen.queryByText("dados privados")).not.toBeInTheDocument();
    expect(screen.getByText(/entrar/i)).toBeInTheDocument();
  });
});

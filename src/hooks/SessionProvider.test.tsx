import { act, render, screen, waitFor } from "@testing-library/react";
import type { Session } from "@supabase/supabase-js";
import { expect, it, vi } from "vitest";
import { SessionProvider } from "./SessionProvider";
import { useSession } from "./useSession";

const auth = vi.hoisted(() => {
  let callback: ((event: string, session: Session | null) => void) | undefined;
  const unsubscribe = vi.fn();
  return {
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    onAuthStateChange: vi.fn((next: (event: string, session: Session | null) => void) => {
      callback = next;
      return { data: { subscription: { unsubscribe } } };
    }),
    emit(event: string, session: Session | null) {
      callback?.(event, session);
    },
    unsubscribe,
  };
});

vi.mock("../services/supabaseClient", () => ({
  supabase: { auth },
}));

function Consumer({ label }: { label: string }) {
  const { session, loading } = useSession();
  return <span>{label}:{loading ? "loading" : session?.user.id ?? "anonymous"}</span>;
}

it("shares one Supabase subscription across AuthGate, App, and project consumers", async () => {
  const rendered = render(
    <SessionProvider>
      <Consumer label="auth" />
      <Consumer label="app" />
      <Consumer label="projects" />
    </SessionProvider>,
  );

  await waitFor(() => expect(screen.getByText("auth:anonymous")).toBeInTheDocument());
  expect(auth.getSession).toHaveBeenCalledTimes(1);
  expect(auth.onAuthStateChange).toHaveBeenCalledTimes(1);

  act(() => {
    auth.emit("SIGNED_IN", { user: { id: "user-b" } } as Session);
  });
  expect(screen.getByText("app:user-b")).toBeInTheDocument();

  rendered.unmount();
  expect(auth.unsubscribe).toHaveBeenCalledTimes(1);
});

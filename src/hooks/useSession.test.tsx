import { act, renderHook } from "@testing-library/react";
import type { Session } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => {
  let callback: ((event: string, session: unknown) => void) | undefined;

  return {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn((nextCallback: (event: string, session: unknown) => void) => {
      callback = nextCallback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }),
    emit(event: string, session: unknown) {
      callback?.(event, session);
    },
  };
});

vi.mock("../services/supabaseClient", () => ({
  supabase: { auth },
}));

import { useSession } from "./useSession";
import { SessionProvider } from "./SessionProvider";

describe("useSession", () => {
  it("keeps the newer logged-out state when the initial session resolves late", async () => {
    let resolveInitialSession!: (value: { data: { session: Session | null } }) => void;
    auth.getSession.mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveInitialSession = resolve;
      }),
    );

    const { result } = renderHook(() => useSession(), { wrapper: SessionProvider });

    act(() => {
      auth.emit("SIGNED_OUT", null);
    });

    await act(async () => {
      resolveInitialSession({ data: { session: {} as Session } });
    });

    expect(result.current).toEqual({ session: null, loading: false });
  });
});

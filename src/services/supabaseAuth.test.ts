import { afterEach, describe, expect, it, vi } from "vitest";
import { refreshSupabaseSession, signInWithSupabasePassword } from "./supabaseAuth";

describe("signInWithSupabasePassword", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends credentials only to the configured Supabase endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ access_token: "token", refresh_token: "refresh", user: { email: "auditor@example.com" } }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      signInWithSupabasePassword({ url: "https://project.supabase.co", publishableKey: "public-key" }, "auditor@example.com", "secret"),
    ).resolves.toEqual({ accessToken: "token", refreshToken: "refresh", email: "auditor@example.com" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://project.supabase.co/auth/v1/token?grant_type=password",
      expect.objectContaining({ method: "POST", headers: expect.objectContaining({ apikey: "public-key" }) }),
    );
  });

  it("renews an expired session with the refresh token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ access_token: "new-token", refresh_token: "new-refresh" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      refreshSupabaseSession({ url: "https://project.supabase.co", publishableKey: "public-key" }, "old-refresh"),
    ).resolves.toEqual({ accessToken: "new-token", refreshToken: "new-refresh", email: null });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://project.supabase.co/auth/v1/token?grant_type=refresh_token",
      expect.objectContaining({ body: JSON.stringify({ refresh_token: "old-refresh" }) }),
    );
  });

  it("rejects a failed login without returning a token", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error_description: "Invalid login credentials" }), { status: 400 }),
    ));

    await expect(
      signInWithSupabasePassword({ url: "https://project.supabase.co", publishableKey: "public-key" }, "auditor@example.com", "wrong"),
    ).rejects.toThrow("Invalid login credentials");
  });
});

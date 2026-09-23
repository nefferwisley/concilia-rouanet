import { describe, expect, it } from "vitest";
import { buildSupabaseAdminHeaders } from "./supabaseAdminHeaders";

describe("buildSupabaseAdminHeaders", () => {
  it("does not send a new secret key as a Bearer token", () => {
    expect(buildSupabaseAdminHeaders("sb_secret_example")).toEqual({
      apikey: "sb_secret_example",
    });
  });

  it("keeps Bearer authentication for legacy service_role JWTs", () => {
    expect(buildSupabaseAdminHeaders("legacy.jwt.value")).toEqual({
      apikey: "legacy.jwt.value",
      Authorization: "Bearer legacy.jwt.value",
    });
  });

  it("merges request-specific headers", () => {
    expect(buildSupabaseAdminHeaders("sb_secret_example", { "Content-Type": "application/json" })).toEqual({
      apikey: "sb_secret_example",
      "Content-Type": "application/json",
    });
  });
});

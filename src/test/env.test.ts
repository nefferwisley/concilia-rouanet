import { describe, expect, it } from "vitest";
import { readPublicEnv } from "../config/publicEnv";

describe("readPublicEnv", () => {
  it("rejects a service-role key in browser configuration", () => {
    expect(() => readPublicEnv({
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "service_role.secret",
      VITE_API_URL: "https://api.example.test/api/v1",
    })).toThrow(/privilegiada/i);
  });
});

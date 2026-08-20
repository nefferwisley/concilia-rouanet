// @vitest-environment node
import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertPublicEnvSafe, readPublicEnv } from "../config/publicEnv";
import { loadPublicEnvForVite } from "../../vite.config";

describe("readPublicEnv", () => {
  it("rejects a service-role key in browser configuration", () => {
    expect(() => readPublicEnv({
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "service_role.secret",
      VITE_API_URL: "https://api.example.test/api/v1",
    })).toThrow(/privilegiada/i);
  });

  it("rejects a JWT service-role key before browser exposure", () => {
    expect(() => readPublicEnv({
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature",
      VITE_API_URL: "https://api.example.test/api/v1",
    })).toThrow(/privilegiada/i);
  });

  it("rejects current Supabase secret keys in the Vite environment", () => {
    expect(() => assertPublicEnvSafe({
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_secret_example",
    })).toThrow(/privilegiada/i);
  });

  it("returns a trimmed public configuration", () => {
    expect(readPublicEnv({
      VITE_SUPABASE_URL: "  https://example.supabase.co  ",
      VITE_SUPABASE_PUBLISHABLE_KEY: "  anon-key  ",
      VITE_API_URL: "  https://api.example.test/api/v1  ",
    })).toEqual({
      supabaseUrl: "https://example.supabase.co",
      supabasePublishableKey: "anon-key",
      apiUrl: "https://api.example.test/api/v1",
    });
  });

  it("uses the local API URL when none is configured", () => {
    expect(readPublicEnv({
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "anon-key",
    }).apiUrl).toBe("http://localhost:8000/api/v1");
  });

  it("rejects a privileged key loaded from a mode env file", () => {
    const envDir = mkdtempSync(join(tmpdir(), "concilia-vite-env-"));
    writeFileSync(join(envDir, ".env.test"), "VITE_SUPABASE_PUBLISHABLE_KEY=sb_secret_from_file\n");
    try {
      expect(() => loadPublicEnvForVite("test", envDir)).toThrow(/privilegiada/i);
    } finally {
      rmSync(envDir, { recursive: true, force: true });
    }
  });
});

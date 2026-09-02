import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  vi.resetModules();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("API URLs", () => {
  it("derives health from the configured API origin", () => {
    return import("./apiClient").then(({ resolveApiUrls }) => {
    expect(resolveApiUrls("https://api.example.com/api/v1")).toEqual({
      apiBaseUrl: "https://api.example.com/api/v1",
      healthUrl: "https://api.example.com/health",
    });
    });
  });

  it("never defaults to localhost when no browser origin is available", () => {
    return import("./apiClient").then(({ resolveApiUrls }) => {
      expect(resolveApiUrls()).toEqual({
        apiBaseUrl: "/api/v1",
        healthUrl: "/health",
      });
    });
  });

  it("maps the FastAPI project envelope without inventing dashboard fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            total: 1,
            page: 1,
            projetos: [
              {
                id: "1961",
                pronac: "19-1961",
                nome: "Projeto 1961",
                transacoes_count: 178,
                criado_em: "2026-09-01T10:00:00Z",
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );

    const { ApiClient } = await import("./apiClient");
    const client = ApiClient.createForTesting("https://api.example.com/api/v1");

    await expect(client.listProjects()).resolves.toEqual({
      total: 1,
      page: 1,
      projetos: [
        {
          id: "1961",
          pronac: "19-1961",
          nome: "Projeto 1961",
          transacoesCount: 178,
          criadoEm: "2026-09-01T10:00:00Z",
        },
      ],
    });
  });

  it("returns a typed error when projects cannot be read", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));

    const { ApiClient } = await import("./apiClient");
    const client = ApiClient.createForTesting("https://api.example.com/api/v1");

    await expect(client.listProjects()).rejects.toMatchObject({
      name: "ApiClientError",
      status: 401,
    });
  });
});

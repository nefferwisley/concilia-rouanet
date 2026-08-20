import { afterEach, describe, expect, it, vi } from "vitest";
import { listProjects } from "./projectApi";

describe("projectApi", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps the current Portuguese project listing without financial defaults", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            total: 1,
            page: 1,
            projetos: [
              {
                id: "project-1",
                pronac: "123456",
                nome: "Projeto Cultural",
                criado_em: "2026-08-20T10:00:00+00:00",
                transacoes_count: 0,
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(listProjects("token")).resolves.toEqual([
      {
        id: "project-1",
        identifier: "123456",
        name: "Projeto Cultural",
        proponent: "",
        regulatoryPackage: "ROUANET",
        status: "EMPTY",
        createdAt: "2026-08-20T10:00:00+00:00",
      },
    ]);
  });

  it("turns a non-successful project response into ApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "Sem permissão." }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(listProjects("token")).rejects.toMatchObject({
      name: "ApiError",
      status: 403,
      message: "Sem permissão.",
    });
  });

  it("keeps non-JSON HTTP failures typed as ApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("Serviço indisponível", {
          status: 503,
          headers: { "Content-Type": "text/plain" },
        }),
      ),
    );

    await expect(listProjects("token")).rejects.toMatchObject({
      name: "ApiError",
      status: 503,
      message: "A API respondeu com status 503.",
      body: "Serviço indisponível",
    });
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { listProjects } from "./projectApi";

describe("projectApi", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps complete Portuguese project fields into OnlineProject", async () => {
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
                proponente: "Associação Cultural",
                pacote_regulatorio: "FSA_ANCINE",
                status_processamento: "READY",
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
        proponent: "Associação Cultural",
        regulatoryPackage: "FSA_ANCINE",
        status: "READY",
        createdAt: "2026-08-20T10:00:00+00:00",
      },
    ]);
  });

  it("rejects a non-empty project payload that omits required online fields", async () => {
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
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(listProjects("token")).rejects.toMatchObject({
      name: "ApiContractError",
      status: 200,
    });
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

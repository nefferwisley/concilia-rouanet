import { afterEach, describe, expect, it, vi } from "vitest";
import { createProject, listProjects } from "./projectApi";

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

  it("fetches every project page and preserves the backend ordering", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          total: 3,
          page: 1,
          projetos: [
            {
              id: "project-3",
              pronac: "003",
              nome: "Projeto 3",
              proponente: "Proponente 3",
              pacote_regulatorio: "ROUANET",
              status_processamento: "READY",
              criado_em: "2026-08-20T12:00:00+00:00",
            },
            {
              id: "project-2",
              pronac: "002",
              nome: "Projeto 2",
              proponente: "Proponente 2",
              pacote_regulatorio: "FSA_ANCINE",
              status_processamento: "REVIEW",
              criado_em: "2026-08-20T11:00:00+00:00",
            },
          ],
        }), { status: 200, headers: { "Content-Type": "application/json" } }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          total: 3,
          page: 2,
          projetos: [
            {
              id: "project-1",
              pronac: "001",
              nome: "Projeto 1",
              proponente: "Proponente 1",
              pacote_regulatorio: "ROUANET",
              status_processamento: "EMPTY",
              criado_em: "2026-08-20T10:00:00+00:00",
            },
          ],
        }), { status: 200, headers: { "Content-Type": "application/json" } }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const projects = await listProjects("token");

    expect(projects.map((project) => project.id)).toEqual(["project-3", "project-2", "project-1"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new URL(String(fetchMock.mock.calls[0][0])).searchParams.get("page")).toBe("1");
    expect(new URL(String(fetchMock.mock.calls[1][0])).searchParams.get("page")).toBe("2");
  });

  it("terminates pagination safely when the API returns an empty page before its declared total", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ total: 10, page: 1, projetos: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(listProjects("token")).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps an explicit null legacy proponent while requiring the field", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            total: 1,
            page: 1,
            projetos: [
              {
                id: "legacy-project",
                pronac: "LEGACY-001",
                nome: "Projeto legado",
                proponente: null,
                pacote_regulatorio: "ROUANET",
                status_processamento: "READY",
                criado_em: "2026-08-20T10:00:00+00:00",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(listProjects("token")).resolves.toEqual([
      {
        id: "legacy-project",
        identifier: "LEGACY-001",
        name: "Projeto legado",
        proponent: null,
        regulatoryPackage: "ROUANET",
        status: "READY",
        createdAt: "2026-08-20T10:00:00+00:00",
      },
    ]);
  });

  it("serializes required project creation fields in the backend contract", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "project-1",
          pronac: "123456",
          nome: "Projeto Cultural",
          proponente: "Associação Cultural",
          pacote_regulatorio: "FSA_ANCINE",
          status_processamento: "EMPTY",
          criado_em: "2026-08-20T10:00:00+00:00",
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await createProject("token", {
      identifier: "123456",
      name: "Projeto Cultural",
      proponent: "Associação Cultural",
      regulatoryPackage: "FSA_ANCINE",
    });

    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(request.body))).toEqual({
      pronac: "123456",
      nome: "Projeto Cultural",
      proponente: "Associação Cultural",
      pacote_regulatorio: "FSA_ANCINE",
    });
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

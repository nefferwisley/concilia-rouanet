import { describe, expect, it } from "vitest";
import type { OnlineSessionApi } from "../contracts/online";
import { loadOnlineSession } from "./onlineSession";

const project = {
  id: "1961",
  pronac: "19-1961",
  nome: "Projeto 1961",
  transacoesCount: 178,
  criadoEm: "2026-09-01T10:00:00Z",
};

describe("loadOnlineSession", () => {
  it("keeps the saved project when the API returns it", async () => {
    const api: OnlineSessionApi = {
      checkHealth: async () => ({ online: true }),
      listProjects: async () => ({ total: 1, page: 1, projetos: [project] }),
    };

    await expect(loadOnlineSession(api, "1961")).resolves.toEqual({
      status: "ready",
      projects: [project],
      activeProjectId: "1961",
      message: null,
    });
  });

  it("reports an empty account when the healthy API has no project", async () => {
    const api: OnlineSessionApi = {
      checkHealth: async () => ({ online: true }),
      listProjects: async () => ({ total: 0, page: 1, projetos: [] }),
    };

    await expect(loadOnlineSession(api)).resolves.toEqual({
      status: "empty",
      projects: [],
      activeProjectId: null,
      message: "Nenhum projeto disponível para esta conta.",
    });
  });

  it("reports offline when health cannot reach the API", async () => {
    const api: OnlineSessionApi = {
      checkHealth: async () => ({ online: false }),
      listProjects: async () => ({ total: 1, page: 1, projetos: [project] }),
    };

    await expect(loadOnlineSession(api)).resolves.toMatchObject({
      status: "offline",
      projects: [],
      activeProjectId: null,
    });
  });

  it("reports a loading error when the online project request fails", async () => {
    const api: OnlineSessionApi = {
      checkHealth: async () => ({ online: true }),
      listProjects: async () => {
        throw new Error("HTTP 500");
      },
    };

    await expect(loadOnlineSession(api)).resolves.toMatchObject({
      status: "error",
      projects: [],
      activeProjectId: null,
    });
  });
});

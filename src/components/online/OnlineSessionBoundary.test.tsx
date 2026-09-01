import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { OnlineSessionBoundary } from "./OnlineSessionBoundary";

const props = {
  isDemoMode: false,
  onRetry: vi.fn(),
  onSelectProject: vi.fn(),
  children: <p>Painel real</p>,
};

describe("OnlineSessionBoundary", () => {
  it("shows offline instead of dashboard data", () => {
    const html = renderToStaticMarkup(
      <OnlineSessionBoundary
        {...props}
        session={{
          status: "offline",
          projects: [],
          activeProjectId: null,
          message: "Não foi possível conectar ao serviço online.",
        }}
      />,
    );

    expect(html).toContain("Sistema offline");
    expect(html).toContain("Tentar novamente");
    expect(html).not.toContain("Painel real");
  });

  it("shows only API project summary data when ready", () => {
    const html = renderToStaticMarkup(
      <OnlineSessionBoundary
        {...props}
        session={{
          status: "ready",
          activeProjectId: "1961",
          message: null,
          projects: [
            {
              id: "1961",
              pronac: "19-1961",
              nome: "Projeto 1961",
              transacoesCount: 178,
              criadoEm: "2026-09-01T10:00:00Z",
            },
          ],
        }}
      />,
    );

    expect(html).toContain("Projeto 1961");
    expect(html).toContain("178 lançamentos cadastrados");
    expect(html).toContain("Painel real");
  });

  it("suppresses children while a production session loads", () => {
    const html = renderToStaticMarkup(
      <OnlineSessionBoundary
        {...props}
        session={{ status: "loading", projects: [], activeProjectId: null, message: null }}
      />,
    );

    expect(html).toContain("Carregando dados online");
    expect(html).not.toContain("Painel real");
  });
});

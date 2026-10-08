import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClient } from "./apiClient";
import type { StructuredInput } from "../contracts/importValidation";

const input: StructuredInput = { projectId: "p1", format: "xlsx", file: new File(["synthetic"], "planilha.xlsx") };
const client = () => { const c = ApiClient.createForTesting("https://example.test/api/v1"); c.setToken("token-sintetico"); return c; };
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("upload estruturado autenticado", () => {
  it("valida XLSX sem chamar importação e sem fixar Content-Type multipart", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ projeto_id: "p1", linhas_validas: 1 })));
    vi.stubGlobal("fetch", fetcher);
    await client().validateStructuredInput(input);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toBe("https://example.test/api/v1/projetos/p1/planilha/validar");
    const request = fetcher.mock.calls[0][1];
    expect(request.headers).toEqual({ Authorization: "Bearer token-sintetico" });
    expect(request.body.get("arquivo").name).toBe("planilha.xlsx");
  });
  it("valida JSON/YAML com destino explícito e sem modo commit", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ projeto_id: "p1", linhas_validas: 1, apto_para_importar: true })));
    vi.stubGlobal("fetch", fetcher);
    await client().validateStructuredInput({ ...input, format: "json", config: new File(["synthetic"], "config.yaml") });
    expect(fetcher.mock.calls[0][0]).toBe("https://example.test/api/v1/importacoes/validar");
    expect(fetcher.mock.calls[0][1].body.get("projeto_id")).toBe("p1");
    expect(fetcher.mock.calls[0][1].body.get("config_yaml").name).toBe("config.yaml");
    expect(fetcher.mock.calls[0][1].body.has("modo")).toBe(false);
  });
  it("confirma JSON com commit apenas na rota de importação", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ importacao_id: "job-sintetico" }), { status: 202 }));
    vi.stubGlobal("fetch", fetcher);
    await client().importStructuredInput({ ...input, format: "json", config: new File(["synthetic"], "config.yaml") });
    expect(fetcher.mock.calls[0][0]).toBe("https://example.test/api/v1/importacoes");
    expect(fetcher.mock.calls[0][1].body.get("modo")).toBe("commit");
  });
  it("não envia uploads sem autenticação", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const c = client(); c.clearToken();
    await expect(c.validateStructuredInput(input)).rejects.toMatchObject({ status: 401 });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("não envia JSON sem configuração", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await expect(client().validateStructuredInput({ ...input, format: "json" })).rejects.toMatchObject({ status: 400 });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("preserva o diagnóstico do servidor", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: "Cabeçalho ambíguo" }), { status: 400 })));
    await expect(client().validateStructuredInput(input)).rejects.toThrow("Cabeçalho ambíguo");
  });
  it("recusa prévia de outro projeto", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ projeto_id: "p2", linhas_validas: 1 }))));
    await expect(client().validateStructuredInput(input)).rejects.toMatchObject({ status: 502 });
  });
});

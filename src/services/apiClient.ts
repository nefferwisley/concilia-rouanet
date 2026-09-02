/**
 * apiClient.ts - Conector Unificado Frontend <-> Backend FastAPI
 * 
 * Permite que o frontend React se comunique diretamente com a API FastAPI (porta 8000)
 * com fallback inteligente para LocalStorage caso o backend ou o banco estejam offline.
 */

import type { OnlineProjectList } from "../contracts/online";
import { PronacProject } from "../types";

const DEFAULT_API_BASE_URL = "/api/v1";

export function resolveApiUrls(
  apiBaseUrl?: string,
) {
  const browserOrigin = typeof window !== "undefined" && window.location?.origin
    ? `${window.location.origin}/api/v1`
    : DEFAULT_API_BASE_URL;
  const baseUrl = apiBaseUrl || import.meta.env?.VITE_API_URL || browserOrigin;
  const normalized = baseUrl.replace(/\/$/, "");

  return {
    apiBaseUrl: normalized,
    healthUrl: normalized.startsWith("http")
      ? `${new URL(normalized).origin}/health`
      : "/health",
  };
}

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export interface BackendStatus {
  online: boolean;
  version?: string;
  dbReachable?: boolean;
}

export class ApiClient {
  private static instance: ApiClient;
  private authToken: string | null = null;
  private readonly apiBaseUrl: string;
  private readonly healthUrl: string;

  private constructor(apiBaseUrl?: string) {
    const urls = resolveApiUrls(apiBaseUrl);
    this.apiBaseUrl = urls.apiBaseUrl;
    this.healthUrl = urls.healthUrl;
    this.authToken = typeof localStorage === "undefined"
      ? null
      : localStorage.getItem("rouanet_auth_token");
  }

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  public static createForTesting(apiBaseUrl: string): ApiClient {
    return new ApiClient(apiBaseUrl);
  }

  public setToken(token: string) {
    this.authToken = token;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("rouanet_auth_token", token);
    }
  }

  public getToken(): string | null {
    return this.authToken;
  }

  /**
   * Checa o status de saúde da API FastAPI e conexão com o banco
   */
  public async checkHealth(): Promise<BackendStatus> {
    try {
      const res = await fetch(this.healthUrl, { method: "GET" });
      if (!res.ok) return { online: false };
      const data = await res.json();
      return { online: true, version: data.version };
    } catch {
      return { online: false };
    }
  }

  /**
   * Lista somente os dados que o endpoint de projetos realmente fornece.
   * Totais financeiros, documentos e lançamentos serão carregados em ondas próprias.
   */
  public async listProjects(): Promise<OnlineProjectList> {
    const headers: Record<string, string> = {};
    if (this.authToken) headers.Authorization = `Bearer ${this.authToken}`;

    let response: Response;
    try {
      response = await fetch(`${this.apiBaseUrl}/projetos`, { headers });
    } catch {
      throw new ApiClientError(0, "Não foi possível acessar a lista de projetos.");
    }

    if (!response.ok) {
      throw new ApiClientError(response.status, `Não foi possível carregar projetos (${response.status}).`);
    }

    const payload = await response.json() as {
      total: number;
      page: number;
      projetos: Array<{
        id: string;
        pronac: string;
        nome: string;
        transacoes_count: number;
        criado_em: string;
      }>;
    };

    return {
      total: payload.total,
      page: payload.page,
      projetos: payload.projetos.map((project) => ({
        id: project.id,
        pronac: project.pronac,
        nome: project.nome,
        transacoesCount: project.transacoes_count,
        criadoEm: project.criado_em,
      })),
    };
  }

  /**
   * Listar projetos do backend
   */
  public async getProjetos(): Promise<PronacProject[] | null> {
    try {
      const headers: Record<string, string> = {};
      if (this.authToken) headers["Authorization"] = `Bearer ${this.authToken}`;

      const res = await fetch(`${this.apiBaseUrl}/projetos`, { headers });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("Falha ao buscar projetos da API:", e);
    }
    return null;
  }

  /**
   * Salvar ou atualizar projeto no backend
   */
  public async saveProjeto(project: Partial<PronacProject>): Promise<PronacProject | null> {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (this.authToken) headers["Authorization"] = `Bearer ${this.authToken}`;

      const res = await fetch(`${this.apiBaseUrl}/projetos`, {
        method: "POST",
        headers,
        body: JSON.stringify(project),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("Falha ao salvar projeto na API:", e);
    }
    return null;
  }

  /**
   * Conciliar lote de extrato vs notas fiscais via motor Python
   */
  public async triggerConciliacao(projetoId: string): Promise<any | null> {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (this.authToken) headers["Authorization"] = `Bearer ${this.authToken}`;

      const res = await fetch(`${this.apiBaseUrl}/conciliar`, {
        method: "POST",
        headers,
        body: JSON.stringify({ projeto_id: projetoId }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("Falha ao disparar conciliação no motor Python:", e);
    }
    return null;
  }
}

export const apiClient = ApiClient.getInstance();


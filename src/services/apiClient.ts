/**
 * apiClient.ts - Conector Unificado Frontend <-> Backend FastAPI
 * 
 * Permite que o frontend React se comunique diretamente com a API FastAPI (porta 8000)
 * para as APIs FastAPI.
 */

import { PronacProject } from "../types";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function errorMessage(body: unknown, status: number): string {
  if (typeof body === "object" && body !== null && "detail" in body && typeof body.detail === "string") {
    return body.detail;
  }

  return `A API respondeu com status ${status}.`;
}

export async function requestApi<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    const rawBody = await response.text();
    let body: unknown = rawBody;

    try {
      body = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      // Plain-text API errors remain available to callers.
    }

    throw new ApiError(response.status, errorMessage(body, response.status), body);
  }

  return response.json() as Promise<T>;
}

export interface BackendStatus {
  online: boolean;
  version?: string;
  dbReachable?: boolean;
}

export class ApiClient {
  private static instance: ApiClient;
  private authToken: string | null = null;

  private constructor() {}

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  public setToken(token: string) {
    this.authToken = token;
  }

  public getToken(): string | null {
    return this.authToken;
  }

  /**
   * Checa o status de saúde da API FastAPI e conexão com o banco
   */
  public async checkHealth(): Promise<BackendStatus> {
    try {
      const res = await fetch("http://localhost:8000/health", { method: "GET" });
      if (!res.ok) return { online: false };
      const data = await res.json();
      return { online: true, version: data.version };
    } catch {
      return { online: false };
    }
  }

  /**
   * Login de demonstração para desenvolvedores (sem precisar de Supabase)
   */
  public async devDemoLogin(): Promise<{ access_token: string; user: any } | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/dev/demo-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "auditor@cultura.gov.br", nome: "Auditor MinC/FSA" }),
      });
      if (res.ok) {
        const data = await res.json();
        this.setToken(data.access_token);
        return data;
      }
    } catch (e) {
      console.warn("Dev demo login indisponível:", e);
    }
    return null;
  }

  /**
   * Listar projetos do backend
   */
  public async getProjetos(): Promise<PronacProject[] | null> {
    try {
      const headers: Record<string, string> = {};
      if (this.authToken) headers["Authorization"] = `Bearer ${this.authToken}`;

      const res = await fetch(`${API_BASE_URL}/projetos`, { headers });
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

      const res = await fetch(`${API_BASE_URL}/projetos`, {
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

      const res = await fetch(`${API_BASE_URL}/conciliar`, {
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

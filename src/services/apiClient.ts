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

  private authenticatedHeaders(contentType = false): Record<string, string> {
    const headers: Record<string, string> = {};
    if (contentType) headers["Content-Type"] = "application/json";
    if (this.authToken) headers.Authorization = `Bearer ${this.authToken}`;
    return headers;
  }

  public async saveProjectSnapshot(projectId: string, snapshot: unknown): Promise<void> {
    const response = await fetch(`${this.apiBaseUrl}/projetos/${encodeURIComponent(projectId)}/snapshot`, {
      method: "PUT",
      headers: this.authenticatedHeaders(true),
      body: JSON.stringify({ snapshot }),
    });
    if (!response.ok) throw new ApiClientError(response.status, "Não foi possível salvar o projeto online.");
  }

  public async loadProjectSnapshot<T>(projectId: string): Promise<T | null> {
    const response = await fetch(`${this.apiBaseUrl}/projetos/${encodeURIComponent(projectId)}/snapshot`, {
      headers: this.authenticatedHeaders(),
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new ApiClientError(response.status, "Não foi possível carregar o projeto salvo.");
    const payload = await response.json() as { snapshot?: T };
    return payload.snapshot ?? null;
  }

  public async uploadProjectDocument(
    projectId: string,
    documentId: string,
    fileName: string,
    mimeType: string,
    base64: string,
  ): Promise<void> {
    const response = await fetch(`${this.apiBaseUrl}/projetos/${encodeURIComponent(projectId)}/documentos`, {
      method: "POST",
      headers: this.authenticatedHeaders(true),
      body: JSON.stringify({ documentId, fileName, mimeType, base64 }),
    });
    if (!response.ok) throw new ApiClientError(response.status, `Não foi possível armazenar ${fileName}.`);
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

  /**
   * Dispara o pipeline contábil e de conciliação assíncrono oficial
   */
  public async iniciarProcessamento(
    projetoId: string,
    payload: ProcessarPayload = {},
  ): Promise<IniciarProcessamentoResult | null> {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (this.authToken) headers["Authorization"] = `Bearer ${this.authToken}`;

      const res = await fetch(`${this.apiBaseUrl}/projetos/${encodeURIComponent(projetoId)}/processar`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return (await res.json()) as IniciarProcessamentoResult;
      }
    } catch (e) {
      console.warn("Falha ao iniciar processamento do pipeline:", e);
    }
    return null;
  }

  /**
   * Consulta o status de um job de processamento pelo ID
   */
  public async obterStatusProcessamento(jobId: string): Promise<JobProcessamentoStatus | null> {
    try {
      const headers: Record<string, string> = {};
      if (this.authToken) headers["Authorization"] = `Bearer ${this.authToken}`;

      const res = await fetch(`${this.apiBaseUrl}/processamentos/${encodeURIComponent(jobId)}`, { headers });
      if (res.ok) {
        return (await res.json()) as JobProcessamentoStatus;
      }
    } catch (e) {
      console.warn(`Falha ao consultar status do job ${jobId}:`, e);
    }
    return null;
  }

  /**
   * Consulta o status do processamento mais recente para um projeto
   */
  public async obterProcessamentoAtual(projetoId: string): Promise<JobProcessamentoStatus | null> {
    try {
      const headers: Record<string, string> = {};
      if (this.authToken) headers["Authorization"] = `Bearer ${this.authToken}`;

      const res = await fetch(`${this.apiBaseUrl}/projetos/${encodeURIComponent(projetoId)}/processamento-atual`, {
        headers,
      });
      if (res.ok) {
        return (await res.json()) as JobProcessamentoStatus;
      }
    } catch (e) {
      console.warn(`Falha ao consultar processamento atual do projeto ${projetoId}:`, e);
    }
    return null;
  }

  /**
   * Reprocessa um job que falhou ou foi interrompido
   */
  public async reprocessarJob(jobId: string): Promise<IniciarProcessamentoResult | null> {
    try {
      const headers: Record<string, string> = {};
      if (this.authToken) headers["Authorization"] = `Bearer ${this.authToken}`;

      const res = await fetch(`${this.apiBaseUrl}/processamentos/${encodeURIComponent(jobId)}/retry`, {
        method: "POST",
        headers,
      });
      if (res.ok) {
        return (await res.json()) as IniciarProcessamentoResult;
      }
    } catch (e) {
      console.warn(`Falha ao reprocessar job ${jobId}:`, e);
    }
    return null;
  }
}

export interface ProcessarPayload {
  fonte?: string;
  importacao_id?: string;
  caminho_pasta?: string;
  drive_link?: string;
  manifest_hash?: string;
  idempotency_key?: string;
  reprocessar?: boolean;
}

export interface IniciarProcessamentoResult {
  job_id: string;
  projeto_id: string;
  status: string;
  stage: string;
  progress: number;
  message: string;
  status_url: string;
  idempotency_key: string;
  reused: boolean;
}

export interface RegraValidacaoInfo {
  regra: string;
  nome: string;
  sucesso: boolean;
  severidade: string;
  mensagem: string;
  detalhes?: Record<string, any>;
}

export interface JobProcessamentoStatus {
  job_id: string;
  projeto_id: string;
  status: 'queued' | 'running' | 'completed' | 'needs_review' | 'failed' | 'interrompido' | string;
  stage: 'queued' | 'extracting' | 'validating' | 'matching' | 'posting' | 'auditing' | string;
  progress: number;
  processed: number;
  total: number;
  warnings: string[];
  error?: string | null;
  reconciliados: number;
  pendentes: number;
  valor_conciliado: number;
  valor_pendente: number;
  regras_validacao: RegraValidacaoInfo[];
  criado_em: string;
  atualizado_em: string;
}

export const apiClient = ApiClient.getInstance();


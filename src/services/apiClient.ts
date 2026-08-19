/**
 * apiClient.ts - Conector Unificado Frontend <-> Backend FastAPI
 * 
 * Permite que o frontend React se comunique diretamente com a API FastAPI (porta 8000)
 * com fallback inteligente para LocalStorage caso o backend ou o banco estejam offline.
 */

import { PronacProject } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export interface BackendStatus {
  online: boolean;
  version?: string;
  dbReachable?: boolean;
}

export class ApiClient {
  private static instance: ApiClient;
  private authToken: string | null = null;

  private constructor() {
    this.authToken = localStorage.getItem("rouanet_auth_token");
  }

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  public setToken(token: string) {
    this.authToken = token;
    localStorage.setItem("rouanet_auth_token", token);
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

export type DocumentUrlStatus = "IDLE" | "LOADING" | "SUCCESS" | "UNAUTHORIZED" | "NOT_FOUND" | "NETWORK_ERROR" | "ERROR";

export interface DocumentUrlResult {
  signedUrl: string | null;
  fileName?: string;
  mimeType?: string;
  expiresIn?: number;
  status: DocumentUrlStatus;
  errorMessage?: string;
}

interface CacheEntry {
  result: DocumentUrlResult;
  timestamp: number;
}

// TTL de 4 minutos (as URLs assinadas duram 5 minutos / 300s no backend)
const CACHE_TTL_MS = 4 * 60 * 1000;

class DocumentUrlService {
  private cache = new Map<string, CacheEntry>();
  private inFlight = new Map<string, Promise<DocumentUrlResult>>();

  private getCacheKey(documentId: string, projectId: string): string {
    return `${projectId}:${documentId}`;
  }

  public getCached(documentId: string, projectId: string): DocumentUrlResult | null {
    const key = this.getCacheKey(documentId, projectId);
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      this.cache.delete(key);
      return null;
    }
    return entry.result;
  }

  public invalidate(documentId: string, projectId: string): void {
    const key = this.getCacheKey(documentId, projectId);
    this.cache.delete(key);
    this.inFlight.delete(key);
  }

  public async fetchSignedUrl(
    documentId: string,
    projectId: string = "1961",
    forceRefresh: boolean = false
  ): Promise<DocumentUrlResult> {
    const key = this.getCacheKey(documentId, projectId);

    if (!forceRefresh) {
      const cached = this.getCached(documentId, projectId);
      if (cached && cached.status === "SUCCESS") {
        return cached;
      }
    }

    // Deduplicação de requisições concorrentes
    if (this.inFlight.has(key)) {
      return this.inFlight.get(key)!;
    }

    const promise = (async (): Promise<DocumentUrlResult> => {
      try {
        const token = typeof localStorage !== "undefined" ? localStorage.getItem("rouanet_auth_token") : null;
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const configuredBaseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
        const baseUrl = configuredBaseUrl || "/api/v1";

        const res = await fetch(
          `${baseUrl}/documentos/${encodeURIComponent(documentId)}/visualizacao?projectId=${encodeURIComponent(projectId)}`,
          { headers }
        );

        if (res.status === 401) {
          const resObj: DocumentUrlResult = {
            signedUrl: null,
            status: "UNAUTHORIZED",
            errorMessage: "Sessão expirada. Faça login novamente.",
          };
          this.cache.set(key, { result: resObj, timestamp: Date.now() });
          return resObj;
        }

        if (res.status === 404) {
          const resObj: DocumentUrlResult = {
            signedUrl: null,
            status: "NOT_FOUND",
            errorMessage: "Arquivo precisa ser reimportado.",
          };
          this.cache.set(key, { result: resObj, timestamp: Date.now() });
          return resObj;
        }

        if (!res.ok) {
          return {
            signedUrl: null,
            status: res.status >= 500 ? "NETWORK_ERROR" : "ERROR",
            errorMessage: `Erro HTTP ${res.status}. Tente novamente.`,
          };
        }

        const data = await res.json();
        const signedUrl = data.signedUrl || data.signed_url || null;

        if (!signedUrl) {
          return {
            signedUrl: null,
            status: "NOT_FOUND",
            errorMessage: "Arquivo precisa ser reimportado.",
          };
        }

        const successObj: DocumentUrlResult = {
          signedUrl,
          fileName: data.fileName,
          mimeType: data.mimeType,
          expiresIn: data.expiresIn,
          status: "SUCCESS",
        };

        this.cache.set(key, { result: successObj, timestamp: Date.now() });
        return successObj;
      } catch (err: any) {
        return {
          signedUrl: null,
          status: "NETWORK_ERROR",
          errorMessage: "Falha de conexão com o servidor. Tente novamente.",
        };
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }
}

export const documentUrlService = new DocumentUrlService();

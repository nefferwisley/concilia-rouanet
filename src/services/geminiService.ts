import {
  PronacProject,
  BudgetRubric,
  BankTransaction,
  FiscalDocument,
  ComplianceReport,
  ReconciliationMatchResult,
} from "../types";

export interface AnalyzeDocResponse {
  tipoDocumento: string;
  numeroDocumento: string;
  serie?: string;
  dataEmissao: string;
  razaoSocialEmitente: string;
  cnpjCpfEmitente: string;
  razaoSocialTomador?: string;
  cnpjCpfTomador?: string;
  descricaoServico: string;
  valorBruto: number;
  retencoes?: {
    iss: number;
    irrf: number;
    inss: number;
    outras: number;
  };
  valorLiquido: number;
  sugestaoRubrica?: string;
  sugestaoEtapa?: string;
  alertasConformidadeMinC?: string[];
  confiabilidade: number;
}

export async function analyzeDocumentWithAi(params: {
  documentText?: string;
  imageBase64?: string;
  mimeType?: string;
  projectContext?: string;
}): Promise<AnalyzeDocResponse> {
  const res = await fetch("/api/gemini/analyze-document", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Erro HTTP ${res.status}`);
  }

  const json = await res.json();
  return json.data;
}

export async function autoReconcileWithAi(params: {
  bankTransactions: BankTransaction[];
  fiscalDocuments: FiscalDocument[];
  rubrics: BudgetRubric[];
  projectInfo: PronacProject;
}): Promise<{
  matches: ReconciliationMatchResult[];
  unmatchedTransactions: Array<{ transactionId: string; motivo: string; acaoRecomendada: string }>;
  unmatchedDocuments: Array<{ documentId: string; motivo: string }>;
  resumoGeral: string;
}> {
  const res = await fetch("/api/gemini/auto-reconcile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Erro HTTP ${res.status}`);
  }

  const json = await res.json();
  return json.data;
}

export async function auditComplianceWithAi(params: {
  project: PronacProject;
  rubrics: BudgetRubric[];
  transactions: BankTransaction[];
  documents: FiscalDocument[];
}): Promise<ComplianceReport> {
  const res = await fetch("/api/gemini/audit-compliance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Erro HTTP ${res.status}`);
  }

  const json = await res.json();
  return json.data;
}

export async function generateJustificationWithAi(params: {
  tipoOcorrencia: string;
  dadosItem: any;
  contextoProjeto: any;
}): Promise<{
  justificativaFormatada: string;
  artigosBase: string[];
  documentosComplementaresRecomendados: string[];
  orientacaoEnvio: string;
}> {
  const res = await fetch("/api/gemini/generate-justification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Erro HTTP ${res.status}`);
  }

  const json = await res.json();
  return json.data;
}

export async function sendChatAdvisorMessage(params: {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  projectContext: PronacProject;
}): Promise<string> {
  const res = await fetch("/api/gemini/chat-advisor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Erro HTTP ${res.status}`);
  }

  const json = await res.json();
  return json.message;
}

// OFX Parser & Sanitizer API (Banco do Brasil SGML / ISO-8859-1 / UTF-8)
export async function parseOfxFileApi(params: {
  fileContent?: string;
  rawText?: string;
  pronac?: string;
}): Promise<any> {
  const res = await fetch("/api/reconciliation/parse-ofx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Erro HTTP ${res.status}`);
  }

  const json = await res.json();
  return json.data;
}

// Tripartite Auto-Matching Engine (OFX BB x Notas Fiscais x Rubricas SALIC)
export async function matchOfxTransactionsApi(params: {
  transactions: any[];
  documents: any[];
  rubrics: any[];
  project?: any;
}): Promise<{
  matches: any[];
  unmatchedTransactions: any[];
  totalMatches: number;
  totalUnmatched: number;
  resumo: string;
}> {
  const res = await fetch("/api/reconciliation/match-ofx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Erro HTTP ${res.status}`);
  }

  const json = await res.json();
  return json.data;
}

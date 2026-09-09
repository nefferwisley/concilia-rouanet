import React, { useCallback, useEffect, useState } from "react";
import { Navbar } from "./components/Navbar";
import { Sidebar, ActiveTab } from "./components/Sidebar";
import { DashboardView } from "./components/DashboardView";
import { BudgetPlanView } from "./components/BudgetPlanView";
import { ReconciliationView } from "./components/ReconciliationView";
import { DocumentsView } from "./components/DocumentsView";
import { ComplianceAuditView } from "./components/ComplianceAuditView";
import { SalicReportView } from "./components/SalicReportView";
import { AdvisorChatView } from "./components/AdvisorChatView";
import { TaxSponsorshipSimulatorView } from "./components/TaxSponsorshipSimulatorView";
import { TripartiteConciliationView } from "./components/TripartiteConciliationView";
import { ReconciliationCoreSkillsView } from "./components/ReconciliationCoreSkillsView";
import { DriveFolderImportModal } from "./components/DriveFolderImportModal";
import { LangChainRagSelfCorrectionModal } from "./components/LangChainRagSelfCorrectionModal";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AccessibilityToolbar } from "./components/AccessibilityToolbar";
import { OnlineSessionBoundary } from "./components/online/OnlineSessionBoundary";
import { OnlineLoginView } from "./components/OnlineLoginView";
import { FinancialReviewWorkflowView } from "./components/FinancialReviewWorkflowView";
import { SponsorshipManagerView } from "./components/SponsorshipManagerView";
import { ContinuousRiskDashboardView } from "./components/ContinuousRiskDashboardView";
import {
  PronacProject,
  BudgetRubric,
  BankTransaction,
  FiscalDocument,
  AuditAlert,
  TripartiteEntry,
  ReceiptItem,
  UserRole,
} from "./types";
import { auditComplianceWithAi } from "./services/geminiService";
import { apiClient, type StoredProjectDocument } from "./services/apiClient";
import { loadOnlineSession } from "./services/onlineSession";
import { getSupabaseAuthConfiguration } from "./services/supabaseAuth";
import type { OnlineSessionState } from "./contracts/online";
import { exportSalicExcel, exportSalicPdf } from "./utils/exportUtils";
import { runRealtimeTripartiteReconciliation, selfHealDocumentsAndTransactions } from "./utils/shadowLedger";
import { calculateProjectFinancialSummary } from "./utils/projectFinancialSummary";
import {
  sanitizeTransactions,
  sanitizeDocuments,
  sanitizeTripartiteEntries,
} from "./utils/sanitizeFinancialData";
import {
  initialProjects,
  initialRubrics,
  initialTransactions,
  initialDocuments,
  initialAlerts,
  initialTripartiteEntries,
} from "./data/mockData";
import {
  mergeOfficialProject1961,
  mergeOfficialProject1961Dataset,
  OFFICIAL_PROJECT_1961_ACTIVE_VERSION,
  OFFICIAL_PROJECT_1961_ACTIVE_VERSION_KEY,
  OFFICIAL_PROJECT_1961_DATA_VERSION,
  OFFICIAL_PROJECT_1961_DATA_VERSION_KEY,
  resolveInitialActiveProjectId,
} from "./utils/officialProject1961Migration";
import { Plus, X, Building, CheckCircle2, LayoutDashboard, Split, ArrowLeftRight, ShieldCheck, Menu } from "lucide-react";

const STORAGE_KEYS = {
  PROJECTS: "concilia_rouanet_projects_v6",
  ACTIVE_ID: "concilia_rouanet_active_id_v6",
  RUBRICS: "concilia_rouanet_rubrics_v6",
  TRANSACTIONS: "concilia_rouanet_transactions_v6",
  DOCUMENTS: "concilia_rouanet_documents_v6",
  ALERTS: "concilia_rouanet_alerts_v6",
  TRIPARTITE: "concilia_rouanet_tripartite_v6",
  RECEIPTS: "concilia_rouanet_receipts_v6",
  PROJECT_1961_PENDING_MAPPING: "concilia_rouanet_project_1961_pending_mapping_v6",
};

// Se a autenticação online/API não estiver configurada no ambiente (ex: Vercel estático),
// opera diretamente com a base de dados dos projetos locais e auditados (1961 e É Tudo Verdade).
const IS_DEMO_MODE =
  import.meta.env.VITE_DEMO_MODE === "true" ||
  !getSupabaseAuthConfiguration();
const ONLINE_ACTIVE_PROJECT_STORAGE_KEY = "concilia_rouanet_online_active_project_v1";

const shouldRefreshOfficialProject1961 = (): boolean => {
  if (!IS_DEMO_MODE || typeof localStorage === "undefined") return false;
  try {
    if (localStorage.getItem(OFFICIAL_PROJECT_1961_DATA_VERSION_KEY) ===
      OFFICIAL_PROJECT_1961_DATA_VERSION) return false;
    const backupKey = `${OFFICIAL_PROJECT_1961_DATA_VERSION_KEY}_backup`;
    if (!localStorage.getItem(backupKey)) {
      const backup = Object.fromEntries(
        Object.values(STORAGE_KEYS).map((key) => [key, localStorage.getItem(key)]),
      );
      localStorage.setItem(backupKey, JSON.stringify(backup));
    }
    return true;
  } catch (error) {
    console.warn("A atualização do 1961 aguarda espaço para preservar os dados atuais.", error);
    return false;
  }
};

const shouldActivateOfficialProject1961 = (): boolean => {
  if (!IS_DEMO_MODE || typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(OFFICIAL_PROJECT_1961_ACTIVE_VERSION_KEY) !==
      OFFICIAL_PROJECT_1961_ACTIVE_VERSION;
  } catch {
    return false;
  }
};

const EMPTY_PROJECT: PronacProject = {
  id: "",
  pronac: "",
  nome: "",
  proponente: "",
  cnpjCpf: "",
  segmento: "Não informado",
  artigoEnquadramento: "Não informado",
  dataInicioVigencia: "",
  dataFimVigencia: "",
  prazoLimitePrestacao: "",
  valorAprovado: 0,
  valorCaptado: 0,
  valorExecutado: 0,
  bancoInfo: { banco: "", agencia: "", contaCaptacao: "", contaMovimento: "", saldoBloqueado: 0, saldoMovimento: 0, rendimentoAplicacao: 0 },
  status: "Nenhum projeto selecionado",
  resumoProjeto: "",
};

type PersistedWorkspace = {
  projects: PronacProject[];
  activeProjectId: string;
  rubrics: Record<string, BudgetRubric[]>;
  transactions: Record<string, BankTransaction[]>;
  documents: Record<string, FiscalDocument[]>;
  alerts: Record<string, AuditAlert[]>;
  tripartiteEntries: Record<string, TripartiteEntry[]>;
  receipts: Record<string, Record<string, ReceiptItem>>;
};

function restoreStoredDocuments(
  documents: Record<string, FiscalDocument[]>,
  projectId: string,
  storedDocuments: StoredProjectDocument[],
): Record<string, FiscalDocument[]> {
  const existing = documents[projectId] || [];
  const knownIds = new Set(existing.map((document) => document.id));
  const recovered = storedDocuments
    .filter((document) => !knownIds.has(document.documentId))
    .map((document): FiscalDocument => ({
      id: document.documentId,
      tipo: "Documento importado",
      numeroDoc: document.fileName,
      dataEmissao: "",
      fornecedorNome: "",
      fornecedorCnpjCpf: "",
      descricaoServico: `Arquivo armazenado: ${document.fileName}`,
      valorBruto: 0,
      valorLiquido: 0,
      statusComprovacao: "Pendente de revisão",
      arquivoNotaNome: document.fileName,
      arquivoImportado: true,
      arquivoMimeType: document.mimeType,
      arquivoArmazenado: true,
    }));
  return recovered.length ? { ...documents, [projectId]: [...existing, ...recovered] } : documents;
}

function persistWorkspaceSnapshot(snapshot: PersistedWorkspace): boolean {
  if (!IS_DEMO_MODE) return true;
  try {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(snapshot.projects));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ID, snapshot.activeProjectId);
    localStorage.setItem(STORAGE_KEYS.RUBRICS, JSON.stringify(snapshot.rubrics));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(snapshot.transactions));
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(snapshot.documents));
    localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(snapshot.alerts));
    localStorage.setItem(STORAGE_KEYS.TRIPARTITE, JSON.stringify(snapshot.tripartiteEntries));
    localStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(snapshot.receipts));
    if (localStorage.getItem(`${OFFICIAL_PROJECT_1961_DATA_VERSION_KEY}_backup`)) {
      localStorage.setItem(OFFICIAL_PROJECT_1961_DATA_VERSION_KEY, OFFICIAL_PROJECT_1961_DATA_VERSION);
    }
    localStorage.setItem(
      OFFICIAL_PROJECT_1961_ACTIVE_VERSION_KEY,
      OFFICIAL_PROJECT_1961_ACTIVE_VERSION,
    );
    return true;
  } catch (error) {
    console.error("Não foi possível salvar o projeto neste navegador:", error);
    return false;
  }
}

const removePlaceholderBankData = (project: PronacProject): PronacProject => {
  const bank = project.bancoInfo;
  const hasPlaceholderBankData =
    bank?.agencia === "1821-X" &&
    bank?.contaCaptacao === "12345-6" &&
    bank?.contaMovimento === "12345-7" &&
    bank?.saldoMovimento === 300000;

  if (!hasPlaceholderBankData) return project;

  return {
    ...project,
    bancoInfo: {
      banco: "",
      agencia: "",
      contaCaptacao: "",
      contaMovimento: "",
      saldoBloqueado: 0,
      saldoMovimento: 0,
      rendimentoAplicacao: 0,
    },
  };
};

const isSummaryItem = (item: any) => {
  if (!item) return false;
  const text = `${item.descricaoOriginalExtrato || ""} ${item.favorecido || ""} ${item.numeroDoc || ""} ${item.documentoNumero || ""} ${item.descricaoServico || ""}`.toLowerCase();
  return (
    text.includes("pagamentos realizados") ||
    text.includes("total rendimento") ||
    text.includes("total geral") ||
    text.includes("subtotal") ||
    (item.documentoNumero && String(item.documentoNumero).toLowerCase().includes("total"))
  );
};

export default function App() {
  const [hasAuthenticatedSession, setHasAuthenticatedSession] = useState(() => Boolean(apiClient.getToken()));
  const supabaseAuthConfiguration = getSupabaseAuthConfiguration();
  // Carrega os projetos; se o navegador estiver vazio, inicializa com a base oficial (Projeto 1961 e É Tudo Verdade)
  const [projects, setProjects] = useState<PronacProject[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      if (saved) {
        const parsed = (JSON.parse(saved) as PronacProject[]).map(removePlaceholderBankData);
        if (parsed.length > 0) {
          return mergeOfficialProject1961(
            parsed,
            initialProjects,
            shouldRefreshOfficialProject1961(),
          );
        }
      }
    } catch (e) {
      console.warn("Could not load saved projects:", e);
    }
    return initialProjects;
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_ID);
      return resolveInitialActiveProjectId(
        saved,
        projects.map((project) => project.id),
        shouldActivateOfficialProject1961(),
      );
    } catch (e) {
      console.warn("Could not load saved active id:", e);
    }
    return resolveInitialActiveProjectId(
      null,
      projects.map((project) => project.id),
      true,
    );
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>("ADMIN");
  const [rulesContext, setRulesContext] = useState<"SALIC" | "FSA_ANCINE">("SALIC");
  const [onlineSession, setOnlineSession] = useState<OnlineSessionState>({
    status: "loading",
    projects: [],
    activeProjectId: null,
    message: null,
  });
  const [hasOnlineSnapshot, setHasOnlineSnapshot] = useState(false);

  const refreshOnlineSession = useCallback(async () => {
    if (!apiClient.getToken()) {
      setOnlineSession({ status: "error", projects: [], activeProjectId: null, message: "Entre para carregar os projetos online." });
      return;
    }
    const preferredProjectId = localStorage.getItem(ONLINE_ACTIVE_PROJECT_STORAGE_KEY);
    setOnlineSession({ status: "loading", projects: [], activeProjectId: null, message: null });
    const nextSession = await loadOnlineSession(apiClient, preferredProjectId);
    if (nextSession.message === "Sua sessão expirou ou não é mais válida. Entre novamente para acessar os projetos.") {
      apiClient.clearToken();
      setHasAuthenticatedSession(false);
      return;
    }
    setOnlineSession(nextSession);
  }, []);

  useEffect(() => {
    if (!IS_DEMO_MODE && hasAuthenticatedSession) {
      void refreshOnlineSession();
    }
  }, [hasAuthenticatedSession, refreshOnlineSession]);

  // Domain state stored per project
  const [allRubrics, setAllRubrics] = useState<Record<string, BudgetRubric[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RUBRICS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Object.keys(parsed).length > 0) {
          return mergeOfficialProject1961Dataset(
            parsed,
            initialRubrics,
            shouldRefreshOfficialProject1961(),
          );
        }
      }
    } catch (e) {
      console.warn("Could not load saved rubrics:", e);
    }
    return initialRubrics;
  });

  const [allTransactions, setAllTransactions] = useState<Record<string, BankTransaction[]>>(() => {
    let loadedTransactions: Record<string, BankTransaction[]> = {};
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (saved) {
        const parsed: Record<string, BankTransaction[]> = JSON.parse(saved);
        if (parsed && Object.keys(parsed).length > 0) {
          const cleaned: Record<string, BankTransaction[]> = {};
          Object.keys(parsed).forEach((k) => {
            cleaned[k] = sanitizeTransactions(
              (parsed[k] || []).filter((t) => !isSummaryItem(t))
            );
          });
          loadedTransactions = cleaned;
        }
      }
    } catch (e) {
      console.warn("Could not load saved transactions:", e);
    }

    if (Object.keys(loadedTransactions).length === 0) {
      return initialTransactions;
    }

    // Ensure all persisted transactions are sanitized.
    const finalTransactions: Record<string, BankTransaction[]> = {};
    Object.keys(loadedTransactions).forEach((k) => {
      finalTransactions[k] = sanitizeTransactions(loadedTransactions[k] || []);
    });

    return mergeOfficialProject1961Dataset(
      finalTransactions,
      initialTransactions,
      shouldRefreshOfficialProject1961(),
    );
  });

  const [allDocuments, setAllDocuments] = useState<Record<string, FiscalDocument[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
      if (saved) {
        const parsed: Record<string, FiscalDocument[]> = JSON.parse(saved);
        if (parsed && Object.keys(parsed).length > 0) {
          const cleaned: Record<string, FiscalDocument[]> = {};
          Object.keys(parsed).forEach((k) => {
            cleaned[k] = sanitizeDocuments((parsed[k] || []).filter((d) => !isSummaryItem(d)));
          });
          return mergeOfficialProject1961Dataset(
            cleaned,
            initialDocuments,
            shouldRefreshOfficialProject1961(),
          );
        }
      }
    } catch (e) {
      console.warn("Could not load saved documents:", e);
    }
    return initialDocuments;
  });

  const [allAlerts, setAllAlerts] = useState<Record<string, AuditAlert[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ALERTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Object.keys(parsed).length > 0) {
          return mergeOfficialProject1961Dataset(
            parsed,
            initialAlerts,
            shouldRefreshOfficialProject1961(),
          );
        }
      }
    } catch (e) {
      console.warn("Could not load saved alerts:", e);
    }
    return initialAlerts;
  });

  const [allTripartiteEntries, setAllTripartiteEntries] = useState<
    Record<string, TripartiteEntry[]>
  >(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TRIPARTITE);
      if (saved) {
        const parsed: Record<string, TripartiteEntry[]> = JSON.parse(saved);
        if (parsed && Object.keys(parsed).length > 0) {
          const cleaned: Record<string, TripartiteEntry[]> = {};
          Object.keys(parsed).forEach((k) => {
            cleaned[k] = sanitizeTripartiteEntries((parsed[k] || []).filter((trip) => !isSummaryItem(trip)));
          });
          return mergeOfficialProject1961Dataset(
            cleaned,
            initialTripartiteEntries,
            shouldRefreshOfficialProject1961(),
          );
        }
      }
    } catch (e) {
      console.warn("Could not load saved tripartite entries:", e);
    }
    return initialTripartiteEntries;
  });

  const [allReceipts, setAllReceipts] = useState<Record<string, Record<string, ReceiptItem>>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RECEIPTS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Could not load saved receipts:", e);
    }
    return {};
  });

  useEffect(() => {
    const projectId = onlineSession.activeProjectId;
    if (IS_DEMO_MODE || onlineSession.status !== "ready" || !projectId || !apiClient.getToken()) return;
    let active = true;
    void apiClient.loadProjectSnapshot<PersistedWorkspace>(projectId)
      .then(async (snapshot) => {
        if (!active || !snapshot) return;
        const storedDocuments = await apiClient.listProjectDocuments(projectId).catch(() => []);
        if (!active) return;
        const restoredDocuments = restoreStoredDocuments(snapshot.documents || {}, projectId, storedDocuments);
        const projectTransactions = snapshot.transactions?.[projectId] || [];
        const projectDocuments = restoredDocuments[projectId] || [];
        const projectRubrics = snapshot.rubrics?.[projectId] || [];
        const project = snapshot.projects?.find((item) => item.id === projectId);
        const reconciliation = projectTransactions.length > 0 && projectDocuments.length > 0
          ? runRealtimeTripartiteReconciliation(projectTransactions, projectDocuments, projectRubrics, project)
          : null;
        setHasOnlineSnapshot(true);
        setProjects(snapshot.projects?.map(removePlaceholderBankData) || []);
        setActiveProjectId(snapshot.activeProjectId || projectId);
        setAllRubrics(snapshot.rubrics || {});
        setAllTransactions(reconciliation
          ? { ...(snapshot.transactions || {}), [projectId]: reconciliation.transactions }
          : snapshot.transactions || {});
        setAllDocuments(reconciliation
          ? { ...restoredDocuments, [projectId]: reconciliation.documents }
          : restoredDocuments);
        setAllAlerts(snapshot.alerts || {});
        setAllTripartiteEntries(reconciliation
          ? { ...(snapshot.tripartiteEntries || {}), [projectId]: reconciliation.tripartiteEntries }
          : snapshot.tripartiteEntries || {});
        setAllReceipts(snapshot.receipts || {});
      })
      .catch((error) => console.warn("Não foi possível recuperar o último estado online:", error));
    return () => { active = false; };
  }, [onlineSession.activeProjectId, onlineSession.status]);

  // Global AI audit loader
  const [isAuditingGlobal, setIsAuditingGlobal] = useState(false);

  // New project modal state
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isLangChainModalOpen, setIsLangChainModalOpen] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState<Partial<PronacProject>>({
    pronac: "",
    nome: "",
    proponente: "",
    cnpjCpf: "",
    segmento: "Não identificado",
    artigoEnquadramento: "Não identificado",
    dataInicioVigencia: "",
    dataFimVigencia: "",
    prazoLimitePrestacao: "",
    valorAprovado: 0,
    valorCaptado: 0,
    valorExecutado: 0,
    bancoInfo: {
      banco: "",
      agencia: "",
      contaCaptacao: "",
      contaMovimento: "",
      saldoBloqueado: 0,
      saldoMovimento: 0,
      rendimentoAplicacao: 0,
    },
    status: "Cadastrado — aguardando importação",
    resumoProjeto: "",
  });

  // Persist to LocalStorage on change
  useEffect(() => {
    persistWorkspaceSnapshot({
      projects,
      activeProjectId,
      rubrics: allRubrics,
      transactions: allTransactions,
      documents: allDocuments,
      alerts: allAlerts,
      tripartiteEntries: allTripartiteEntries,
      receipts: allReceipts,
    });
  }, [
    projects,
    activeProjectId,
    allRubrics,
    allTransactions,
    allDocuments,
    allAlerts,
    allTripartiteEntries,
    allReceipts,
  ]);

  useEffect(() => {
    if (IS_DEMO_MODE || !hasOnlineSnapshot || !apiClient.getToken() || !activeProjectId) return;
    const timer = window.setTimeout(() => {
      void apiClient.saveProjectSnapshot(activeProjectId, {
        projects,
        activeProjectId,
        rubrics: allRubrics,
        transactions: allTransactions,
        documents: allDocuments,
        alerts: allAlerts,
        tripartiteEntries: allTripartiteEntries,
        receipts: allReceipts,
      }).catch((error) => console.warn("Não foi possível atualizar o projeto online:", error));
    }, 750);
    return () => window.clearTimeout(timer);
  }, [hasOnlineSnapshot, activeProjectId, projects, allRubrics, allTransactions, allDocuments, allAlerts, allTripartiteEntries, allReceipts]);

  // Active Project & Safe arrays
  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0] || EMPTY_PROJECT;

  const currentRubrics: BudgetRubric[] =
    Array.isArray(allRubrics[activeProjectId])
      ? allRubrics[activeProjectId]
      : [];

  const currentTransactions: BankTransaction[] =
    Array.isArray(allTransactions[activeProjectId])
      ? allTransactions[activeProjectId]
      : [];

  const currentDocuments: FiscalDocument[] =
    Array.isArray(allDocuments[activeProjectId])
      ? allDocuments[activeProjectId]
      : [];

  const currentAlerts: AuditAlert[] =
    Array.isArray(allAlerts[activeProjectId])
      ? allAlerts[activeProjectId]
      : [];

  const currentTripartiteEntries: TripartiteEntry[] =
    Array.isArray(allTripartiteEntries[activeProjectId])
      ? allTripartiteEntries[activeProjectId]
      : [];

  // Dynamic recalculation of executed total based on documents & transactions
  const totalExecutadoCalc = currentTransactions
    .filter(
      (t) =>
        (t.tipo === "DEBITO" || t.tipo === "TARIFA" || !t.tipo || (t as any).tipoMovimento === "DEBIT")
    )
    .reduce((sum, t) => sum + (Number(t.valor) || 0), 0);

  const currentProjectWithLiveStats: PronacProject = {
    ...activeProject,
    valorExecutado: totalExecutadoCalc > 0 ? totalExecutadoCalc : activeProject.valorExecutado,
    resumoFinanceiroValidado: {
      ...calculateProjectFinancialSummary(currentTransactions),
      fonte: "Recalculado a partir dos lançamentos importados",
    },
  };

  // State Updaters for active project
  const setRubrics = (action: BudgetRubric[] | ((prev: BudgetRubric[]) => BudgetRubric[])) => {
    setAllRubrics((prev) => {
      const current = prev[activeProjectId] || [];
      const updated = typeof action === "function" ? action(current) : action;
      return { ...prev, [activeProjectId]: updated };
    });
  };

  const setTransactions = (action: BankTransaction[] | ((prev: BankTransaction[]) => BankTransaction[])) => {
    setAllTransactions((prev) => {
      const current = prev[activeProjectId] || [];
      const updated = typeof action === "function" ? action(current) : action;
      return { ...prev, [activeProjectId]: updated };
    });
  };

  const setDocuments = (action: FiscalDocument[] | ((prev: FiscalDocument[]) => FiscalDocument[])) => {
    setAllDocuments((prev) => {
      const current = prev[activeProjectId] || [];
      const updated = typeof action === "function" ? action(current) : action;
      return { ...prev, [activeProjectId]: updated };
    });
  };

  const setAlerts = (action: AuditAlert[] | ((prev: AuditAlert[]) => AuditAlert[])) => {
    setAllAlerts((prev) => {
      const current = prev[activeProjectId] || [];
      const updated = typeof action === "function" ? action(current) : action;
      return { ...prev, [activeProjectId]: updated };
    });
  };

  const setTripartiteEntries = (
    action: TripartiteEntry[] | ((prev: TripartiteEntry[]) => TripartiteEntry[])
  ) => {
    setAllTripartiteEntries((prev) => {
      const current = prev[activeProjectId] || [];
      const updated = typeof action === "function" ? action(current) : action;
      return { ...prev, [activeProjectId]: updated };
    });
  };

  // Shadow Ledger Global Synchronization & Self-Healing
  const handleSelfHealAndSyncAll = () => {
    try {
      const result = runRealtimeTripartiteReconciliation(
        currentTransactions,
        currentDocuments,
        currentRubrics,
        currentProjectWithLiveStats
      );
      setTransactions(result.transactions);
      setDocuments(result.documents);
      setRubrics(result.rubrics);
      setTripartiteEntries(result.tripartiteEntries);
      setAlerts(result.alerts);
    } catch (err) {
      console.warn("Auto-sync error:", err);
    }
  };

  // Auto-heal documents and tripartite entries on mount or project change if any document is unlinked or has zero value
  useEffect(() => {
    if (!IS_DEMO_MODE) return;

    const hasUnhealedDocs =
      currentDocuments.length > 0 &&
      (currentDocuments.some((d) => !d.valorBruto || Number(d.valorBruto) <= 0 || !d.idTransacao) ||
        currentTripartiteEntries.length === 0);

    if (hasUnhealedDocs) {
      handleSelfHealAndSyncAll();
    }
  }, [activeProjectId]);

  // Run overall AI compliance audit
  const handleRunAiAudit = async () => {
    try {
      setIsAuditingGlobal(true);
      const res = await auditComplianceWithAi({
        project: currentProjectWithLiveStats,
        rubrics: currentRubrics,
        transactions: currentTransactions,
        documents: currentDocuments,
      });

      if (res.alertas && res.alertas.length > 0) {
        const newAlerts: AuditAlert[] = res.alertas.map((a: any, idx: number) => ({
          id: `ai-alert-${Date.now()}-${idx}`,
          gravidade: (a.gravidade as any) || "MEDIA",
          categoria: a.categoria || "Geral",
          titulo: a.titulo || "Apontamento Preventivo MinC",
          descricao: a.descricao || "",
          itemAfetado: a.itemAfetado || "Geral",
          baseLegal: a.baseLegal || "IN MinC nº 01/2023",
          acaoRecomendada: a.acaoRecomendada || "Analisar documentação",
          justificativaSugeridaSalic: a.justificativaSugeridaSalic,
          resolvido: false,
        }));

        setAlerts(newAlerts);
        setActiveTab("audit");
      }
    } catch (err: any) {
      alert(`Erro ao executar a auditoria com IA: ${err.message}`);
    } finally {
      setIsAuditingGlobal(false);
    }
  };

  // Receipt Handlers
  const currentReceipts = allReceipts[activeProjectId] || {};
  const handleSaveReceipt = (receipt: ReceiptItem) => {
    setAllReceipts((prev) => {
      const projReceipts = prev[activeProjectId] || {};
      return {
        ...prev,
        [activeProjectId]: {
          ...projReceipts,
          [receipt.transacaoId]: receipt,
        },
      };
    });

    // Se o recibo foi assinado e anexado, atualiza a transação para CONCILIADO
    if (receipt.status === "ASSINADO_ANEXADO") {
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === receipt.transacaoId
            ? {
                ...t,
                status: "CONCILIADO",
                statusConciliacao: "CONCILIADO",
                temComprovante: true,
              }
            : t
        )
      );
    }
  };

  // Rubric Handlers
  const handleAddRubric = (newRubric: BudgetRubric) => {
    setRubrics((prev) => [...prev, newRubric]);
  };

  const handleUpdateRubric = (updatedRubric: BudgetRubric) => {
    setRubrics((prev) => prev.map((r) => (r.id === updatedRubric.id ? updatedRubric : r)));
  };

  // Document Handlers
  const handleAddDocument = (newDoc: FiscalDocument) => {
    setDocuments((prev) => [...prev, newDoc]);
  };

  const handleUpdateDocument = (updatedDoc: FiscalDocument) => {
    setDocuments((prev) => prev.map((d) => (d.id === updatedDoc.id ? updatedDoc : d)));
  };

  const handleDeleteDocument = (docId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  };

  // Handle auto link match from Splink Probabilistic Linkage
  const handleAutoLinkSplinkMatch = (txId: string, docId: string) => {
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === txId
          ? {
              ...t,
              matchedDocId: docId,
              idDocumentoFiscalVinculado: docId,
              conciliationStatus: "CONCILIADO",
              statusConciliacao: "CONCILIADO",
            }
          : t
      )
    );
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === docId
          ? {
              ...d,
              idTransacao: txId,
              status: "CONCILIADO",
            }
          : d
      )
    );
  };

  // Handle New Project Creation
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedPronac = newProjectForm.pronac.replace(/\D/g, "");
    if (!normalizedPronac || !newProjectForm.nome) {
      alert("Por favor, preencha o número do PRONAC e o Nome do Projeto.");
      return;
    }
    if (projects.some((project) => project.pronac.replace(/\D/g, "") === normalizedPronac)) {
      alert("Já existe um projeto cadastrado com este PRONAC.");
      return;
    }

    const newId = `proj-${Date.now()}`;
    const fullNewProject: PronacProject = {
      id: newId,
      pronac: newProjectForm.pronac.trim(),
      nome: newProjectForm.nome.trim(),
      proponente: newProjectForm.proponente?.trim() || "",
      cnpjCpf: newProjectForm.cnpjCpf?.trim() || "",
      segmento: newProjectForm.segmento || "Não identificado",
      artigoEnquadramento: (newProjectForm.artigoEnquadramento as any) || "Não identificado",
      dataInicioVigencia: newProjectForm.dataInicioVigencia || "",
      dataFimVigencia: newProjectForm.dataFimVigencia || "",
      prazoLimitePrestacao: newProjectForm.prazoLimitePrestacao || "",
      valorAprovado: Number(newProjectForm.valorAprovado) || 0,
      valorCaptado: Number(newProjectForm.valorCaptado) || 0,
      valorExecutado: 0,
      bancoInfo: {
        banco: newProjectForm.bancoInfo?.banco || "",
        agencia: newProjectForm.bancoInfo?.agencia || "",
        contaCaptacao: newProjectForm.bancoInfo?.contaCaptacao || "",
        contaMovimento: newProjectForm.bancoInfo?.contaMovimento || "",
        saldoBloqueado: 0,
        saldoMovimento: 0,
        rendimentoAplicacao: 0,
      },
      status: "Cadastrado — aguardando importação",
      resumoProjeto: newProjectForm.resumoProjeto || "",
    };

    const nextProjects = [...projects, fullNewProject];
    const nextRubrics = { ...allRubrics, [newId]: [] };
    const nextTransactions = { ...allTransactions, [newId]: [] };
    const nextDocuments = { ...allDocuments, [newId]: [] };
    const nextAlerts = { ...allAlerts, [newId]: [] };
    const nextTripartiteEntries = { ...allTripartiteEntries, [newId]: [] };
    const snapshot = {
      projects: nextProjects,
      activeProjectId: newId,
      rubrics: nextRubrics,
      transactions: nextTransactions,
      documents: nextDocuments,
      alerts: nextAlerts,
      tripartiteEntries: nextTripartiteEntries,
      receipts: allReceipts,
    };
    const saved = persistWorkspaceSnapshot(snapshot);
    if (IS_DEMO_MODE && !saved) {
      alert("O projeto foi criado, mas este navegador não conseguiu salvá-lo. Libere espaço de armazenamento e tente novamente.");
    }
    if (!IS_DEMO_MODE) {
      try {
        await apiClient.saveProjectSnapshot(newId, snapshot);
      } catch (error) {
        alert(error instanceof Error ? error.message : "Não foi possível salvar o projeto online.");
        return;
      }
      localStorage.setItem(ONLINE_ACTIVE_PROJECT_STORAGE_KEY, newId);
      setHasOnlineSnapshot(true);
      setOnlineSession((current) => ({
        status: "ready",
        projects: [
          { id: newId, pronac: fullNewProject.pronac, nome: fullNewProject.nome, transacoesCount: 0, criadoEm: new Date().toISOString() },
          ...current.projects.filter((project) => project.id !== newId),
        ],
        activeProjectId: newId,
        message: null,
      }));
    }

    setProjects(nextProjects);
    setAllRubrics(nextRubrics);
    setAllTransactions(nextTransactions);
    setAllDocuments(nextDocuments);
    setAllAlerts(nextAlerts);
    setAllTripartiteEntries(nextTripartiteEntries);
    setActiveProjectId(newId);
    setIsNewProjectModalOpen(false);
  };

  const handleDeleteActiveProject = () => {
    const projectToDelete = projects.find((project) => project.id === activeProjectId);
    if (!projectToDelete) return;

    const confirmed = window.confirm(
      `Excluir o projeto ${projectToDelete.pronac} — ${projectToDelete.nome}?\n\nTodos os documentos, lançamentos, rubricas e alertas deste projeto serão removidos deste navegador.`
    );
    if (!confirmed) return;

    const nextProjects = projects.filter((project) => project.id !== activeProjectId);
    const nextActiveProjectId = nextProjects[0]?.id || "";
    const removeProjectData = <T,>(source: Record<string, T>) => {
      const { [activeProjectId]: _removed, ...remaining } = source;
      return remaining;
    };
    const nextRubrics = removeProjectData(allRubrics);
    const nextTransactions = removeProjectData(allTransactions);
    const nextDocuments = removeProjectData(allDocuments);
    const nextAlerts = removeProjectData(allAlerts);
    const nextTripartiteEntries = removeProjectData(allTripartiteEntries);
    const nextReceipts = removeProjectData(allReceipts);
    const saved = persistWorkspaceSnapshot({
      projects: nextProjects,
      activeProjectId: nextActiveProjectId,
      rubrics: nextRubrics,
      transactions: nextTransactions,
      documents: nextDocuments,
      alerts: nextAlerts,
      tripartiteEntries: nextTripartiteEntries,
      receipts: nextReceipts,
    });
    if (!saved) {
      alert("A exclusão foi aplicada, mas este navegador não conseguiu salvá-la. Libere espaço de armazenamento e tente novamente.");
    }

    setProjects(nextProjects);
    setAllRubrics(nextRubrics);
    setAllTransactions(nextTransactions);
    setAllDocuments(nextDocuments);
    setAllAlerts(nextAlerts);
    setAllTripartiteEntries(nextTripartiteEntries);
    setAllReceipts(nextReceipts);
    setActiveProjectId(nextActiveProjectId);
    setActiveTab("dashboard");
  };

  const handleRestoreOriginalData = async () => {
    const restoredBase = initialProjects.find((project) => project.id === "proj-211623");
    if (!restoredBase || !window.confirm("Restaurar o projeto 21.1623 — 27º É Tudo Verdade com seus dados originais?")) return;

    const restoredProject = {
      ...restoredBase,
      cnpjCpf: restoredBase.cnpjCpf === "00.000.000/0001-00" ? "" : restoredBase.cnpjCpf,
    };
    const restoredProjects = [restoredProject, ...projects.filter((project) => project.id !== restoredProject.id)];
    const snapshot = {
      projects: restoredProjects,
      activeProjectId: restoredProject.id,
      rubrics: { ...allRubrics, [restoredProject.id]: initialRubrics[restoredProject.id] || [] },
      transactions: { ...allTransactions, [restoredProject.id]: initialTransactions[restoredProject.id] || [] },
      documents: { ...allDocuments, [restoredProject.id]: initialDocuments[restoredProject.id] || [] },
      alerts: { ...allAlerts, [restoredProject.id]: initialAlerts[restoredProject.id] || [] },
      tripartiteEntries: { ...allTripartiteEntries, [restoredProject.id]: initialTripartiteEntries[restoredProject.id] || [] },
      receipts: allReceipts,
    };

    if (!IS_DEMO_MODE) {
      try {
        await apiClient.saveProjectSnapshot(restoredProject.id, snapshot);
      } catch (error) {
        alert(error instanceof Error ? error.message : "Não foi possível restaurar o projeto online.");
        return;
      }
      localStorage.setItem(ONLINE_ACTIVE_PROJECT_STORAGE_KEY, restoredProject.id);
      setHasOnlineSnapshot(true);
      setOnlineSession((current) => ({
        status: "ready",
        projects: [
          { id: restoredProject.id, pronac: restoredProject.pronac, nome: restoredProject.nome, transacoesCount: snapshot.transactions[restoredProject.id].length, criadoEm: new Date().toISOString() },
          ...current.projects.filter((project) => project.id !== restoredProject.id),
        ],
        activeProjectId: restoredProject.id,
        message: null,
      }));
    } else if (!persistWorkspaceSnapshot(snapshot)) {
      alert("Não foi possível restaurar os dados neste navegador.");
      return;
    }

    setProjects(restoredProjects);
    setActiveProjectId(restoredProject.id);
    setAllRubrics(snapshot.rubrics);
    setAllTransactions(snapshot.transactions);
    setAllDocuments(snapshot.documents);
    setAllAlerts(snapshot.alerts);
    setAllTripartiteEntries(snapshot.tripartiteEntries);
  };

  if (!IS_DEMO_MODE && !hasAuthenticatedSession) {
    return (
      <OnlineLoginView
        configuration={supabaseAuthConfiguration}
        onAuthenticated={(accessToken) => {
          apiClient.setToken(accessToken);
          setHasAuthenticatedSession(true);
        }}
      />
    );
  }

  return (
    <OnlineSessionBoundary
      session={onlineSession}
      isDemoMode={IS_DEMO_MODE}
      onRetry={() => void refreshOnlineSession()}
      onSelectProject={(projectId) => {
        localStorage.setItem(ONLINE_ACTIVE_PROJECT_STORAGE_KEY, projectId);
        setOnlineSession((current) => ({ ...current, activeProjectId: projectId }));
        setActiveProjectId(projectId);
      }}
    >
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Accessibility Toolbar (eMAG / WCAG 2.1) */}
      <AccessibilityToolbar onNavigateTab={(tab) => setActiveTab(tab as any)} />

      {/* Top Main Navigation Bar */}
      <Navbar
        projects={projects}
        activeProject={currentProjectWithLiveStats}
        onSelectProject={(selected) => setActiveProjectId(selected.id)}
        onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)}
        onRestoreOriginalData={() => void handleRestoreOriginalData()}
        onDeleteActiveProject={handleDeleteActiveProject}
        canDeleteActiveProject={projects.length > 0}
        onOpenDriveImportModal={() => setIsDriveModalOpen(true)}
        onOpenLangChainModal={() => setIsLangChainModalOpen(true)}
        onExportExcel={() =>
          exportSalicExcel(
            currentProjectWithLiveStats,
            currentRubrics,
            currentTransactions,
            currentDocuments
          )
        }
        onExportPdf={() =>
          exportSalicPdf(
            currentProjectWithLiveStats,
            currentRubrics,
            currentTransactions,
            currentDocuments,
            currentAlerts
          )
        }
        onRunAiAudit={() => {
          setActiveTab("audit");
          handleRunAiAudit();
        }}
        isAuditing={isAuditingGlobal}
        alerts={currentAlerts}
        isMobileMenuOpen={isMobileNavOpen}
        onToggleMobileMenu={() => setIsMobileNavOpen(!isMobileNavOpen)}
      />

      {/* Contexto normativo e perfil da sessão */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-end gap-3 text-xs">
        <label className="flex items-center gap-2 text-slate-400 font-medium">
          Regras aplicáveis:
          <select
            value={rulesContext}
            onChange={(e) => setRulesContext(e.target.value as "SALIC" | "FSA_ANCINE")}
            className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-1 outline-none focus:border-emerald-500"
          >
            <option value="SALIC">SALIC / PRONAC</option>
            <option value="FSA_ANCINE">FSA / ANCINE</option>
          </select>
          <span className="text-[11px] text-slate-500">
            {rulesContext === "SALIC" ? "SALIC = sistema MinC; PRONAC = número do projeto." : "Regras do Fundo Setorial do Audiovisual."}
          </span>
        </label>
        <span className="text-slate-400 font-medium">Perfil Ativo (RBAC):</span>
        <select
          value={userRole}
          onChange={(e) => setUserRole(e.target.value as UserRole)}
          className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-1 outline-none focus:border-emerald-500"
        >
          <option value="ADMIN">ADMIN</option>
          <option value="AUDITOR">AUDITOR (MinC)</option>
          <option value="PRODUTOR">PRODUTOR (Agente Cultural)</option>
        </select>
      </div>

      {/* Body Area with Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          activeProject={currentProjectWithLiveStats}
          alerts={currentAlerts}
          isMobileOpen={isMobileNavOpen}
          onCloseMobile={() => setIsMobileNavOpen(false)}
        />

        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-8 bg-slate-950/60 w-full min-w-0 pb-20">
          <div className="max-w-7xl mx-auto w-full">
            <ErrorBoundary fallbackTitle="Erro ao carregar a visualização">
              {activeTab === "dashboard" && (
                <DashboardView
                  project={currentProjectWithLiveStats}
                  rubrics={currentRubrics}
                  transactions={currentTransactions}
                  documents={currentDocuments}
                  alerts={currentAlerts}
                  onNavigateTab={setActiveTab}
                  onRunAiAudit={handleRunAiAudit}
                  isAuditing={isAuditingGlobal}
                />
              )}

              {activeTab === "reviewWorkflow" && (
                <FinancialReviewWorkflowView
                  project={currentProjectWithLiveStats}
                  transactions={currentTransactions}
                  documents={currentDocuments}
                  rubrics={currentRubrics}
                  tripartiteEntries={currentTripartiteEntries}
                  receipts={currentReceipts}
                  onSaveReceipt={handleSaveReceipt}
                  onUpdateTransaction={(updated) =>
                    setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
                  }
                  onExportExcel={() =>
                    exportSalicExcel(
                      currentProjectWithLiveStats,
                      currentRubrics,
                      currentTransactions,
                      currentDocuments
                    )
                  }
                  onExportPdf={() =>
                    exportSalicPdf(
                      currentProjectWithLiveStats,
                      currentRubrics,
                      currentTransactions,
                      currentDocuments,
                      currentAlerts
                    )
                  }
                />
              )}

              {activeTab === "tripartite" && (
                <TripartiteConciliationView
                  project={currentProjectWithLiveStats}
                  rubrics={currentRubrics}
                  transactions={currentTransactions}
                  documents={currentDocuments}
                  tripartiteEntries={currentTripartiteEntries}
                  alerts={currentAlerts}
                  onUpdateTripartiteEntries={setTripartiteEntries}
                  onUpdateDocuments={setDocuments}
                  onUpdateTransactions={setTransactions}
                  onUpdateRubrics={setRubrics}
                  onUpdateAlerts={setAlerts}
                />
              )}

              {activeTab === "reconciliation_core" && (
                <ReconciliationCoreSkillsView
                  project={currentProjectWithLiveStats}
                  transactions={currentTransactions}
                  documents={currentDocuments}
                  rubrics={currentRubrics}
                  onRefreshAll={handleSelfHealAndSyncAll}
                  onAutoLinkSplinkMatch={handleAutoLinkSplinkMatch}
                />
              )}

              {activeTab === "budget" && (
                <BudgetPlanView
                  rubrics={currentRubrics}
                  project={currentProjectWithLiveStats}
                  onAddRubric={handleAddRubric}
                  onUpdateRubric={handleUpdateRubric}
                />
              )}

              {activeTab === "reconciliation" && (
                <ReconciliationView
                  transactions={currentTransactions}
                  documents={currentDocuments}
                  rubrics={currentRubrics}
                  project={currentProjectWithLiveStats}
                  alerts={currentAlerts}
                  tripartiteEntries={currentTripartiteEntries}
                  userRole={userRole}
                  onUpdateTransactions={setTransactions}
                  onUpdateDocuments={setDocuments}
                  onUpdateRubrics={setRubrics}
                  onUpdateTripartiteEntries={setTripartiteEntries}
                  onUpdateAlerts={setAlerts}
                />
              )}

              {activeTab === "documents" && (
                <DocumentsView
                  documents={currentDocuments}
                  rubrics={currentRubrics}
                  project={currentProjectWithLiveStats}
                  transactions={currentTransactions}
                  tripartiteEntries={currentTripartiteEntries}
                  onAddDocument={handleAddDocument}
                  onUpdateDocument={handleUpdateDocument}
                  onDeleteDocument={handleDeleteDocument}
                  onUpdateTransactions={setTransactions}
                  onSyncAll={handleSelfHealAndSyncAll}
                />
              )}

              {activeTab === "audit" && (
                <ComplianceAuditView
                  project={currentProjectWithLiveStats}
                  rubrics={currentRubrics}
                  transactions={currentTransactions}
                  documents={currentDocuments}
                  alerts={currentAlerts}
                  onUpdateAlerts={setAlerts}
                  onRunAiAudit={handleRunAiAudit}
                  isAuditing={isAuditingGlobal}
                />
              )}

              {activeTab === "salic" && (
                <SalicReportView
                  project={currentProjectWithLiveStats}
                  rubrics={currentRubrics}
                  transactions={currentTransactions}
                  documents={currentDocuments}
                  alerts={currentAlerts}
                />
              )}

              {activeTab === "advisor" && (
                <AdvisorChatView
                  project={currentProjectWithLiveStats}
                  rubrics={currentRubrics}
                />
              )}

              {activeTab === "simulator" && (
                <TaxSponsorshipSimulatorView project={currentProjectWithLiveStats} />
              )}
              {activeTab === "sponsorship" && (
                <SponsorshipManagerView project={currentProjectWithLiveStats} />
              )}
              {activeTab === "risk_dashboard" && (
                <ContinuousRiskDashboardView project={currentProjectWithLiveStats} alerts={currentAlerts} />
              )}
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* Quick Navigation Bar */}
      <nav
        aria-label="Navegação rápida"
        className="fixed bottom-0 left-0 right-0 md:left-64 z-30 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-around py-1.5 px-2"
      >
        <button
          onClick={() => {
            setActiveTab("dashboard");
            setIsMobileNavOpen(false);
          }}
          className={`flex flex-col items-center justify-center p-1 rounded-lg text-[10px] min-w-[56px] min-h-[44px] ${
            activeTab === "dashboard"
              ? "text-emerald-400 font-bold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5" />
          <span>Painel</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("tripartite");
            setIsMobileNavOpen(false);
          }}
          className={`flex flex-col items-center justify-center p-1 rounded-lg text-[10px] min-w-[56px] min-h-[44px] ${
            activeTab === "tripartite"
              ? "text-emerald-400 font-bold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Split className="w-4 h-4 mb-0.5" />
          <span>Tripartite</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("reconciliation");
            setIsMobileNavOpen(false);
          }}
          className={`flex flex-col items-center justify-center p-1 rounded-lg text-[10px] min-w-[56px] min-h-[44px] ${
            activeTab === "reconciliation"
              ? "text-emerald-400 font-bold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <ArrowLeftRight className="w-4 h-4 mb-0.5" />
          <span>Extrato BB</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("audit");
            setIsMobileNavOpen(false);
          }}
          className={`flex flex-col items-center justify-center p-1 rounded-lg text-[10px] min-w-[56px] min-h-[44px] relative ${
            activeTab === "audit"
              ? "text-emerald-400 font-bold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <ShieldCheck className="w-4 h-4 mb-0.5" />
          <span>Auditoria</span>
          {currentAlerts.filter((a) => !a.resolvido).length > 0 && (
            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-slate-900" />
          )}
        </button>

        <button
          onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
          className={`flex flex-col items-center justify-center p-1 rounded-lg text-[10px] min-w-[56px] min-h-[44px] ${
            isMobileNavOpen
              ? "text-emerald-400 font-bold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Menu className="w-4 h-4 mb-0.5" />
          <span>Mais</span>
        </button>
      </nav>

      {/* Modal: Cadastrar Novo Projeto PRONAC */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Cadastrar Novo Projeto PRONAC</h3>
                  <p className="text-xs text-slate-400">Insira os dados homologados na Portaria do MinC</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewProjectModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Número PRONAC *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 243910"
                    value={newProjectForm.pronac}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, pronac: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Enquadramento Legal</label>
                  <select
                    value={newProjectForm.artigoEnquadramento}
                    onChange={(e) =>
                      setNewProjectForm({
                        ...newProjectForm,
                        artigoEnquadramento: e.target.value as any,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Não identificado">Não identificado nos dados informados</option>
                    <option value="Artigo 18 (100% Renúncia)">Artigo 18 (100% Dedução IRPJ/IRPF)</option>
                    <option value="Artigo 26 (30% / 40% Dedução)">Artigo 26 (Dedução Parcial)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Nome do Projeto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Turnê Sinfônica Caminhos do Barroco"
                  value={newProjectForm.nome}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, nome: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Razão Social / Proponente</label>
                  <input
                    type="text"
                    placeholder="Ex: Associação Cultural Viva"
                    value={newProjectForm.proponente}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, proponente: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">CNPJ / CPF do Proponente</label>
                  <input
                    type="text"
                    placeholder="00.000.000/0001-00"
                    value={newProjectForm.cnpjCpf}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, cnpjCpf: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Valor Aprovado (SALIC) R$</label>
                  <input
                    type="number"
                    value={newProjectForm.valorAprovado}
                    onChange={(e) =>
                      setNewProjectForm({
                        ...newProjectForm,
                        valorAprovado: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Valor Captado R$</label>
                  <input
                    type="number"
                    value={newProjectForm.valorCaptado}
                    onChange={(e) =>
                      setNewProjectForm({
                        ...newProjectForm,
                        valorCaptado: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl flex items-center gap-1.5 transition shadow"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Salvar e Abrir Projeto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Google Drive Folder Extraction Modal */}
      <DriveFolderImportModal
        isOpen={isDriveModalOpen}
        activeProject={currentProjectWithLiveStats}
        currentRubrics={currentRubrics}
        currentTransactions={currentTransactions}
        currentDocuments={currentDocuments}
        currentAlerts={currentAlerts}
        currentTripartiteEntries={currentTripartiteEntries}
        onClose={() => setIsDriveModalOpen(false)}
        onImportComplete={({ project, rubrics, transactions, documents, alerts, tripartiteEntries }) => {
          const nextProjects = [project, ...projects.filter((item) => item.id !== project.id)];
          const nextRubrics = { ...allRubrics, [project.id]: rubrics };
          const nextTransactions = { ...allTransactions, [project.id]: transactions };
          const nextDocuments = { ...allDocuments, [project.id]: documents };
          const nextAlerts = { ...allAlerts, [project.id]: alerts };
          const nextTripartiteEntries = { ...allTripartiteEntries, [project.id]: tripartiteEntries };
          const saved = persistWorkspaceSnapshot({
            projects: nextProjects,
            activeProjectId: project.id,
            rubrics: nextRubrics,
            transactions: nextTransactions,
            documents: nextDocuments,
            alerts: nextAlerts,
            tripartiteEntries: nextTripartiteEntries,
            receipts: allReceipts,
          });
          if (!saved) {
            alert("A importação foi concluída, mas não coube no armazenamento deste navegador. Os dados não serão mantidos após atualizar a página.");
          }

          setProjects(nextProjects);
          setActiveProjectId(project.id);
          setAllRubrics(nextRubrics);
          setAllTransactions(nextTransactions);
          setAllDocuments(nextDocuments);
          setAllAlerts(nextAlerts);
          setAllTripartiteEntries(nextTripartiteEntries);
          setHasOnlineSnapshot(true);

          // Automatically navigate to "reconciliation" so the user can verify all transactions
          setActiveTab("reconciliation");
        }}
      />

      {/* Global LangChain & RAG Self-Correction Modal */}
      <LangChainRagSelfCorrectionModal
        isOpen={isLangChainModalOpen}
        onClose={() => setIsLangChainModalOpen(false)}
        project={currentProjectWithLiveStats}
        rubrics={currentRubrics}
        transactions={currentTransactions}
        documents={currentDocuments}
        alerts={currentAlerts}
        tripartiteEntries={currentTripartiteEntries}
        onApplySync={({ transactions: updatedTxs, documents: updatedDocs, rubrics: updatedRubs, tripartiteEntries: updatedTrips, alerts: updatedAlts }) => {
          setAllTransactions((prev) => ({ ...prev, [activeProjectId]: updatedTxs }));
          setAllDocuments((prev) => ({ ...prev, [activeProjectId]: updatedDocs }));
          setAllRubrics((prev) => ({ ...prev, [activeProjectId]: updatedRubs }));
          setAllTripartiteEntries((prev) => ({ ...prev, [activeProjectId]: updatedTrips }));
          setAllAlerts((prev) => ({ ...prev, [activeProjectId]: updatedAlts }));
        }}
      />

      </div>
    </OnlineSessionBoundary>
  );
}

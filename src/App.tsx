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
import { FinancialReviewWorkflowView } from "./components/FinancialReviewWorkflowView";
import { SponsorshipManagerView } from "./components/SponsorshipManagerView";
import { ContinuousRiskDashboardView } from "./components/ContinuousRiskDashboardView";
import {
  initialProjects,
  initialRubrics,
  initialTransactions,
  initialDocuments,
  initialAlerts,
  initialTripartiteEntries,
} from "./data/mockData";
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
import { apiClient } from "./services/apiClient";
import { loadOnlineSession } from "./services/onlineSession";
import type { OnlineSessionState } from "./contracts/online";
import { exportSalicExcel, exportSalicPdf } from "./utils/exportUtils";
import { runRealtimeTripartiteReconciliation, selfHealDocumentsAndTransactions } from "./utils/shadowLedger";
import {
  applyProject1961PendingMapping,
  PROJECT_1961_PENDING_MAPPING_VERSION,
} from "./utils/project1961PendingMapping";
import {
  sanitizeTransactions,
  sanitizeDocuments,
  sanitizeTripartiteEntries,
} from "./utils/sanitizeFinancialData";
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

const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";
const ONLINE_ACTIVE_PROJECT_STORAGE_KEY = "concilia_rouanet_online_active_project_v1";

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
  // Load state from localStorage or initialize with mock data
  const [projects, setProjects] = useState<PronacProject[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Could not load saved projects:", e);
    }
    return initialProjects;
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_ID);
      if (saved && initialProjects.some((p) => p.id === saved)) return saved;
    } catch (e) {
      console.warn("Could not load saved active id:", e);
    }
    return initialProjects[0]?.id || "proj-1";
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>("ADMIN");
  const [onlineSession, setOnlineSession] = useState<OnlineSessionState>({
    status: "loading",
    projects: [],
    activeProjectId: null,
    message: null,
  });

  const refreshOnlineSession = useCallback(async () => {
    const preferredProjectId = localStorage.getItem(ONLINE_ACTIVE_PROJECT_STORAGE_KEY);
    setOnlineSession({ status: "loading", projects: [], activeProjectId: null, message: null });
    setOnlineSession(await loadOnlineSession(apiClient, preferredProjectId));
  }, []);

  useEffect(() => {
    if (!IS_DEMO_MODE) {
      void refreshOnlineSession();
    }
  }, [refreshOnlineSession]);

  // Domain state stored per project
  const [allRubrics, setAllRubrics] = useState<Record<string, BudgetRubric[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RUBRICS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Could not load saved rubrics:", e);
    }
    return initialRubrics;
  });

  const [allTransactions, setAllTransactions] = useState<Record<string, BankTransaction[]>>(() => {
    let loadedTransactions = initialTransactions;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (saved) {
        const parsed: Record<string, BankTransaction[]> = JSON.parse(saved);
        const cleaned: Record<string, BankTransaction[]> = {};
        Object.keys(parsed).forEach((k) => {
          cleaned[k] = sanitizeTransactions(
            (parsed[k] || []).filter((t) => !isSummaryItem(t))
          );
        });
        loadedTransactions = cleaned;
      }
    } catch (e) {
      console.warn("Could not load saved transactions:", e);
    }

    try {
      const appliedVersion = localStorage.getItem(STORAGE_KEYS.PROJECT_1961_PENDING_MAPPING);
      if (appliedVersion !== PROJECT_1961_PENDING_MAPPING_VERSION) {
        const raw1961 = loadedTransactions["proj-1961"] || initialTransactions["proj-1961"];
        loadedTransactions = {
          ...loadedTransactions,
          "proj-1961": sanitizeTransactions(applyProject1961PendingMapping(raw1961)),
        };
        localStorage.setItem(
          STORAGE_KEYS.PROJECT_1961_PENDING_MAPPING,
          PROJECT_1961_PENDING_MAPPING_VERSION,
        );
      }
    } catch (e) {
      console.warn("Could not apply the verified Project 1961 pending mapping:", e);
    }

    // Ensure all initial transactions are sanitized
    const finalTransactions: Record<string, BankTransaction[]> = {};
    Object.keys(loadedTransactions).forEach((k) => {
      finalTransactions[k] = sanitizeTransactions(loadedTransactions[k] || []);
    });

    return finalTransactions;
  });

  const [allDocuments, setAllDocuments] = useState<Record<string, FiscalDocument[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
      if (saved) {
        const parsed: Record<string, FiscalDocument[]> = JSON.parse(saved);
        const cleaned: Record<string, FiscalDocument[]> = {};
        Object.keys(parsed).forEach((k) => {
          cleaned[k] = sanitizeDocuments((parsed[k] || []).filter((d) => !isSummaryItem(d)));
        });
        return cleaned;
      }
    } catch (e) {
      console.warn("Could not load saved documents:", e);
    }
    const finalDocs: Record<string, FiscalDocument[]> = {};
    Object.keys(initialDocuments).forEach((k) => {
      finalDocs[k] = sanitizeDocuments(initialDocuments[k] || []);
    });
    return finalDocs;
  });

  const [allAlerts, setAllAlerts] = useState<Record<string, AuditAlert[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ALERTS);
      if (saved) return JSON.parse(saved);
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
        const cleaned: Record<string, TripartiteEntry[]> = {};
        Object.keys(parsed).forEach((k) => {
          cleaned[k] = sanitizeTripartiteEntries((parsed[k] || []).filter((trip) => !isSummaryItem(trip)));
        });
        return cleaned;
      }
    } catch (e) {
      console.warn("Could not load saved tripartite entries:", e);
    }
    const finalTrips: Record<string, TripartiteEntry[]> = {};
    Object.keys(initialTripartiteEntries).forEach((k) => {
      finalTrips[k] = sanitizeTripartiteEntries(initialTripartiteEntries[k] || []);
    });
    return finalTrips;
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
    segmento: "Música",
    artigoEnquadramento: "Artigo 18 (100% Renúncia)",
    dataInicioVigencia: new Date().toISOString().slice(0, 10),
    dataFimVigencia: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    prazoLimitePrestacao: new Date(Date.now() + (365 + 60) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    valorAprovado: 300000,
    valorCaptado: 300000,
    valorExecutado: 0,
    bancoInfo: {
      banco: "Banco do Brasil (001)",
      agencia: "1821-X",
      contaCaptacao: "12345-6",
      contaMovimento: "12345-7",
      saldoBloqueado: 0,
      saldoMovimento: 300000,
      rendimentoAplicacao: 0,
    },
    status: "Em Execução",
    resumoProjeto: "",
  });

  // Persist to LocalStorage on change
  useEffect(() => {
    if (!IS_DEMO_MODE) return;

    try {
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_ID, activeProjectId);
      localStorage.setItem(STORAGE_KEYS.RUBRICS, JSON.stringify(allRubrics));
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(allTransactions));
      localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(allDocuments));
      localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(allAlerts));
      localStorage.setItem(STORAGE_KEYS.TRIPARTITE, JSON.stringify(allTripartiteEntries));
      localStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(allReceipts));
    } catch (e) {
      console.warn("Error saving to localStorage:", e);
    }
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

  // Active Project & Safe arrays
  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0] || initialProjects[0];

  const currentRubrics: BudgetRubric[] =
    Array.isArray(allRubrics[activeProjectId]) && allRubrics[activeProjectId].length > 0
      ? allRubrics[activeProjectId]
      : initialRubrics[activeProjectId] || [];

  const currentTransactions: BankTransaction[] =
    Array.isArray(allTransactions[activeProjectId]) && allTransactions[activeProjectId].length > 0
      ? allTransactions[activeProjectId]
      : initialTransactions[activeProjectId] || [];

  const currentDocuments: FiscalDocument[] =
    Array.isArray(allDocuments[activeProjectId]) && allDocuments[activeProjectId].length > 0
      ? allDocuments[activeProjectId]
      : initialDocuments[activeProjectId] || [];

  const currentAlerts: AuditAlert[] =
    Array.isArray(allAlerts[activeProjectId]) && allAlerts[activeProjectId].length > 0
      ? allAlerts[activeProjectId]
      : initialAlerts[activeProjectId] || [];

  const currentTripartiteEntries: TripartiteEntry[] =
    Array.isArray(allTripartiteEntries[activeProjectId]) && allTripartiteEntries[activeProjectId].length > 0
      ? allTripartiteEntries[activeProjectId]
      : initialTripartiteEntries[activeProjectId] || [];

  // Dynamic recalculation of executed total based on documents & transactions
  const totalExecutadoCalc = currentTransactions
    .filter(
      (t) =>
        t.status === "CONCILIADO" &&
        (t.tipo === "DEBITO" || t.tipo === "TARIFA" || !t.tipo || (t as any).tipoMovimento === "DEBIT")
    )
    .reduce((sum, t) => sum + (Number(t.valor) || 0), 0);

  const currentProjectWithLiveStats: PronacProject = {
    ...activeProject,
    valorExecutado: totalExecutadoCalc > 0 ? totalExecutadoCalc : activeProject.valorExecutado,
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
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectForm.pronac || !newProjectForm.nome) {
      alert("Por favor, preencha o número do PRONAC e o Nome do Projeto.");
      return;
    }

    const newId = `proj-${Date.now()}`;
    const fullNewProject: PronacProject = {
      id: newId,
      pronac: newProjectForm.pronac || "000000",
      nome: newProjectForm.nome || "Novo Projeto Cultural",
      proponente: newProjectForm.proponente || "Proponente Cultural",
      cnpjCpf: newProjectForm.cnpjCpf || "00.000.000/0001-00",
      segmento: newProjectForm.segmento || "Música",
      artigoEnquadramento: (newProjectForm.artigoEnquadramento as any) || "Artigo 18 (100% Renúncia)",
      dataInicioVigencia: newProjectForm.dataInicioVigencia || "2024-01-01",
      dataFimVigencia: newProjectForm.dataFimVigencia || "2024-12-31",
      prazoLimitePrestacao: newProjectForm.prazoLimitePrestacao || "2025-02-28",
      valorAprovado: Number(newProjectForm.valorAprovado) || 100000,
      valorCaptado: Number(newProjectForm.valorCaptado) || 100000,
      valorExecutado: 0,
      bancoInfo: {
        banco: "Banco do Brasil (001)",
        agencia: newProjectForm.bancoInfo?.agencia || "0001-9",
        contaCaptacao: newProjectForm.bancoInfo?.contaCaptacao || "10001-1",
        contaMovimento: newProjectForm.bancoInfo?.contaMovimento || "10001-2",
        saldoBloqueado: 0,
        saldoMovimento: Number(newProjectForm.valorCaptado) || 100000,
        rendimentoAplicacao: 0,
      },
      status: "Em Execução",
      resumoProjeto: newProjectForm.resumoProjeto || "",
    };

    setProjects((prev) => [...prev, fullNewProject]);
    setAllRubrics((prev) => ({ ...prev, [newId]: [] }));
    setAllTransactions((prev) => ({ ...prev, [newId]: [] }));
    setAllDocuments((prev) => ({ ...prev, [newId]: [] }));
    setAllAlerts((prev) => ({ ...prev, [newId]: [] }));
    setActiveProjectId(newId);
    setIsNewProjectModalOpen(false);
  };

  if (!IS_DEMO_MODE) {
    return (
      <OnlineSessionBoundary
        session={onlineSession}
        isDemoMode={false}
        onRetry={() => void refreshOnlineSession()}
        onSelectProject={(projectId) => {
          localStorage.setItem(ONLINE_ACTIVE_PROJECT_STORAGE_KEY, projectId);
          setOnlineSession((current) => ({ ...current, activeProjectId: projectId }));
        }}
      >
        <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100">
          <section className="mx-auto max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-8">
            <h1 className="text-2xl font-bold">Sessão online preparada</h1>
            <p className="mt-3 text-slate-300">
              O projeto foi identificado pela API. Lançamentos, documentos e indicadores financeiros
              serão conectados nas próximas etapas, sempre a partir de dados online.
            </p>
          </section>
        </main>
      </OnlineSessionBoundary>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      <div className="bg-amber-400 px-4 py-1 text-center text-xs font-semibold text-slate-950">
        Modo demonstração: os dados abaixo são locais e não representam a operação online.
      </div>
      {/* Top Accessibility Toolbar (eMAG / WCAG 2.1) */}
      <AccessibilityToolbar onNavigateTab={(tab) => setActiveTab(tab as any)} />

      {/* Top Main Navigation Bar */}
      <Navbar
        projects={projects}
        activeProject={currentProjectWithLiveStats}
        onSelectProject={(selected) => setActiveProjectId(selected.id)}
        onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)}
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

      {/* Seletor de Perfil (Role) para teste de RBAC */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-end gap-3 text-xs">
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
        onClose={() => setIsDriveModalOpen(false)}
        onImportComplete={({ project, rubrics, transactions, documents, alerts, tripartiteEntries }) => {
          // Add project and set as active
          setProjects((prev) => {
            const filtered = prev.filter((p) => p.id !== project.id);
            return [project, ...filtered];
          });
          setActiveProjectId(project.id);
          try {
            localStorage.setItem(STORAGE_KEYS.ACTIVE_ID, project.id);
          } catch (e) {}

          // Update domain states
          setAllRubrics((prev) => ({ ...prev, [project.id]: rubrics }));
          setAllTransactions((prev) => ({ ...prev, [project.id]: transactions }));
          setAllDocuments((prev) => ({ ...prev, [project.id]: documents }));
          setAllAlerts((prev) => ({ ...prev, [project.id]: alerts }));
          setAllTripartiteEntries((prev) => ({ ...prev, [project.id]: tripartiteEntries }));

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
  );
}

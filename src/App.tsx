import React, { useState, useEffect, useMemo } from "react";
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
import { EmptyProjectState } from "./components/EmptyProjectState";
import { FinancialReviewWorkflowView } from "./components/FinancialReviewWorkflowView";
import { FinancialDataGate } from "./components/FinancialDataGate";
import {
  PronacProject,
  BudgetRubric,
  BankTransaction,
  FiscalDocument,
  AuditAlert,
  TripartiteEntry,
  ReceiptItem,
} from "./types";
import { auditComplianceWithAi } from "./services/geminiService";
import { exportSalicExcel, exportSalicPdf } from "./utils/exportUtils";
import { runRealtimeTripartiteReconciliation } from "./utils/shadowLedger";
import { X, Building, CheckCircle2, LayoutDashboard, Split, ArrowLeftRight, ShieldCheck, Menu, Coins, Receipt } from "lucide-react";
import { useProjects } from "./features/projects/useProjects";
import { createProject } from "./features/projects/projectApi";
import type { CreateOnlineProjectInput, OnlineProject } from "./features/projects/projectTypes";
import { useSession } from "./hooks/useSession";
import { canRevealFinancialMetrics } from "./utils/financialMetricGate";

function mapOnlineProject(project: OnlineProject, imported?: PronacProject): PronacProject {
  const regulatoryLabel = project.regulatoryPackage === "ROUANET" ? "Lei Rouanet" : "FSA / ANCINE";

  return {
    ...(imported ?? {}),
    id: project.id,
    pronac: project.identifier,
    nome: project.name,
    proponente: project.proponent ?? "",
    cnpjCpf: imported?.cnpjCpf ?? "",
    segmento: regulatoryLabel,
    artigoEnquadramento: regulatoryLabel,
    dataInicioVigencia: imported?.dataInicioVigencia ?? "",
    dataFimVigencia: imported?.dataFimVigencia ?? "",
    prazoLimitePrestacao: imported?.prazoLimitePrestacao ?? "",
    valorAprovado: imported?.valorAprovado ?? 0,
    valorCaptado: imported?.valorCaptado ?? 0,
    valorExecutado: imported?.valorExecutado ?? 0,
    bancoInfo: imported?.bancoInfo ?? {
      banco: "",
      agencia: "",
      contaCaptacao: "",
      contaMovimento: "",
      saldoBloqueado: 0,
      saldoMovimento: 0,
      rendimentoAplicacao: 0,
    },
    status: project.status,
    resumoProjeto: imported?.resumoProjeto ?? "",
    pacoteRegulatorio: project.regulatoryPackage,
    statusProcessamento: project.status,
    criadoEm: project.createdAt,
  };
}

export default function App() {
  const {
    projects: onlineProjects,
    activeProject: selectedOnlineProject,
    activeProjectId,
    loading: projectsLoading,
    error: projectsError,
    setActiveProjectId,
    reload: reloadProjects,
  } = useProjects();
  const { session } = useSession();
  const [importedProjects, setImportedProjects] = useState<Record<string, PronacProject>>({});
  const projects = useMemo(
    () => onlineProjects.map((project) => mapOnlineProject(project, importedProjects[project.id])),
    [importedProjects, onlineProjects],
  );

  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Imported/processed domain data remains session-local until the real upload pipeline is connected.
  const [allRubrics, setAllRubrics] = useState<Record<string, BudgetRubric[]>>({});
  const [allTransactions, setAllTransactions] = useState<Record<string, BankTransaction[]>>({});
  const [allDocuments, setAllDocuments] = useState<Record<string, FiscalDocument[]>>({});
  const [allAlerts, setAllAlerts] = useState<Record<string, AuditAlert[]>>({});
  const [allTripartiteEntries, setAllTripartiteEntries] = useState<Record<string, TripartiteEntry[]>>({});
  const [allReceipts, setAllReceipts] = useState<Record<string, Record<string, ReceiptItem>>>({});

  // Global AI audit loader
  const [isAuditingGlobal, setIsAuditingGlobal] = useState(false);

  // New project modal state
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isLangChainModalOpen, setIsLangChainModalOpen] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [createProjectError, setCreateProjectError] = useState<string | null>(null);
  const [newProjectForm, setNewProjectForm] = useState<CreateOnlineProjectInput>({
    identifier: "",
    name: "",
    proponent: "",
    regulatoryPackage: "ROUANET",
  });

  useEffect(() => {
    if (!projectsLoading && onlineProjects.length > 0 && !selectedOnlineProject) {
      setActiveProjectId(onlineProjects[0].id);
    }
  }, [onlineProjects, projectsLoading, selectedOnlineProject, setActiveProjectId]);

  // Active project metadata comes from the authenticated API; empty domain collections stay empty.
  const effectiveActiveProjectId = selectedOnlineProject?.id ?? onlineProjects[0]?.id ?? null;
  const activeProject = projects.find((project) => project.id === effectiveActiveProjectId) ?? null;
  const projectStateKey = activeProject?.id ?? "";

  const currentRubrics: BudgetRubric[] = projectStateKey ? allRubrics[projectStateKey] ?? [] : [];
  const currentTransactions: BankTransaction[] = projectStateKey ? allTransactions[projectStateKey] ?? [] : [];
  const currentDocuments: FiscalDocument[] = projectStateKey ? allDocuments[projectStateKey] ?? [] : [];
  const currentAlerts: AuditAlert[] = projectStateKey ? allAlerts[projectStateKey] ?? [] : [];
  const currentTripartiteEntries: TripartiteEntry[] = projectStateKey
    ? allTripartiteEntries[projectStateKey] ?? []
    : [];

  // Dynamic recalculation of executed total based on documents & transactions
  const totalExecutadoCalc = currentTransactions
    .filter(
      (t) =>
        t.status === "CONCILIADO" &&
        (t.tipo === "DEBITO" || t.tipo === "TARIFA" || !t.tipo || (t as any).tipoMovimento === "DEBIT")
    )
    .reduce((sum, t) => sum + (Number(t.valor) || 0), 0);

  const currentProjectWithLiveStats: PronacProject | null = activeProject
    ? {
        ...activeProject,
        valorExecutado: totalExecutadoCalc > 0 ? totalExecutadoCalc : activeProject.valorExecutado,
      }
    : null;

  const financialMetricsAvailable = currentProjectWithLiveStats
    ? canRevealFinancialMetrics(currentProjectWithLiveStats, {
        rubrics: currentRubrics,
        transactions: currentTransactions,
        documents: currentDocuments,
        tripartiteEntries: currentTripartiteEntries,
      })
    : false;

  // State Updaters for active project
  const setRubrics = (action: BudgetRubric[] | ((prev: BudgetRubric[]) => BudgetRubric[])) => {
    setAllRubrics((prev) => {
      if (!projectStateKey) return prev;
      const current = prev[projectStateKey] || [];
      const updated = typeof action === "function" ? action(current) : action;
      return { ...prev, [projectStateKey]: updated };
    });
  };

  const setTransactions = (action: BankTransaction[] | ((prev: BankTransaction[]) => BankTransaction[])) => {
    setAllTransactions((prev) => {
      if (!projectStateKey) return prev;
      const current = prev[projectStateKey] || [];
      const updated = typeof action === "function" ? action(current) : action;
      return { ...prev, [projectStateKey]: updated };
    });
  };

  const setDocuments = (action: FiscalDocument[] | ((prev: FiscalDocument[]) => FiscalDocument[])) => {
    setAllDocuments((prev) => {
      if (!projectStateKey) return prev;
      const current = prev[projectStateKey] || [];
      const updated = typeof action === "function" ? action(current) : action;
      return { ...prev, [projectStateKey]: updated };
    });
  };

  const setAlerts = (action: AuditAlert[] | ((prev: AuditAlert[]) => AuditAlert[])) => {
    setAllAlerts((prev) => {
      if (!projectStateKey) return prev;
      const current = prev[projectStateKey] || [];
      const updated = typeof action === "function" ? action(current) : action;
      return { ...prev, [projectStateKey]: updated };
    });
  };

  const setTripartiteEntries = (
    action: TripartiteEntry[] | ((prev: TripartiteEntry[]) => TripartiteEntry[])
  ) => {
    setAllTripartiteEntries((prev) => {
      if (!projectStateKey) return prev;
      const current = prev[projectStateKey] || [];
      const updated = typeof action === "function" ? action(current) : action;
      return { ...prev, [projectStateKey]: updated };
    });
  };

  // Shadow Ledger Global Synchronization & Self-Healing
  const handleSelfHealAndSyncAll = () => {
    if (!currentProjectWithLiveStats) return;

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
    if (!currentProjectWithLiveStats) return;

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
  const currentReceipts = projectStateKey ? allReceipts[projectStateKey] || {} : {};
  const handleSaveReceipt = (receipt: ReceiptItem) => {
    setAllReceipts((prev) => {
      if (!projectStateKey) return prev;
      const projReceipts = prev[projectStateKey] || {};
      return {
        ...prev,
        [projectStateKey]: {
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
    if (!newProjectForm.identifier.trim() || !newProjectForm.name.trim() || !newProjectForm.proponent.trim()) {
      setCreateProjectError("Preencha o identificador, o nome e o proponente do projeto.");
      return;
    }

    if (!session?.access_token) {
      setCreateProjectError("Sua sessão expirou. Entre novamente para criar o projeto.");
      return;
    }

    setIsCreatingProject(true);
    setCreateProjectError(null);
    try {
      const createdProject = await createProject(session.access_token, {
        ...newProjectForm,
        identifier: newProjectForm.identifier.trim(),
        name: newProjectForm.name.trim(),
        proponent: newProjectForm.proponent.trim(),
      });
      await reloadProjects();
      setActiveProjectId(createdProject.id);
      setNewProjectForm({ identifier: "", name: "", proponent: "", regulatoryPackage: "ROUANET" });
      setIsNewProjectModalOpen(false);
    } catch (reason) {
      setCreateProjectError(reason instanceof Error ? reason.message : "Não foi possível criar o projeto.");
    } finally {
      setIsCreatingProject(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Accessibility Toolbar (eMAG / WCAG 2.1) */}
      <AccessibilityToolbar onNavigateTab={(tab) => setActiveTab(tab as any)} />

      {projectsLoading ? (
        <main className="flex flex-1 items-center justify-center p-6 text-sm text-slate-400">
          Carregando projetos...
        </main>
      ) : projectsError ? (
        <main className="flex flex-1 items-center justify-center p-6">
          <section className="max-w-lg rounded-2xl border border-rose-500/30 bg-slate-900 p-6 text-center">
            <h1 className="text-lg font-bold text-white">Não foi possível carregar seus projetos</h1>
            <p className="mt-2 text-sm text-slate-400">{projectsError.message}</p>
            <button
              type="button"
              onClick={() => void reloadProjects()}
              className="mt-5 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-400"
            >
              Tentar novamente
            </button>
          </section>
        </main>
      ) : !currentProjectWithLiveStats ? (
        <EmptyProjectState
          onCreate={() => {
            setCreateProjectError(null);
            setIsNewProjectModalOpen(true);
          }}
        />
      ) : (
        <>
      {/* Top Main Navigation Bar */}
      <Navbar
        projects={projects}
        activeProject={currentProjectWithLiveStats}
        onSelectProject={(selected) => setActiveProjectId(selected.id)}
        onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)}
        onOpenDriveImportModal={() => setIsDriveModalOpen(true)}
        onOpenLangChainModal={() => setIsLangChainModalOpen(true)}
        exportEnabled={financialMetricsAvailable}
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

        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-8 bg-slate-950/60 w-full min-w-0 pb-20 md:pb-8">
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
                <FinancialDataGate
                  project={currentProjectWithLiveStats}
                  rubrics={currentRubrics}
                  transactions={currentTransactions}
                  documents={currentDocuments}
                  tripartiteEntries={currentTripartiteEntries}
                >
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
                </FinancialDataGate>
              )}

              {activeTab === "tripartite" && (
                <FinancialDataGate
                  project={currentProjectWithLiveStats}
                  rubrics={currentRubrics}
                  transactions={currentTransactions}
                  documents={currentDocuments}
                  tripartiteEntries={currentTripartiteEntries}
                >
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
                </FinancialDataGate>
              )}

              {activeTab === "reconciliation_core" && (
                <FinancialDataGate
                  project={currentProjectWithLiveStats}
                  rubrics={currentRubrics}
                  transactions={currentTransactions}
                  documents={currentDocuments}
                >
                <ReconciliationCoreSkillsView
                  project={currentProjectWithLiveStats}
                  transactions={currentTransactions}
                  documents={currentDocuments}
                  rubrics={currentRubrics}
                  onRefreshAll={handleSelfHealAndSyncAll}
                  onAutoLinkSplinkMatch={handleAutoLinkSplinkMatch}
                />
                </FinancialDataGate>
              )}

              {activeTab === "budget" && (
                <FinancialDataGate
                  project={currentProjectWithLiveStats}
                  rubrics={currentRubrics}
                  transactions={currentTransactions}
                  documents={currentDocuments}
                >
                <BudgetPlanView
                  rubrics={currentRubrics}
                  project={currentProjectWithLiveStats}
                  onAddRubric={handleAddRubric}
                  onUpdateRubric={handleUpdateRubric}
                />
                </FinancialDataGate>
              )}

              {activeTab === "reconciliation" && (
                <FinancialDataGate
                  project={currentProjectWithLiveStats}
                  rubrics={currentRubrics}
                  transactions={currentTransactions}
                  documents={currentDocuments}
                  tripartiteEntries={currentTripartiteEntries}
                >
                <ReconciliationView
                  transactions={currentTransactions}
                  documents={currentDocuments}
                  rubrics={currentRubrics}
                  project={currentProjectWithLiveStats}
                  alerts={currentAlerts}
                  tripartiteEntries={currentTripartiteEntries}
                  onUpdateTransactions={setTransactions}
                  onUpdateDocuments={setDocuments}
                  onUpdateRubrics={setRubrics}
                  onUpdateTripartiteEntries={setTripartiteEntries}
                  onUpdateAlerts={setAlerts}
                />
                </FinancialDataGate>
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
                  onSyncAll={handleSelfHealAndSyncAll}
                />
              )}

              {activeTab === "audit" && (
                <FinancialDataGate
                  project={currentProjectWithLiveStats}
                  rubrics={currentRubrics}
                  transactions={currentTransactions}
                  documents={currentDocuments}
                >
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
                </FinancialDataGate>
              )}

              {activeTab === "salic" && (
                <FinancialDataGate
                  project={currentProjectWithLiveStats}
                  rubrics={currentRubrics}
                  transactions={currentTransactions}
                  documents={currentDocuments}
                >
                <SalicReportView
                  project={currentProjectWithLiveStats}
                  rubrics={currentRubrics}
                  transactions={currentTransactions}
                  documents={currentDocuments}
                  alerts={currentAlerts}
                />
                </FinancialDataGate>
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
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (visible only on mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-around py-1.5 px-2">
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
        </>
      )}

      {/* Modal: Cadastrar novo projeto online */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Cadastrar novo projeto</h3>
                  <p className="text-xs text-slate-400">Crie a área online antes de importar os arquivos</p>
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
                  <label htmlFor="new-project-identifier" className="block text-slate-300 font-medium mb-1">PRONAC / Identificador *</label>
                  <input
                    id="new-project-identifier"
                    type="text"
                    required
                    placeholder="Ex: 243910"
                    value={newProjectForm.identifier}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, identifier: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label htmlFor="new-project-regulatory-package" className="block text-slate-300 font-medium mb-1">Pacote regulatório *</label>
                  <select
                    id="new-project-regulatory-package"
                    value={newProjectForm.regulatoryPackage}
                    onChange={(e) =>
                      setNewProjectForm({
                        ...newProjectForm,
                        regulatoryPackage: e.target.value as CreateOnlineProjectInput["regulatoryPackage"],
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="ROUANET">Lei Rouanet</option>
                    <option value="FSA_ANCINE">FSA / ANCINE</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="new-project-name" className="block text-slate-300 font-medium mb-1">Nome do Projeto *</label>
                <input
                  id="new-project-name"
                  type="text"
                  required
                  placeholder="Ex: Turnê Sinfônica Caminhos do Barroco"
                  value={newProjectForm.name}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label htmlFor="new-project-proponent" className="block text-slate-300 font-medium mb-1">Razão social / Proponente *</label>
                <input
                  id="new-project-proponent"
                  type="text"
                  required
                  placeholder="Ex: Associação Cultural Viva"
                  value={newProjectForm.proponent}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, proponent: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {createProjectError && (
                <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-rose-300">
                  {createProjectError}
                </p>
              )}

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
                  disabled={isCreatingProject}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl flex items-center gap-1.5 transition shadow disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isCreatingProject ? "Criando..." : "Criar e abrir projeto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {currentProjectWithLiveStats && (
        <>
      {/* Google Drive Folder Extraction Modal */}
      <DriveFolderImportModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        onImportComplete={({ project, rubrics, transactions, documents, alerts, tripartiteEntries }) => {
          const onlineProjectId = currentProjectWithLiveStats.id;
          setImportedProjects((prev) => ({
            ...prev,
            [onlineProjectId]: {
              ...project,
              id: onlineProjectId,
              pronac: currentProjectWithLiveStats.pronac,
              nome: currentProjectWithLiveStats.nome,
              proponente: currentProjectWithLiveStats.proponente,
              segmento: currentProjectWithLiveStats.segmento,
              artigoEnquadramento: currentProjectWithLiveStats.artigoEnquadramento,
              status: currentProjectWithLiveStats.status,
            },
          }));

          // Update domain states
          setAllRubrics((prev) => ({ ...prev, [onlineProjectId]: rubrics }));
          setAllTransactions((prev) => ({ ...prev, [onlineProjectId]: transactions }));
          setAllDocuments((prev) => ({ ...prev, [onlineProjectId]: documents }));
          setAllAlerts((prev) => ({ ...prev, [onlineProjectId]: alerts }));
          setAllTripartiteEntries((prev) => ({ ...prev, [onlineProjectId]: tripartiteEntries }));

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
          setAllTransactions((prev) => ({ ...prev, [currentProjectWithLiveStats.id]: updatedTxs }));
          setAllDocuments((prev) => ({ ...prev, [currentProjectWithLiveStats.id]: updatedDocs }));
          setAllRubrics((prev) => ({ ...prev, [currentProjectWithLiveStats.id]: updatedRubs }));
          setAllTripartiteEntries((prev) => ({ ...prev, [currentProjectWithLiveStats.id]: updatedTrips }));
          setAllAlerts((prev) => ({ ...prev, [currentProjectWithLiveStats.id]: updatedAlts }));
        }}
      />

      {/* Mobile Floating Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 flex items-center justify-around text-[10px] font-medium shadow-2xl">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition ${
            activeTab === "dashboard" ? "text-emerald-400 font-bold bg-emerald-500/10" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Painel</span>
        </button>

        <button
          onClick={() => setActiveTab("reconciliation")}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition relative ${
            activeTab === "reconciliation" ? "text-emerald-400 font-bold bg-emerald-500/10" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <ArrowLeftRight className="w-4 h-4 text-sky-400" />
          <span>Extrato ({currentTransactions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("tripartite")}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition ${
            activeTab === "tripartite" ? "text-emerald-400 font-bold bg-emerald-500/10" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Split className="w-4 h-4 text-emerald-400" />
          <span>Tripartite</span>
        </button>

        <button
          onClick={() => setActiveTab("budget")}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition ${
            activeTab === "budget" ? "text-emerald-400 font-bold bg-emerald-500/10" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Coins className="w-4 h-4 text-amber-400" />
          <span>Rubricas ({currentRubrics.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("documents")}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition ${
            activeTab === "documents" ? "text-emerald-400 font-bold bg-emerald-500/10" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Receipt className="w-4 h-4 text-rose-400" />
          <span>Notas ({currentDocuments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition relative ${
            activeTab === "audit" ? "text-emerald-400 font-bold bg-emerald-500/10" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Auditoria</span>
          {currentAlerts.filter((a) => !a.resolvido).length > 0 && (
            <span className="absolute top-0.5 right-1 w-2 h-2 rounded-full bg-rose-500" />
          )}
        </button>
      </div>
        </>
      )}
    </div>
  );
}

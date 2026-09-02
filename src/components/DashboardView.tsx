import React, { useRef, useState } from "react";
import {
  Coins,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  ArrowLeftRight,
  ShieldCheck,
  FileSpreadsheet,
  Building2,
  Calendar,
  Sparkles,
  Percent,
  Clock,
  ArrowUpRight,
  Banknote,
  CheckCircle,
  HelpCircle,
  FileText,
  ListTodo,
  Split,
  Search,
  Filter,
  ChevronRight,
  Eye,
  Scale,
  Cpu,
  FileCheck2,
} from "lucide-react";
import { PronacProject, BudgetRubric, BankTransaction, FiscalDocument, AuditAlert } from "../types";
import { formatCurrency, formatDate } from "../utils/formatters";
import {
  calculateProjectFinancialSummary,
  isTransactionReconciled,
} from "../utils/projectFinancialSummary";
import { resolveProviderAndCompany } from "../utils/providerHelper";
import { getTransactionRowKey } from "../utils/transactionRowKey";
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_ORDER,
  ExpenseCategory,
  getExpenseCategoryCounts,
  resolveExpenseCategory,
} from "../utils/expenseCategory";

interface DashboardViewProps {
  project: PronacProject;
  rubrics: BudgetRubric[];
  transactions: BankTransaction[];
  documents: FiscalDocument[];
  alerts: AuditAlert[];
  onNavigateTab: (tab: any) => void;
  onRunAiAudit: () => void;
  isAuditing: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  project,
  rubrics = [],
  transactions = [],
  documents = [],
  alerts = [],
  onNavigateTab,
  onRunAiAudit,
  isAuditing,
}) => {
  const safeRubrics = Array.isArray(rubrics) ? rubrics : [];
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeDocuments = Array.isArray(documents) ? documents : [];
  const safeAlerts = Array.isArray(alerts) ? alerts : [];
  const hasImportedBankStatement = safeTransactions.length > 0;

  const liveFinancialSummary = calculateProjectFinancialSummary(safeTransactions);
  const validatedSummary = project.resumoFinanceiroValidado;
  const hasValidatedSummary = Boolean(
    validatedSummary &&
      [
        validatedSummary.totalExecutado,
        validatedSummary.totalConciliado,
        validatedSummary.totalAConciliar,
        validatedSummary.debitCount,
        validatedSummary.reconciledDebitCount,
        validatedSummary.pendingDebitCount,
      ].every(Number.isFinite),
  );
  const financialSummary = hasValidatedSummary ? validatedSummary! : liveFinancialSummary;
  const summaryDiverges =
    hasValidatedSummary &&
    (Math.round(liveFinancialSummary.totalExecutado * 100) !==
      Math.round(financialSummary.totalExecutado * 100) ||
      Math.round(liveFinancialSummary.totalConciliado * 100) !==
        Math.round(financialSummary.totalConciliado * 100) ||
      liveFinancialSummary.debitCount !== financialSummary.debitCount ||
      liveFinancialSummary.reconciledDebitCount !== financialSummary.reconciledDebitCount);
  const totalExecutado = financialSummary.debitCount > 0 ? financialSummary.totalExecutado : project.valorExecutado;
  const totalConciliado = financialSummary.debitCount > 0 ? financialSummary.totalConciliado : 0;
  const totalAConciliar = financialSummary.debitCount > 0 ? financialSummary.totalAConciliar : totalExecutado;
  const percentConciliado =
    financialSummary.debitCount > 0
      ? Math.round((financialSummary.reconciledDebitCount / financialSummary.debitCount) * 100)
      : 0;
  const percentPendente = financialSummary.debitCount > 0 ? 100 - percentConciliado : 0;

  // Administrative Costs calculation (Max 15% by Lei Rouanet IN 01/2023)
  const adminRubrics = safeRubrics.filter((r) => r.etapa === "Custos Administrativos");
  const totalAdminExecutado = adminRubrics.reduce((sum, r) => sum + r.valorExecutado, 0);
  const percentAdminOfTotal =
    project.valorExecutado > 0
      ? Number(((totalAdminExecutado / project.valorExecutado) * 100).toFixed(1))
      : 0;

  // Divulgacao calculation
  const divRubrics = safeRubrics.filter((r) => r.etapa === "Divulgação / Comercialização");
  const totalDivExecutado = divRubrics.reduce((sum, r) => sum + r.valorExecutado, 0);
  const percentDivOfTotal =
    project.valorExecutado > 0
      ? Number(((totalDivExecutado / project.valorExecutado) * 100).toFixed(1))
      : 0;

  // Reconciliation Stats
  const debitTransactions = safeTransactions.filter(
    (t) => t.tipo === "DEBITO" || t.tipo === "TARIFA" || !t.tipo || (t as any).tipoMovimento === "DEBIT"
  );
  const reconciledTransactions = debitTransactions.filter(isTransactionReconciled);
  const pendingTransactions = debitTransactions.filter((t) => !isTransactionReconciled(t));
  const glosaTransactions = debitTransactions.filter((t) => t.status === "ALERTA_GLOSA");

  // Stages breakdown
  const stages: Array<{
    name: string;
    aprovado: number;
    executado: number;
    color: string;
  }> = [
    {
      name: "Pré-Produção / Preparação",
      aprovado: safeRubrics
        .filter((r) => r.etapa === "Pré-Produção / Preparação")
        .reduce((sum, r) => sum + r.valorAprovado, 0),
      executado: safeRubrics
        .filter((r) => r.etapa === "Pré-Produção / Preparação")
        .reduce((sum, r) => sum + r.valorExecutado, 0),
      color: "bg-cyan-500",
    },
    {
      name: "Produção / Execução",
      aprovado: safeRubrics
        .filter((r) => r.etapa === "Produção / Execução")
        .reduce((sum, r) => sum + r.valorAprovado, 0),
      executado: safeRubrics
        .filter((r) => r.etapa === "Produção / Execução")
        .reduce((sum, r) => sum + r.valorExecutado, 0),
      color: "bg-emerald-500",
    },
    {
      name: "Divulgação / Comercialização",
      aprovado: safeRubrics
        .filter((r) => r.etapa === "Divulgação / Comercialização")
        .reduce((sum, r) => sum + r.valorAprovado, 0),
      executado: safeRubrics
        .filter((r) => r.etapa === "Divulgação / Comercialização")
        .reduce((sum, r) => sum + r.valorExecutado, 0),
      color: "bg-indigo-500",
    },
    {
      name: "Custos Administrativos",
      aprovado: safeRubrics
        .filter((r) => r.etapa === "Custos Administrativos")
        .reduce((sum, r) => sum + r.valorAprovado, 0),
      executado: safeRubrics
        .filter((r) => r.etapa === "Custos Administrativos")
        .reduce((sum, r) => sum + r.valorExecutado, 0),
      color: "bg-amber-500",
    },
    {
      name: "Impostos e Recolhimentos",
      aprovado: safeRubrics
        .filter((r) => r.etapa === "Impostos e Recolhimentos")
        .reduce((sum, r) => sum + r.valorAprovado, 0),
      executado: safeRubrics
        .filter((r) => r.etapa === "Impostos e Recolhimentos")
        .reduce((sum, r) => sum + r.valorExecutado, 0),
      color: "bg-rose-500",
    },
  ];

  const unresolvedAlerts = safeAlerts.filter((a) => !a.resolvido);

  const [txSearch, setTxSearch] = useState("");
  const [txStatusFilter, setTxStatusFilter] = useState<"ALL" | "CONCILIADO" | "PENDENTE" | "DEBITO" | "CREDITO">("ALL");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<ExpenseCategory | "ALL">("ALL");
  const [showAllPreviewTransactions, setShowAllPreviewTransactions] = useState(false);
  const transactionsSectionRef = useRef<HTMLDivElement>(null);
  const pendingDetailMismatch =
    hasValidatedSummary && pendingTransactions.length !== financialSummary.pendingDebitCount;
  const pendingCategoryCounts = getExpenseCategoryCounts(pendingTransactions, safeRubrics);

  const selectTransactionStatus = (status: "ALL" | "CONCILIADO" | "PENDENTE" | "DEBITO" | "CREDITO") => {
    setTxStatusFilter(status);
    if (status !== "PENDENTE") setExpenseCategoryFilter("ALL");
    setShowAllPreviewTransactions(false);
  };

  const showPendingTransactions = () => {
    setTxSearch("");
    setTxStatusFilter("PENDENTE");
    setExpenseCategoryFilter("ALL");
    setShowAllPreviewTransactions(false);
    window.requestAnimationFrame(() => {
      transactionsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const filteredPreviewTransactions = safeTransactions.filter((tx) => {
    const isDebit =
      tx.tipo === "DEBITO" || tx.tipo === "TARIFA" || !tx.tipo || (tx as any).tipoMovimento === "DEBIT";
    if (txStatusFilter === "CONCILIADO" && !isTransactionReconciled(tx)) return false;
    if (txStatusFilter === "PENDENTE" && (!isDebit || isTransactionReconciled(tx))) return false;
    if (txStatusFilter === "DEBITO" && tx.tipo !== "DEBITO" && tx.tipo !== "TARIFA") return false;
    if (txStatusFilter === "CREDITO" && tx.tipo !== "CREDITO" && tx.tipo !== "RENDIMENTO") return false;
    if (
      expenseCategoryFilter !== "ALL" &&
      resolveExpenseCategory(tx, safeRubrics) !== expenseCategoryFilter
    ) return false;

    if (txSearch.trim()) {
      const q = txSearch.toLowerCase();
      const matchDesc = tx.descricao.toLowerCase().includes(q);
      const matchDoc = tx.documentoNumero?.toLowerCase().includes(q);
      const matchObs = tx.observacoes?.toLowerCase().includes(q);
      const matchVal = tx.valor.toString().includes(q);
      return matchDesc || matchDoc || matchObs || matchVal;
    }
    return true;
  });
  const visiblePreviewTransactions = showAllPreviewTransactions
    ? filteredPreviewTransactions
    : filteredPreviewTransactions.slice(0, 10);

  // Workflow checklist steps calculation
  const workflowSteps = [
    {
      id: "budget",
      title: "1. Rubricas Orçamentárias",
      description: `${safeRubrics.length} rubricas parametrizadas`,
      completed: safeRubrics.length > 0,
      tab: "budget",
    },
    {
      id: "reconciliation",
      title: "2. Extrato Bancário",
      description: `${safeTransactions.length} lançamentos importados`,
      completed: safeTransactions.length > 0,
      tab: "reconciliation",
    },
    {
      id: "documents",
      title: "3. Documentos Fiscais",
      description: `${safeDocuments.length} notas/comprovantes anexados`,
      completed: safeDocuments.length > 0,
      tab: "documents",
    },
    {
      id: "reconciliation-match",
      title: "4. Conciliação Tripartite",
      description: `${financialSummary.reconciledDebitCount}/${financialSummary.debitCount} débitos vinculados`,
      completed: financialSummary.debitCount > 0 && financialSummary.pendingDebitCount === 0,
      tab: "tripartite",
    },
    {
      id: "audit",
      title: "5. Auditoria de Conformidade",
      description: unresolvedAlerts.length === 0 ? "Sem alertas pendentes" : `${unresolvedAlerts.length} alerta(s) a revisar`,
      completed: unresolvedAlerts.length === 0,
      tab: "audit",
    },
    {
      id: "salic",
      title: "6. Dossiê SALIC",
      description: "Pronto para exportação oficial",
      completed: financialSummary.pendingDebitCount === 0 && unresolvedAlerts.length === 0,
      tab: "salic",
    },
  ];

  const completedStepsCount = workflowSteps.filter((s) => s.completed).length;
  const readinessPercent = Math.round((completedStepsCount / workflowSteps.length) * 100);

  return (
    <div className="space-y-6">
      {/* Top Banner / Project Meta Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                PRONAC {project.pronac}
              </span>
              <span className="text-xs bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-0.5 rounded-full">
                {project.segmento}
              </span>
              <span className="text-xs bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2.5 py-0.5 rounded-full font-medium">
                {project.artigoEnquadramento}
              </span>
              <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Clock className="w-3 h-3" /> {project.status}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">{project.nome}</h1>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span>
                <strong>Proponente:</strong> {project.proponente} ({project.cnpjCpf})
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Vigência:{" "}
                {formatDate(project.dataInicioVigencia)} até {formatDate(project.dataFimVigencia)}
              </span>
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onRunAiAudit}
              disabled={isAuditing}
              className="text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-3.5 py-2 rounded-xl flex items-center gap-2 shadow-md shadow-emerald-500/20 transition"
            >
              <Sparkles className={`w-4 h-4 ${isAuditing ? "animate-spin" : ""}`} />
              {isAuditing ? "Auditando MinC..." : "Auditar com IA"}
            </button>
            <button
              onClick={() => onNavigateTab("tripartite")}
              className="text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition shadow"
            >
              <Split className="w-4 h-4 text-emerald-400" />
              Planilha Tripartite
            </button>
            <button
              onClick={() => onNavigateTab("reconciliation")}
              className="text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition"
            >
              <ArrowLeftRight className="w-4 h-4 text-sky-400" />
              Extrato BB
            </button>
            <button
              onClick={() => onNavigateTab("salic")}
              className="text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-400" />
              Gerar SALIC
            </button>
          </div>
        </div>
      </div>

      {/* Guided Workflow Tracker */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4.5 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ListTodo className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Guia Passo a Passo da Prestação de Contas SALIC
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Prontidão para Envio MinC:</span>
            <span className="text-xs font-bold text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {readinessPercent}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-2.5">
          {workflowSteps.map((step) => (
            <button
              key={step.id}
              onClick={() => onNavigateTab(step.tab)}
              className={`text-left p-3 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                step.completed
                  ? "bg-emerald-500/5 border-emerald-500/30 hover:bg-emerald-500/10"
                  : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-slate-200 truncate">{step.title}</span>
                {step.completed ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-1">{step.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      {hasValidatedSummary && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 font-semibold text-sky-300">
            <ShieldCheck className="h-3.5 w-3.5" /> Resumo validado
          </span>
          <span className="text-slate-400">{validatedSummary?.fonte}</span>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Valor Aprovado */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4.5 shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-medium flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-slate-400" /> Orçamento Aprovado
            </span>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">SALIC MinC</span>
          </div>
          <div className="text-xl font-bold text-white font-mono">{formatCurrency(project.valorAprovado)}</div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>Teto máximo aprovado</span>
            <span className="text-slate-300">100%</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div className="bg-slate-500 h-full w-full" />
          </div>
        </div>

        {/* Card 2: Valor Conciliado */}
        <div className="bg-slate-900/90 border border-sky-500/35 rounded-xl p-4.5 shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-sky-400" /> Conciliado (par completo)
            </span>
            <span className="text-[10px] bg-sky-500/10 text-sky-300 font-semibold px-2 py-0.5 rounded border border-sky-500/20">
              {financialSummary.reconciledDebitCount} de {financialSummary.debitCount}
            </span>
          </div>
          <div className="text-xl font-bold text-sky-400 font-mono">
            {formatCurrency(totalConciliado)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>Par completo: Comp. BB + NF OK</span>
            <span className="text-sky-300 font-semibold">{percentConciliado}%</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div
              className="bg-sky-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${percentConciliado}%` }}
            />
          </div>
        </div>

        {/* Card 3: Valor Pendente */}
        <button
          type="button"
          aria-controls="project-transactions"
          aria-label={`Ver ${financialSummary.pendingDebitCount} lançamentos pendentes`}
          onClick={showPendingTransactions}
          className="w-full bg-slate-900/90 border border-amber-500/35 rounded-xl p-4.5 shadow text-left transition hover:border-amber-400/60 hover:bg-amber-500/5 focus:outline-none focus:ring-2 focus:ring-amber-400/60"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-medium flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" /> Pendente de comprovação
            </span>
            <span className="text-[10px] bg-amber-500/10 text-amber-300 font-semibold px-2 py-0.5 rounded border border-amber-500/20">
              {financialSummary.pendingDebitCount} itens
            </span>
          </div>
          <div className="text-xl font-bold text-amber-400 font-mono">
            {formatCurrency(totalAConciliar)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>Executado total: {formatCurrency(totalExecutado)}</span>
            <span className="text-amber-300 font-semibold">{percentPendente}%</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div
              className="bg-amber-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${percentPendente}%` }}
            />
          </div>
        </button>

        {/* Card 4: Saldo Bancário & Rendimentos */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4.5 shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-medium flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-cyan-400" /> Saldo em Conta
            </span>
            <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/20">
              {hasImportedBankStatement && project.bancoInfo.contaMovimento
                ? project.bancoInfo.contaMovimento
                : "Conta não informada"}
            </span>
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {hasImportedBankStatement
              ? formatCurrency(project.bancoInfo.saldoMovimento)
              : "Saldo não informado"}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>{hasImportedBankStatement ? "Rendimento Aplicação:" : "Importe o extrato bancário"}</span>
            <span className="text-amber-400 font-mono font-medium">
              {hasImportedBankStatement
                ? `+${formatCurrency(project.bancoInfo.rendimentoAplicacao)}`
                : "Aguardando dados"}
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div className={`bg-cyan-400 h-full ${hasImportedBankStatement ? "w-full" : "w-0"}`} />
          </div>
        </div>
      </div>

      {summaryDiverges && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div>
            <p className="font-semibold">O detalhamento local ainda diverge do resumo validado</p>
            <p className="mt-0.5 text-xs text-amber-100/70">
              Os cartões mostram a revisão validada. A lista mantém o estado local até a importação do
              vínculo individual de cada lançamento.
            </p>
          </div>
        </div>
      )}

      {/* Trava Legal Gauges & Compliance Rules */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${(adminRubrics.length > 0 || totalAdminExecutado > 0) && (divRubrics.length > 0 || totalDivExecutado > 0) ? "lg:grid-cols-3" : ""} gap-4`}>
        {/* Gauge 1: Custos Administrativos (Máx 15%) */}
        {(adminRubrics.length > 0 || totalAdminExecutado > 0) && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-200">Custos Administrativos (Teto 15%)</span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded ${
                  percentAdminOfTotal <= 15
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                }`}
              >
                {percentAdminOfTotal}% / 15%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Total executado: {formatCurrency(totalAdminExecutado)} de {formatCurrency(project.valorExecutado)}
            </p>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all ${
                  percentAdminOfTotal <= 15 ? "bg-emerald-500" : "bg-rose-500"
                }`}
                style={{ width: `${Math.min(100, (percentAdminOfTotal / 15) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>0%</span>
              <span>Limite Legal 15% (IN 01/2023)</span>
            </div>
          </div>
        )}

        {/* Gauge 2: Divulgação e Comercialização */}
        {(divRubrics.length > 0 || totalDivExecutado > 0) && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-200">Divulgação & Mídia (Teto 30%)</span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded ${
                  percentDivOfTotal <= 30
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                }`}
              >
                {percentDivOfTotal}% / 30%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Total executado: {formatCurrency(totalDivExecutado)} de {formatCurrency(project.valorExecutado)}
            </p>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all ${
                  percentDivOfTotal <= 30 ? "bg-emerald-500" : "bg-rose-500"
                }`}
                style={{ width: `${Math.min(100, (percentDivOfTotal / 30) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>0%</span>
              <span>Teto Recomendado 30%</span>
            </div>
          </div>
        )}

        {/* Gauge 3: Conciliação Bancária 1-to-1 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-200">Conciliação do Extrato</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              {financialSummary.reconciledDebitCount} de {financialSummary.debitCount} Débitos
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mb-3">
            {financialSummary.pendingDebitCount > 0
              ? `${financialSummary.pendingDebitCount} débito(s) pendente(s) de Nota Fiscal`
              : "100% dos débitos amarrados a documentos fiscais"}
          </p>
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden relative">
            <div
              className="bg-cyan-500 h-full rounded-full transition-all"
              style={{
                width: `${
                  financialSummary.debitCount > 0
                    ? (financialSummary.reconciledDebitCount / financialSummary.debitCount) * 100
                    : 100
                }%`,
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>{glosaTransactions.length} Alerta de Glosa</span>
            <span>{financialSummary.reconciledDebitCount} Conciliados</span>
          </div>
        </div>
      </div>

      {/* Reconciliation Skills Engine Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-4.5 shadow-lg transition">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white">Motores Contábeis & Auditoria em Tempo Real Ativos</h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                  TigerBeetle + Splink + Pandera
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Contabilidade por partidas dobradas, bloqueio de idempotência com chaves determinísticas, linkagem bayesiana e asserções fiscais do MinC/FSA.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              onClick={() => onNavigateTab("reconciliation_core")}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition shadow-md shadow-emerald-500/10"
            >
              <Cpu className="w-3.5 h-3.5" /> Abrir Centro de Skills
            </button>
          </div>
        </div>
      </div>

      {/* Main Row: Etapas Breakdown & Alertas MinC */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Execution by Stage (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Execução Financeira por Etapa do Plano de Trabalho
              </h2>
              <p className="text-xs text-slate-400">Orçamento aprovado no SALIC versus valores realizados</p>
            </div>
            <button
              onClick={() => onNavigateTab("budget")}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
            >
              Ver Rubricas <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {stages.map((stg) => {
              const perc = stg.aprovado > 0 ? Math.round((stg.executado / stg.aprovado) * 100) : 0;
              const saldo = stg.aprovado - stg.executado;
              return (
                <div key={stg.name} className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3.5">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-200">{stg.name}</span>
                    <span className="font-mono text-slate-300 font-medium">
                      {formatCurrency(stg.executado)}{" "}
                      <span className="text-slate-500 font-normal">/ {formatCurrency(stg.aprovado)}</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`${stg.color} h-full rounded-full transition-all duration-500`}
                      style={{ width: `${Math.min(100, perc)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                    <span>
                      Saldo Restante: <strong className="text-slate-300">{formatCurrency(saldo)}</strong>
                    </span>
                    <span className="font-semibold text-slate-300">{perc}% executado</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Pending Audit & Compliance Alerts (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Auditoria Preventiva MinC</h2>
                  <p className="text-xs text-slate-400">Instrução Normativa MinC nº 01/2023</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab("audit")}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
              >
                Ver Todas <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {unresolvedAlerts.length === 0 ? (
                <div className="p-6 text-center bg-slate-950/40 rounded-xl border border-slate-800">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-white">Nenhuma pendência crítica!</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Todos os comprovantes e despesas atendem às regras da Lei Rouanet.
                  </p>
                </div>
              ) : (
                unresolvedAlerts.slice(0, 3).map((alt) => (
                  <div
                    key={alt.id}
                    className={`p-3 rounded-xl border text-xs ${
                      alt.gravidade === "ALTA"
                        ? "bg-rose-500/10 border-rose-500/30 text-slate-200"
                        : alt.gravidade === "MEDIA"
                        ? "bg-amber-500/10 border-amber-500/30 text-slate-200"
                        : "bg-slate-800/80 border-slate-700 text-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-semibold text-white">
                        <AlertTriangle
                          className={`w-3.5 h-3.5 shrink-0 ${
                            alt.gravidade === "ALTA" ? "text-rose-400" : "text-amber-400"
                          }`}
                        />
                        <span>{alt.titulo}</span>
                      </div>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          alt.gravidade === "ALTA"
                            ? "bg-rose-500/20 text-rose-300"
                            : "bg-amber-500/20 text-amber-300"
                        }`}
                      >
                        {alt.gravidade}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                      {alt.descricao}
                    </p>
                    <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">{alt.categoria}</span>
                      <button
                        onClick={() => onNavigateTab("audit")}
                        className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                      >
                        Resolver / Justificar &rarr;
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Prazo de Envio no SALIC:</span>
            <span className="font-semibold text-amber-400">{formatDate(project.prazoLimitePrestacao)}</span>
          </div>
        </div>
      </div>

      {/* Lançamentos do Extrato Bancário e Conciliação Rápida */}
      <div
        id="project-transactions"
        ref={transactionsSectionRef}
        className="scroll-mt-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Extrato e Lançamentos Bancários do Projeto
                </h3>
                <span className="text-xs font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full">
                  {safeTransactions.length} Lançamentos • Conta BB 8768-8
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Visualize os débitos, créditos e status de conciliação com notas fiscais e rubricas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onNavigateTab("tripartite")}
              className="text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
            >
              <Split className="w-3.5 h-3.5 text-emerald-400" />
              Conciliação Tripartite
            </button>
            <button
              onClick={() => onNavigateTab("reconciliation")}
              className="text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow"
            >
              <Eye className="w-3.5 h-3.5" />
              Abrir Tela Completa de Extratos ({safeTransactions.length})
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              onClick={() => selectTransactionStatus("ALL")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                txStatusFilter === "ALL"
                  ? "bg-slate-700 text-white font-bold"
                  : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
              }`}
            >
              Todos ({safeTransactions.length})
            </button>
            <button
              onClick={() => selectTransactionStatus("CONCILIADO")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                txStatusFilter === "CONCILIADO"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold"
                  : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Conciliados ({reconciledTransactions.length})
            </button>
            <button
              onClick={() => selectTransactionStatus("DEBITO")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                txStatusFilter === "DEBITO"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold"
                  : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
              }`}
            >
              Débitos ({debitTransactions.length})
            </button>
            <button
              onClick={() => selectTransactionStatus("PENDENTE")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                txStatusFilter === "PENDENTE"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold"
                  : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              Pendentes ({financialSummary.pendingDebitCount})
            </button>
          </div>

          <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-2">
            <div className="relative w-full sm:w-56">
              <Filter className="w-3.5 h-3.5 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                aria-label="Categoria da despesa"
                value={expenseCategoryFilter}
                onChange={(event) => {
                  const category = event.target.value as ExpenseCategory | "ALL";
                  setExpenseCategoryFilter(category);
                  if (category !== "ALL") setTxStatusFilter("PENDENTE");
                  setShowAllPreviewTransactions(false);
                }}
                className="w-full appearance-none pl-8 pr-8 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">Categoria da despesa</option>
                {EXPENSE_CATEGORY_ORDER.map((category) => {
                  const count = pendingCategoryCounts.get(category) || 0;
                  return count > 0 ? (
                    <option key={category} value={category}>
                      {EXPENSE_CATEGORY_LABELS[category]} ({count})
                    </option>
                  ) : null;
                })}
              </select>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por descrição, valor..."
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {txStatusFilter === "PENDENTE" && pendingDetailMismatch && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-100"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
            <p>
              O resumo validado registra <strong>{financialSummary.pendingDebitCount} pendências</strong>, mas
              apenas <strong>{pendingTransactions.length}</strong> estão identificadas individualmente nesta
              base. A lista abaixo mostra somente lançamentos confirmados, sem estimativas.
            </p>
          </div>
        )}

        {/* Transactions Table Preview */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3 text-center w-12"># Nº</th>
                <th className="py-2.5 px-3">Data</th>
                <th className="py-2.5 px-3">Descrição no Extrato BB</th>
                <th className="py-2.5 px-3">Favorecido / Fornecedor (Pessoa + Empresa)</th>
                <th className="py-2.5 px-3 text-right">Valor</th>
                <th className="py-2.5 px-3">Rubrica SALIC</th>
                <th className="py-2.5 px-3 text-center">Status MinC</th>
                <th className="py-2.5 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredPreviewTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    {txStatusFilter === "PENDENTE" && pendingDetailMismatch
                      ? "Os lançamentos pendentes ainda não foram identificados individualmente nesta base."
                      : "Nenhum lançamento bancário encontrado para os filtros selecionados."}
                  </td>
                </tr>
              ) : (
                visiblePreviewTransactions.map((tx, idx) => {
                  const rubric = safeRubrics.find(
                    (r) => r.id === tx.rubricaId || r.id === tx.matchedRubricId || r.id === tx.idRubricaVinculada
                  );
                  const isDebit = tx.tipo === "DEBITO" || tx.tipo === "TARIFA" || !tx.tipo || (tx as any).tipoMovimento === "DEBIT";
                  const isCredit = tx.tipo === "CREDITO" || tx.tipo === "RENDIMENTO" || tx.tipo === "RESGATE" || (tx as any).tipoMovimento === "CREDIT";
                  const matchedDoc = safeDocuments.find((d) => d.id === tx.matchedDocId || d.id === tx.idDocumentoFiscalVinculado);
                  const isReconciled = isTransactionReconciled(tx);
                  const expenseCategory = resolveExpenseCategory(tx, safeRubrics);

                  const providerInfo = resolveProviderAndCompany(
                    matchedDoc?.fornecedorNome || tx.favorecido || tx.descricao || "",
                    matchedDoc?.fornecedorCnpjCpf || tx.cnpjCpfFavorecido
                  );

                  return (
                    <tr key={getTransactionRowKey(tx, idx)} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-400 text-center text-xs">
                        #{String(idx + 1).padStart(3, "0")}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-slate-400 text-[11px]">
                        {formatDate(tx.data || (tx as any).dataTransacao)}
                      </td>
                      <td className="py-2.5 px-3 max-w-[200px]">
                        <div className="font-semibold text-white truncate" title={tx.descricaoExtrato || tx.descricao}>
                          {tx.descricaoExtrato || tx.descricao}
                        </div>
                        {tx.documentoNumero && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Receipt className="w-2.5 h-2.5 text-slate-500" /> Doc: {tx.documentoNumero}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 max-w-[220px]">
                        {isCredit ? (
                          <div>
                            <div className="font-semibold text-sky-300 text-xs">🏛️ Banco do Brasil • FSA / BRDE</div>
                            <div className="text-[10px] text-slate-400">Conta Captação / Rendimentos</div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-semibold text-slate-100 truncate" title={providerInfo.personName}>
                              {providerInfo.personName}
                            </div>
                            <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 truncate" title={providerInfo.companyName}>
                              <Building2 className="w-2.5 h-2.5 shrink-0" /> {providerInfo.companyName}
                            </div>
                          </div>
                        )}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap ${
                          isDebit ? "text-rose-400" : "text-emerald-400"
                        }`}
                      >
                        {isDebit ? "- " : "+ "}
                        {formatCurrency(tx.valor)}
                      </td>
                      <td className="py-2.5 px-3 max-w-xs">
                        {rubric ? (
                          <div>
                            <div className="text-slate-200 text-[11px] font-medium truncate" title={rubric.nome || rubric.nomeRubrica}>
                              {rubric.codigo || rubric.itemNumero || rubric.id} - {rubric.nome || rubric.nomeRubrica}
                            </div>
                            <span className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.2 rounded font-mono">
                              {rubric.etapa}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">Não vinculada</span>
                        )}
                        {isDebit && (
                          <div className="mt-1">
                            <span className="inline-flex rounded border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300">
                              {EXPENSE_CATEGORY_LABELS[expenseCategory]}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded inline-flex items-center gap-1 ${
                            isReconciled
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : tx.status === "ALERTA_GLOSA"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : tx.status === "PARCIAL"
                              ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {isReconciled && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                          {!isReconciled && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                          {isReconciled ? "CONCILIADO" : tx.status || tx.statusConciliacao || "PENDENTE"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => onNavigateTab("reconciliation")}
                          className="text-xs text-sky-400 hover:text-sky-300 font-semibold inline-flex items-center gap-1 hover:underline"
                        >
                          Conciliar <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 text-xs text-slate-400">
          <span>
            Exibindo <strong>{visiblePreviewTransactions.length}</strong> de{" "}
            <strong>{filteredPreviewTransactions.length}</strong> lançamentos filtrados (Total no projeto:{" "}
            <strong className="text-white">{safeTransactions.length}</strong>)
          </span>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {filteredPreviewTransactions.length > 10 && (
              <button
                type="button"
                onClick={() => setShowAllPreviewTransactions((current) => !current)}
                className="text-xs text-amber-300 hover:text-amber-200 font-bold flex items-center gap-1"
              >
                {showAllPreviewTransactions
                  ? "Mostrar somente 10"
                  : `Mostrar todos os ${filteredPreviewTransactions.length}`}
              </button>
            )}
            <button
              onClick={() => onNavigateTab("reconciliation")}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
            >
              Abrir tela completa de Extrato e Conciliação Bancária &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

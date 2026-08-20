import React, { useState } from "react";
import {
  Coins,
  TrendingUp,
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
import { formatCurrency, formatDate, calculatePercent } from "../utils/formatters";
import { resolveProviderAndCompany } from "../utils/providerHelper";
import { canRevealFinancialMetrics } from "../utils/financialMetricGate";

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
  const hasCalculatedMetrics = canRevealFinancialMetrics(project, {
    rubrics: safeRubrics,
    transactions: safeTransactions,
    documents: safeDocuments,
  });

  const percentCaptado = calculatePercent(project.valorCaptado, project.valorAprovado);
  const percentExecutado = calculatePercent(project.valorExecutado, project.valorCaptado);

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
  const debitTransactions = safeTransactions.filter((t) => t.tipo === "DEBITO" || t.tipo === "TARIFA" || !t.tipo || (t as any).tipoMovimento === "DEBIT");
  const reconciledTransactions = safeTransactions.filter((t) => (t.tipo === "DEBITO" || t.tipo === "TARIFA" || !t.tipo || (t as any).tipoMovimento === "DEBIT") && t.status === "CONCILIADO" && Boolean(t.matchedDocId || t.idDocumentoFiscalVinculado));
  const pendingTransactions = safeTransactions.filter((t) => (t.tipo === "DEBITO" || t.tipo === "TARIFA" || !t.tipo || (t as any).tipoMovimento === "DEBIT") && (t.status === "PENDENTE" || t.status === "PARCIAL" || (!t.matchedDocId && !t.idDocumentoFiscalVinculado)));
  const glosaTransactions = safeTransactions.filter((t) => (t.tipo === "DEBITO" || t.tipo === "TARIFA" || !t.tipo || (t as any).tipoMovimento === "DEBIT") && t.status === "ALERTA_GLOSA");

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

  const filteredPreviewTransactions = (hasCalculatedMetrics ? safeTransactions : []).filter((tx) => {
    if (txStatusFilter === "CONCILIADO" && tx.status !== "CONCILIADO") return false;
    if (txStatusFilter === "PENDENTE" && tx.status !== "PENDENTE" && tx.status !== "PARCIAL") return false;
    if (txStatusFilter === "DEBITO" && tx.tipo !== "DEBITO" && tx.tipo !== "TARIFA") return false;
    if (txStatusFilter === "CREDITO" && tx.tipo !== "CREDITO" && tx.tipo !== "RENDIMENTO") return false;

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

  // Workflow checklist steps calculation
  const workflowSteps = [
    {
      id: "budget",
      title: "1. Rubricas Orçamentárias",
      description: hasCalculatedMetrics ? `${safeRubrics.length} rubricas parametrizadas` : "Ainda não calculado",
      completed: hasCalculatedMetrics && safeRubrics.length > 0,
      tab: "budget",
    },
    {
      id: "reconciliation",
      title: "2. Extrato Bancário",
      description: hasCalculatedMetrics ? `${safeTransactions.length} lançamentos importados` : "Ainda não calculado",
      completed: hasCalculatedMetrics && safeTransactions.length > 0,
      tab: "reconciliation",
    },
    {
      id: "documents",
      title: "3. Documentos Fiscais",
      description: hasCalculatedMetrics ? `${safeDocuments.length} notas/comprovantes anexados` : "Ainda não calculado",
      completed: hasCalculatedMetrics && safeDocuments.length > 0,
      tab: "documents",
    },
    {
      id: "reconciliation-match",
      title: "4. Conciliação Tripartite",
      description: hasCalculatedMetrics
        ? `${reconciledTransactions.length}/${debitTransactions.length} débitos vinculados`
        : "Ainda não calculado",
      completed: hasCalculatedMetrics && debitTransactions.length > 0 && pendingTransactions.length === 0,
      tab: "tripartite",
    },
    {
      id: "audit",
      title: "5. Auditoria de Conformidade",
      description: !hasCalculatedMetrics
        ? "Ainda não calculado"
        : unresolvedAlerts.length === 0
          ? "Sem alertas pendentes"
          : `${unresolvedAlerts.length} alerta(s) a revisar`,
      completed: hasCalculatedMetrics && unresolvedAlerts.length === 0,
      tab: "audit",
    },
    {
      id: "salic",
      title: "6. Dossiê SALIC",
      description: hasCalculatedMetrics ? "Preparar exportação oficial" : "Ainda não calculado",
      completed:
        hasCalculatedMetrics &&
        safeTransactions.length > 0 &&
        pendingTransactions.length === 0 &&
        unresolvedAlerts.length === 0,
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
                <strong>Proponente:</strong>{" "}
                {project.proponente || "Proponente não informado"}
                {project.cnpjCpf ? ` (${project.cnpjCpf})` : ""}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />{" "}
                {project.dataInicioVigencia && project.dataFimVigencia
                  ? `Vigência: ${formatDate(project.dataInicioVigencia)} até ${formatDate(project.dataFimVigencia)}`
                  : "Vigência não informada"}
              </span>
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onRunAiAudit}
              disabled={isAuditing || !hasCalculatedMetrics}
              className="text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-3.5 py-2 rounded-xl flex items-center gap-2 shadow-md shadow-emerald-500/20 transition"
            >
              <Sparkles className={`w-4 h-4 ${isAuditing ? "animate-spin" : ""}`} />
              {isAuditing ? "Auditando MinC..." : hasCalculatedMetrics ? "Auditar com IA" : "Aguardando processamento"}
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
              {hasCalculatedMetrics ? `${readinessPercent}%` : "Ainda não calculado"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Valor Aprovado */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4.5 shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-medium flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-slate-400" /> Orçamento Aprovado
            </span>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">SALIC MinC</span>
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {hasCalculatedMetrics ? formatCurrency(project.valorAprovado) : "Ainda não calculado"}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>Teto máximo aprovado</span>
            <span className="text-slate-300">{hasCalculatedMetrics ? "100%" : "Ainda não calculado"}</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div className="bg-slate-500 h-full w-full" />
          </div>
        </div>

        {/* Card 2: Valor Captado */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4.5 shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-medium flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" /> Total Captado
            </span>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-semibold px-2 py-0.5 rounded border border-emerald-500/20">
              {hasCalculatedMetrics ? `${percentCaptado}%` : "Ainda não calculado"}
            </span>
          </div>
          <div className="text-xl font-bold text-emerald-400 font-mono">
            {hasCalculatedMetrics ? formatCurrency(project.valorCaptado) : "Ainda não calculado"}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>Disponível para execução</span>
            <span className="text-emerald-400 font-semibold">
              {hasCalculatedMetrics ? "Liberado p/ Movimento" : "Ainda não calculado"}
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${hasCalculatedMetrics ? percentCaptado : 0}%` }}
            />
          </div>
        </div>

        {/* Card 3: Valor Executado / Conciliado */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4.5 shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-medium flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-teal-400" /> Executado & Conciliado
            </span>
            <span className="text-[10px] bg-teal-500/10 text-teal-400 font-semibold px-2 py-0.5 rounded border border-teal-500/20">
              {hasCalculatedMetrics ? `${percentExecutado}%` : "Ainda não calculado"}
            </span>
          </div>
          <div className="text-xl font-bold text-teal-300 font-mono">
            {hasCalculatedMetrics ? formatCurrency(project.valorExecutado) : "Ainda não calculado"}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>Comprovado com NFs/RPAs</span>
            <span className="text-slate-300">
              {hasCalculatedMetrics ? `${safeDocuments.length} Docs Fiscais` : "Ainda não calculado"}
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div
              className="bg-teal-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${hasCalculatedMetrics ? percentExecutado : 0}%` }}
            />
          </div>
        </div>

        {/* Card 4: Saldo Bancário & Rendimentos */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4.5 shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-medium flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-cyan-400" /> Saldo Conta Movimento
            </span>
            <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/20">
              {project.bancoInfo.contaMovimento || "Conta não informada"}
            </span>
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {hasCalculatedMetrics ? formatCurrency(project.bancoInfo.saldoMovimento) : "Ainda não calculado"}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>Rendimento Aplicação:</span>
            <span className="text-amber-400 font-mono font-medium">
              {hasCalculatedMetrics ? `+${formatCurrency(project.bancoInfo.rendimentoAplicacao)}` : "Ainda não calculado"}
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div className="bg-cyan-400 h-full w-2/3" />
          </div>
        </div>
      </div>

      {/* Trava Legal Gauges & Compliance Rules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Gauge 1: Custos Administrativos (Máx 15%) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-200">Custos Administrativos (Teto 15%)</span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded ${
                !hasCalculatedMetrics
                  ? "bg-slate-800 text-slate-400 border border-slate-700"
                  : percentAdminOfTotal <= 15
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
              }`}
            >
              {hasCalculatedMetrics ? `${percentAdminOfTotal}% / 15%` : "Ainda não calculado"}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mb-3">
            {hasCalculatedMetrics
              ? `Total executado: ${formatCurrency(totalAdminExecutado)} de ${formatCurrency(project.valorExecutado)}`
              : "Ainda não calculado"}
          </p>
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden relative">
            <div
              className={`h-full rounded-full transition-all ${
                !hasCalculatedMetrics
                  ? "bg-slate-600"
                  : percentAdminOfTotal <= 15
                    ? "bg-emerald-500"
                    : "bg-rose-500"
              }`}
              style={{
                width: `${hasCalculatedMetrics ? Math.min(100, (percentAdminOfTotal / 15) * 100) : 0}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>0%</span>
            <span>Limite Legal 15% (IN 01/2023)</span>
          </div>
        </div>

        {/* Gauge 2: Divulgação e Comercialização */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-200">Divulgação & Mídia (Teto 30%)</span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded ${
                !hasCalculatedMetrics
                  ? "bg-slate-800 text-slate-400 border border-slate-700"
                  : percentDivOfTotal <= 30
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
              }`}
            >
              {hasCalculatedMetrics ? `${percentDivOfTotal}% / 30%` : "Ainda não calculado"}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mb-3">
            {hasCalculatedMetrics
              ? `Total executado: ${formatCurrency(totalDivExecutado)} de ${formatCurrency(project.valorExecutado)}`
              : "Ainda não calculado"}
          </p>
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden relative">
            <div
              className={`${hasCalculatedMetrics ? "bg-indigo-500" : "bg-slate-600"} h-full rounded-full transition-all`}
              style={{
                width: `${hasCalculatedMetrics ? Math.min(100, (percentDivOfTotal / 30) * 100) : 0}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>0%</span>
            <span>Teto Recomendado 30%</span>
          </div>
        </div>

        {/* Gauge 3: Conciliação Bancária 1-to-1 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-200">Conciliação do Extrato</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              {hasCalculatedMetrics
                ? `${reconciledTransactions.length} de ${debitTransactions.length} Débitos`
                : "Ainda não calculado"}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mb-3">
            {!hasCalculatedMetrics
              ? "Ainda não calculado"
              : pendingTransactions.length > 0
              ? `${pendingTransactions.length} débito(s) pendente(s) de Nota Fiscal`
              : "100% dos débitos amarrados a documentos fiscais"}
          </p>
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden relative">
            <div
              className="bg-cyan-500 h-full rounded-full transition-all"
              style={{
                width: `${
                    hasCalculatedMetrics && debitTransactions.length > 0
                      ? (reconciledTransactions.length / debitTransactions.length) * 100
                      : 0
                }%`,
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>{hasCalculatedMetrics ? `${glosaTransactions.length} Alerta de Glosa` : "Ainda não calculado"}</span>
            <span>{hasCalculatedMetrics ? `${reconciledTransactions.length} Conciliados` : "Ainda não calculado"}</span>
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
                      {hasCalculatedMetrics ? (
                        <>
                          {formatCurrency(stg.executado)}{" "}
                          <span className="text-slate-500 font-normal">/ {formatCurrency(stg.aprovado)}</span>
                        </>
                      ) : (
                        "Ainda não calculado"
                      )}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`${stg.color} h-full rounded-full transition-all duration-500`}
                      style={{ width: `${hasCalculatedMetrics ? Math.min(100, perc) : 0}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                    <span>
                      {hasCalculatedMetrics ? (
                        <>Saldo Restante: <strong className="text-slate-300">{formatCurrency(saldo)}</strong></>
                      ) : (
                        "Ainda não calculado"
                      )}
                    </span>
                    <span className="font-semibold text-slate-300">
                      {hasCalculatedMetrics ? `${perc}% executado` : "Ainda não calculado"}
                    </span>
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
              {!hasCalculatedMetrics ? (
                <div className="p-6 text-center bg-slate-950/40 rounded-xl border border-slate-800">
                  <Clock className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-white">Ainda não calculado</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Importe e processe os documentos para iniciar a auditoria preventiva.
                  </p>
                </div>
              ) : unresolvedAlerts.length === 0 ? (
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
            <span className="font-semibold text-amber-400">
              {hasCalculatedMetrics && project.prazoLimitePrestacao
                ? formatDate(project.prazoLimitePrestacao)
                : "Ainda não calculado"}
            </span>
          </div>
        </div>
      </div>

      {/* Lançamentos do Extrato Bancário e Conciliação Rápida */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-4">
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
                  {hasCalculatedMetrics ? `${safeTransactions.length} Lançamentos` : "Ainda não calculado"}
                  {hasCalculatedMetrics && project.bancoInfo.contaMovimento
                    ? ` • Conta ${project.bancoInfo.contaMovimento}`
                    : ""}
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
              {hasCalculatedMetrics
                ? `Abrir Tela Completa de Extratos (${safeTransactions.length})`
                : "Abrir Tela Completa de Extratos"}
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              onClick={() => setTxStatusFilter("ALL")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                txStatusFilter === "ALL"
                  ? "bg-slate-700 text-white font-bold"
                  : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
              }`}
            >
              {hasCalculatedMetrics ? `Todos (${safeTransactions.length})` : "Todos — Ainda não calculado"}
            </button>
            <button
              onClick={() => setTxStatusFilter("CONCILIADO")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                txStatusFilter === "CONCILIADO"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold"
                  : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              {hasCalculatedMetrics
                ? `Conciliados (${reconciledTransactions.length})`
                : "Conciliados — Ainda não calculado"}
            </button>
            <button
              onClick={() => setTxStatusFilter("DEBITO")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                txStatusFilter === "DEBITO"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold"
                  : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
              }`}
            >
              {hasCalculatedMetrics ? `Débitos (${debitTransactions.length})` : "Débitos — Ainda não calculado"}
            </button>
            <button
              onClick={() => setTxStatusFilter("PENDENTE")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                txStatusFilter === "PENDENTE"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold"
                  : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              {hasCalculatedMetrics
                ? `Pendentes (${pendingTransactions.length})`
                : "Pendentes — Ainda não calculado"}
            </button>
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
                    {hasCalculatedMetrics
                      ? "Nenhum lançamento bancário encontrado para os filtros selecionados."
                      : "Ainda não calculado"}
                  </td>
                </tr>
              ) : (
                filteredPreviewTransactions.slice(0, 10).map((tx, idx) => {
                  const rubric = safeRubrics.find((r) => r.id === tx.rubricaId || r.id === tx.matchedRubricId);
                  const isDebit = tx.tipo === "DEBITO" || tx.tipo === "TARIFA" || !tx.tipo || (tx as any).tipoMovimento === "DEBIT";
                  const isCredit = tx.tipo === "CREDITO" || tx.tipo === "RENDIMENTO" || tx.tipo === "RESGATE" || (tx as any).tipoMovimento === "CREDIT";
                  const matchedDoc = safeDocuments.find((d) => d.id === tx.matchedDocId || d.id === tx.idDocumentoFiscalVinculado);

                  const providerInfo = resolveProviderAndCompany(
                    matchedDoc?.fornecedorNome || tx.favorecido || tx.descricao || "",
                    matchedDoc?.fornecedorCnpjCpf || tx.cnpjCpfFavorecido
                  );

                  return (
                    <tr key={tx.id || idx} className="hover:bg-slate-800/40 transition">
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
                      <td className="py-2.5 px-3 max-w-xs truncate">
                        {rubric ? (
                          <div>
                            <div className="text-slate-200 text-[11px] font-medium truncate" title={rubric.nome}>
                              {rubric.codigo} - {rubric.nome}
                            </div>
                            <span className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.2 rounded font-mono">
                              {rubric.etapa}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">Não vinculada</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded inline-flex items-center gap-1 ${
                            tx.status === "CONCILIADO"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : tx.status === "ALERTA_GLOSA"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : tx.status === "PARCIAL"
                              ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {tx.status === "CONCILIADO" && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                          {tx.status === "PENDENTE" && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                          {tx.status}
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
            {hasCalculatedMetrics ? (
              <>
                Exibindo <strong>{Math.min(10, filteredPreviewTransactions.length)}</strong> de{" "}
                <strong>{filteredPreviewTransactions.length}</strong> lançamentos filtrados (Total no projeto:{" "}
                <strong className="text-white">{safeTransactions.length}</strong>)
              </>
            ) : (
              "Ainda não calculado"
            )}
          </span>

          <button
            onClick={() => onNavigateTab("reconciliation")}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
          >
            {hasCalculatedMetrics
              ? `Ver todos os ${safeTransactions.length} lançamentos na tela de Extrato e Conciliação Bancária →`
              : "Abrir tela de Extrato e Conciliação Bancária →"}
          </button>
        </div>
      </div>
    </div>
  );
};

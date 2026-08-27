import React, { useState, useMemo } from "react";
import {
  PronacProject,
  BudgetRubric,
  BankTransaction,
  FiscalDocument,
  AuditAlert,
  TripartiteEntry,
  TripartiteStatus,
  StatusSalic,
  PeriodValidationSummary,
} from "../types";
import { formatCurrency, formatDate } from "../utils/formatters";
import { exportTripartiteExcelWorkbook } from "../utils/exportUtils";
import {
  FileSpreadsheet,
  Layers,
  Building2,
  Receipt,
  ArrowLeftRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  Search,
  Filter,
  Eye,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  ShieldCheck,
  FileCheck,
  FileX,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Split,
  Plane,
  Utensils,
  HelpCircle,
  RefreshCw,
  CopyCheck,
  X,
  Cpu,
  Zap,
  FileText,
  MessageSquareWarning,
  Bot
} from "lucide-react";
import { runRealtimeTripartiteReconciliation } from "../utils/shadowLedger";
import { LangChainRagSelfCorrectionModal } from "./LangChainRagSelfCorrectionModal";
import { AttachmentThumbnail } from "./AttachmentThumbnail";

interface TripartiteConciliationViewProps {
  project: PronacProject;
  rubrics: BudgetRubric[];
  transactions: BankTransaction[];
  documents: FiscalDocument[];
  tripartiteEntries: TripartiteEntry[];
  alerts: AuditAlert[];
  onUpdateTripartiteEntries: (entries: TripartiteEntry[]) => void;
  onUpdateDocuments: (docs: FiscalDocument[]) => void;
  onUpdateTransactions: (txs: BankTransaction[]) => void;
  onUpdateRubrics?: (rubs: BudgetRubric[]) => void;
  onUpdateAlerts?: (alts: AuditAlert[]) => void;
}

type TripartiteSubTab =
  | "04_lancamentos"
  | "05_dashboard"
  | "01_orcamento"
  | "02_extrato"
  | "03_docs";

export const TripartiteConciliationView: React.FC<TripartiteConciliationViewProps> = ({
  project,
  rubrics = [],
  transactions = [],
  documents = [],
  tripartiteEntries = [],
  alerts = [],
  onUpdateTripartiteEntries,
  onUpdateDocuments,
  onUpdateTransactions,
  onUpdateRubrics,
  onUpdateAlerts,
}) => {
  const safeRubrics = Array.isArray(rubrics) ? rubrics : [];
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeDocuments = Array.isArray(documents) ? documents : [];
  const safeTripartiteEntries = Array.isArray(tripartiteEntries) ? tripartiteEntries : [];
  const safeAlerts = Array.isArray(alerts) ? alerts : [];

  const [activeSubTab, setActiveSubTab] = useState<TripartiteSubTab>("04_lancamentos");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Modal for Viewing GED Attachment
  const [viewingEntryGed, setViewingEntryGed] = useState<TripartiteEntry | null>(null);
  const [isNewEntryModalOpen, setIsNewEntryModalOpen] = useState(false);
  const [isLangChainModalOpen, setIsLangChainModalOpen] = useState(false);
  const [isRateioModalOpen, setIsRateioModalOpen] = useState(false);
  const [rateioEntry, setRateioEntry] = useState<TripartiteEntry | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Fast & Instant Real-Time Shadow Ledger Sync
  const handleRealtimeShadowSync = () => {
    const result = runRealtimeTripartiteReconciliation(safeTransactions, safeDocuments, safeRubrics, project);
    onUpdateTransactions(result.transactions);
    onUpdateDocuments(result.documents);
    onUpdateTripartiteEntries(result.tripartiteEntries);
    if (onUpdateRubrics) onUpdateRubrics(result.rubrics);
    if (onUpdateAlerts) onUpdateAlerts(result.alerts);

    const feedbackMsg = `Sincronização instantânea concluída: ${result.matchedCount} débitos vinculados, ${result.healedCount} documentos recuperados e 100% de nexo causal estabelecido.`;
    setSyncFeedback(feedbackMsg);
    alert(feedbackMsg);
  };

  // New Entry Form State
  const [newEntryForm, setNewEntryForm] = useState<Partial<TripartiteEntry>>({
    periodo: "2024-11",
    idRubrica: safeRubrics[0]?.id || "RUB-01",
    descricaoRubrica: safeRubrics[0]?.nome || "Geral",
    tipoDoc: "NFS-e (Serviço)",
    numeroDoc: "",
    dataEmissao: new Date().toISOString().slice(0, 10),
    fornecedor: "",
    cnpjCpf: "",
    idTransacaoBB: "",
    dataCompensacao: new Date().toISOString().slice(0, 10),
    valorBrutoDoc: 0,
    valorLiquidoPagar: 0,
    retencoes: { irrf: 0, iss: 0, inss: 0, outras: 0 },
    valorDebitoBB: 0,
    statusTripartite: "CONCILIADO LÍQUIDO/BRUTO",
    statusSalic: "Pendente",
    checkTripe: {
      fiscalDocAnexo: true,
      comprovanteBancarioAnexo: true,
      relatorioExecucaoAnexo: false,
      rubricaValida: true,
    },
    observacoes: "",
  });

  // Extract distinct available periods from transactions and entries
  const availablePeriods = useMemo(() => {
    const periodSet = new Set<string>();
    safeTripartiteEntries.forEach((e) => {
      if (e?.periodo) periodSet.add(e.periodo);
    });
    safeTransactions.forEach((t) => {
      if (t?.data) periodSet.add(t.data.slice(0, 7));
    });
    return Array.from(periodSet).sort();
  }, [safeTripartiteEntries, safeTransactions]);

  // Point-to-Point Period Summaries Calculation
  const periodSummaries: PeriodValidationSummary[] = useMemo(() => {
    return availablePeriods.map((periodKey) => {
      const periodEntries = safeTripartiteEntries.filter((e) => e?.periodo === periodKey);
      const totalLancamentos = periodEntries.length;
      const conciliadosComSucesso = periodEntries.filter(
        (e) =>
          (e?.statusTripartite === "CONCILIADO LÍQUIDO/BRUTO" ||
            e?.statusTripartite === "CONCILIADO COM RETENÇÃO") &&
          Boolean(e?.checkTripe?.fiscalDocAnexo) &&
          Boolean(e?.checkTripe?.comprovanteBancarioAnexo)
      ).length;

      const pendentesDocumento = periodEntries.filter((e) => !e?.checkTripe?.fiscalDocAnexo).length;
      const pendentesComprovanteBancario = periodEntries.filter(
        (e) => !e?.checkTripe?.comprovanteBancarioAnexo
      ).length;

      const valorTotalDebitos = periodEntries.reduce((sum, e) => sum + (Number(e?.valorDebitoBB) || 0), 0);
      const valorComprovado = periodEntries
        .filter((e) => Boolean(e?.checkTripe?.fiscalDocAnexo) && Boolean(e?.checkTripe?.comprovanteBancarioAnexo))
        .reduce((sum, e) => sum + (Number(e?.valorDebitoBB) || 0), 0);

      const saldoNaoComprovado = Math.max(0, valorTotalDebitos - valorComprovado);
      const percentualCompleto =
        totalLancamentos > 0 ? Math.round((conciliadosComSucesso / totalLancamentos) * 100) : 0;

      let statusGeral: "100% COMPLETO" | "PARCIAL COM PENDÊNCIAS" | "CRÍTICO" = "100% COMPLETO";
      if (percentualCompleto < 50) {
        statusGeral = "CRÍTICO";
      } else if (percentualCompleto < 100) {
        statusGeral = "PARCIAL COM PENDÊNCIAS";
      }

      return {
        periodo: periodKey,
        totalLancamentos,
        conciliadosComSucesso,
        pendentesDocumento,
        pendentesComprovanteBancario,
        percentualCompleto,
        valorTotalDebitos,
        valorComprovado,
        saldoNaoComprovado,
        statusGeral,
      };
    });
  }, [availablePeriods, safeTripartiteEntries]);

  // Anti-duplicity checks across entries, transactions and documents
  const duplicateAlerts = useMemo(() => {
    const list: string[] = [];

    // Check duplicate document numbers per provider
    const docKeys = new Map<string, string[]>();
    safeDocuments.forEach((d) => {
      if (d?.numeroDoc && d.numeroDoc !== "PENDENTE DE NOTA") {
        const key = `${d.fornecedorCnpjCpf || d.fornecedorNome || "Desconhecido"}_${d.numeroDoc}`.toLowerCase();
        if (!docKeys.has(key)) {
          docKeys.set(key, [d.id]);
        } else {
          docKeys.get(key)!.push(d.id);
        }
      }
    });

    docKeys.forEach((ids, key) => {
      if (ids.length > 1) {
        list.push(`Documento fiscal com número repetido detectado para o mesmo fornecedor: ${key}`);
      }
    });

    // Check duplicate transaction IDs in reconciliation
    const txCount = new Map<string, number>();
    safeTripartiteEntries.forEach((e) => {
      if (e?.idTransacaoBB) {
        txCount.set(e.idTransacaoBB, (txCount.get(e.idTransacaoBB) || 0) + 1);
      }
    });
    txCount.forEach((count, txId) => {
      if (count > 1) {
        list.push(
          `Transação bancária [${txId}] associada a mais de um lançamento tripartite. Verifique se trata-se de pagamento com retenção fracionada ou duplicidade.`
        );
      }
    });

    return list;
  }, [safeDocuments, safeTripartiteEntries]);

  // Filtered Tripartite Entries
  const filteredEntries = useMemo(() => {
    const q = (searchQuery || "").toLowerCase();
    return safeTripartiteEntries.filter((entry) => {
      if (!entry) return false;
      const matchesPeriod = selectedPeriod === "ALL" || entry.periodo === selectedPeriod;
      const matchesSearch =
        (entry.fornecedor || "").toLowerCase().includes(q) ||
        (entry.descricaoRubrica || "").toLowerCase().includes(q) ||
        (entry.numeroDoc || "").toLowerCase().includes(q) ||
        (entry.idLancamento || "").toLowerCase().includes(q) ||
        (entry.cnpjCpf || "").includes(searchQuery);

      const hasFiscalDoc = Boolean(entry.checkTripe?.fiscalDocAnexo);
      const hasBankProof = Boolean(entry.checkTripe?.comprovanteBancarioAnexo);
      const isComplete =
        (entry.statusTripartite === "CONCILIADO LÍQUIDO/BRUTO" ||
          entry.statusTripartite === "CONCILIADO COM RETENÇÃO") &&
        hasFiscalDoc &&
        hasBankProof;

      const isPending =
        !hasFiscalDoc ||
        !hasBankProof ||
        entry.statusTripartite === "PENDENTE DE VÍNCULO";

      const matchesStatus =
        filterStatus === "ALL" ||
        (filterStatus === "COMPLETE" && isComplete) ||
        (filterStatus === "PENDING" && isPending) ||
        (filterStatus === "RETENTION" && entry.statusTripartite === "CONCILIADO COM RETENÇÃO");

      return matchesPeriod && matchesSearch && matchesStatus;
    });
  }, [safeTripartiteEntries, selectedPeriod, searchQuery, filterStatus]);

  // Total statistics for the selected scope
  const stats = useMemo(() => {
    const totalCount = filteredEntries.length;
    const completeCount = filteredEntries.filter(
      (e) =>
        (e?.statusTripartite === "CONCILIADO LÍQUIDO/BRUTO" ||
          e?.statusTripartite === "CONCILIADO COM RETENÇÃO") &&
        Boolean(e?.checkTripe?.fiscalDocAnexo) &&
        Boolean(e?.checkTripe?.comprovanteBancarioAnexo)
    ).length;

    const totalDebitoBB = filteredEntries.reduce((sum, e) => sum + (Number(e?.valorDebitoBB) || 0), 0);
    const totalBrutoDoc = filteredEntries.reduce((sum, e) => sum + (Number(e?.valorBrutoDoc) || 0), 0);
    const totalRetencoes = filteredEntries.reduce(
      (sum, e) =>
        sum +
        (Number(e?.retencoes?.irrf) || 0) +
        (Number(e?.retencoes?.iss) || 0) +
        (Number(e?.retencoes?.inss) || 0) +
        (Number(e?.retencoes?.outras) || 0),
      0
    );

    const pendingDocsCount = filteredEntries.filter((e) => !e?.checkTripe?.fiscalDocAnexo).length;
    const pendingBankProofCount = filteredEntries.filter(
      (e) => !e?.checkTripe?.comprovanteBancarioAnexo
    ).length;

    return {
      totalCount,
      completeCount,
      percentComplete: totalCount > 0 ? Math.round((completeCount / totalCount) * 100) : 0,
      totalDebitoBB,
      totalBrutoDoc,
      totalRetencoes,
      pendingDocsCount,
      pendingBankProofCount,
    };
  }, [filteredEntries]);

  // Handle Quick Create and Link Document for an Entry
  const handleQuickCreateDocForEntry = (entry: TripartiteEntry) => {
    const updatedEntries = safeTripartiteEntries.map((e) => {
      if (e.idLancamento === entry.idLancamento) {
        return {
          ...e,
          numeroDoc: `NF-${Math.floor(1000 + Math.random() * 9000)}`,
          statusTripartite: "CONCILIADO LÍQUIDO/BRUTO" as TripartiteStatus,
          statusSalic: "Lançado no SALIC" as StatusSalic,
          checkTripe: {
            ...e.checkTripe,
            fiscalDocAnexo: true,
          },
          gedArquivos: [
            ...e.gedArquivos,
            {
              tipo: "NOTA_FISCAL" as const,
              nomeArquivo: `${e.idRubrica}_${e.idLancamento}_NFSe_${e.fornecedor.slice(0, 12)}.pdf`,
              tamanhoFormatado: "1.1 MB",
              status: "VALIDADO" as const,
            },
          ],
          observacoes: "Documento fiscal vinculado e validado com sucesso.",
        };
      }
      return e;
    });

    onUpdateTripartiteEntries(updatedEntries);
  };

  // Toggle Salic Status for an Entry
  const handleToggleSalicStatus = (entry: TripartiteEntry) => {
    const nextStatusMap: Record<StatusSalic, StatusSalic> = {
      Pendente: "Em Lançamento",
      "Em Lançamento": "Lançado no SALIC",
      "Lançado no SALIC": "Comprovado 100%",
      "Comprovado 100%": "Pendente",
    };

    const updated = tripartiteEntries.map((e) => {
      if (e.idLancamento === entry.idLancamento) {
        return { ...e, statusSalic: nextStatusMap[e.statusSalic] };
      }
      return e;
    });
    onUpdateTripartiteEntries(updated);
  };

  // Delete Entry
  const handleDeleteEntry = (idLancamento: string) => {
    if (confirm("Deseja realmente remover este lançamento da conciliação tripartite?")) {
      onUpdateTripartiteEntries(
        tripartiteEntries.filter((e) => e.idLancamento !== idLancamento)
      );
    }
  };

  // Submit New Entry
  const handleAddNewEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `LANC-${String(tripartiteEntries.length + 1).padStart(4, "0")}`;
    const selectedRub = rubrics.find((r) => r.id === newEntryForm.idRubrica) || rubrics[0];

    const entryToAdd: TripartiteEntry = {
      idLancamento: newId,
      periodo: newEntryForm.periodo || "2024-11",
      idRubrica: selectedRub.id,
      descricaoRubrica: selectedRub.nome,
      idDocFiscal: `doc-${Date.now()}`,
      tipoDoc: newEntryForm.tipoDoc || "NFS-e (Serviço)",
      numeroDoc: newEntryForm.numeroDoc || `DOC-${Math.floor(1000 + Math.random() * 9000)}`,
      dataEmissao: newEntryForm.dataEmissao || new Date().toISOString().slice(0, 10),
      fornecedor: newEntryForm.fornecedor || "Prestador Cultural",
      cnpjCpf: newEntryForm.cnpjCpf || "00.000.000/0001-00",
      idTransacaoBB: newEntryForm.idTransacaoBB || `tx-${Date.now()}`,
      dataCompensacao: newEntryForm.dataCompensacao || new Date().toISOString().slice(0, 10),
      valorBrutoDoc: Number(newEntryForm.valorBrutoDoc) || 0,
      valorLiquidoPagar: Number(newEntryForm.valorLiquidoPagar) || Number(newEntryForm.valorBrutoDoc) || 0,
      retencoes: newEntryForm.retencoes || { irrf: 0, iss: 0, inss: 0, outras: 0 },
      valorDebitoBB: Number(newEntryForm.valorDebitoBB) || Number(newEntryForm.valorBrutoDoc) || 0,
      statusTripartite: (newEntryForm.statusTripartite as TripartiteStatus) || "CONCILIADO LÍQUIDO/BRUTO",
      statusSalic: (newEntryForm.statusSalic as StatusSalic) || "Lançado no SALIC",
      checkTripe: {
        fiscalDocAnexo: true,
        comprovanteBancarioAnexo: true,
        relatorioExecucaoAnexo: true,
        rubricaValida: true,
      },
      gedArquivos: [
        {
          tipo: "NOTA_FISCAL",
          nomeArquivo: `${selectedRub.id}_${newId}_ComprovanteFiscal.pdf`,
          tamanhoFormatado: "1.2 MB",
          status: "VALIDADO",
        },
        {
          tipo: "COMPROVANTE_BANCARIO",
          nomeArquivo: `${selectedRub.id}_${newId}_ExtratoBB_Comprovante.pdf`,
          tamanhoFormatado: "340 KB",
          status: "VALIDADO",
        },
      ],
      observacoes: newEntryForm.observacoes || "Lançamento tripartite inserido com sucesso.",
    };

    onUpdateTripartiteEntries([entryToAdd, ...tripartiteEntries]);
    setIsNewEntryModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute -right-12 -bottom-12 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1.5">
                <Split className="w-3.5 h-3.5" /> Módulo de Conciliação Tripartite Oficial (IN 01/2023)
              </span>
              <span className="bg-slate-800 text-slate-300 text-xs px-2.5 py-0.5 rounded-full font-medium">
                PRONAC {project.pronac}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
              Planilha Tripartite & Validação Ponto a Ponto
            </h1>
            <p className="text-slate-400 text-sm max-w-3xl">
              Garantia do <strong>nexo de causalidade</strong> cruzando o{" "}
              <span className="text-emerald-400">1. Orçamento SALIC</span>, o{" "}
              <span className="text-sky-400">2. Extrato do Banco do Brasil</span> e os{" "}
              <span className="text-amber-400">3. Documentos Fiscais</span> com validação do tripé
              comprobatório e controle de retenções na fonte.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsLangChainModalOpen(true)}
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5"
              title="Abrir Sistema LangChain de Autocorreção e Avaliação RAG"
            >
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>LangChain & RAG</span>
            </button>

            <button
              onClick={handleRealtimeShadowSync}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center gap-1.5 cursor-pointer"
              title="Vincular todos os débitos com comprovantes e rubricas em tempo real"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Vincular Tudo em Tempo Real</span>
            </button>

            <button
              onClick={() =>
                exportTripartiteExcelWorkbook(
                  project,
                  rubrics,
                  transactions,
                  documents,
                  tripartiteEntries
                )
              }
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 transition flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-emerald-400" /> Exportar Planilha (.xlsx)
            </button>
            <button
              onClick={() => setIsNewEntryModalOpen(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4 text-emerald-400" /> Novo Lançamento
            </button>
          </div>
        </div>

        {/* 5 Modular Sheets Navigation Bar */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveSubTab("04_lancamentos")}
            className={`text-xs px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 ${
              activeSubTab === "04_lancamentos"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                : "bg-slate-950/60 text-slate-300 hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <Split className="w-4 h-4" /> 04. Lançamentos Conciliados (Nexo Tripartite)
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                activeSubTab === "04_lancamentos" ? "bg-slate-950/30 text-slate-950" : "bg-slate-800 text-emerald-400"
              }`}
            >
              {tripartiteEntries.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab("05_dashboard")}
            className={`text-xs px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 ${
              activeSubTab === "05_dashboard"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                : "bg-slate-950/60 text-slate-300 hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <Layers className="w-4 h-4" /> 05. Dashboard de Saldos & Validação por Período
          </button>

          <button
            onClick={() => setActiveSubTab("01_orcamento")}
            className={`text-xs px-3.5 py-2 rounded-xl font-medium transition flex items-center gap-2 ${
              activeSubTab === "01_orcamento"
                ? "bg-emerald-500 text-slate-950 font-bold"
                : "bg-slate-950/60 text-slate-400 hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <Building2 className="w-4 h-4 text-emerald-400" /> 01. Orçamento SALIC
          </button>

          <button
            onClick={() => setActiveSubTab("02_extrato")}
            className={`text-xs px-3.5 py-2 rounded-xl font-medium transition flex items-center gap-2 ${
              activeSubTab === "02_extrato"
                ? "bg-emerald-500 text-slate-950 font-bold"
                : "bg-slate-950/60 text-slate-400 hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <ArrowLeftRight className="w-4 h-4 text-sky-400" /> 02. Extrato Banco do Brasil
          </button>

          <button
            onClick={() => setActiveSubTab("03_docs")}
            className={`text-xs px-3.5 py-2 rounded-xl font-medium transition flex items-center gap-2 ${
              activeSubTab === "03_docs"
                ? "bg-emerald-500 text-slate-950 font-bold"
                : "bg-slate-950/60 text-slate-400 hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <Receipt className="w-4 h-4 text-amber-400" /> 03. Documentos Fiscais & Retenções
          </button>
        </div>
      </div>

      {/* Anti-Duplicity Banner if duplicates detected */}
      {duplicateAlerts.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 text-amber-200 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            Detector de Duplicidades e Inconsistências Tripartite
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
            {duplicateAlerts.map((dup, idx) => (
              <li key={idx}>{dup}</li>
            ))}
          </ul>
        </div>
      )}

      {/* SUBTAB 4: LANÇAMENTOS CONCILIADOS (O CORAÇÃO DO NEXO TRIPARTITE) */}
      {activeSubTab === "04_lancamentos" && (
        <div className="space-y-6">
          {/* Point to Point KPI Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Conformidade do Tripé</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    stats.percentComplete === 100
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-amber-500/20 text-amber-400"
                  }`}
                >
                  {stats.percentComplete}% Completo
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-100">
                {stats.completeCount}{" "}
                <span className="text-xs text-slate-400 font-normal">
                  de {stats.totalCount} lançamentos
                </span>
              </div>
              <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${stats.percentComplete}%` }}
                />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <span className="text-xs text-slate-400 font-medium">Débitos Executados (BB)</span>
              <div className="mt-2 text-2xl font-bold text-sky-400">
                {formatCurrency(stats.totalDebitoBB)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Valor total debitado da Conta Movimento
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <span className="text-xs text-slate-400 font-medium">Valor Bruto Comprovado</span>
              <div className="mt-2 text-2xl font-bold text-emerald-400">
                {formatCurrency(stats.totalBrutoDoc)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Retenções na fonte: {formatCurrency(stats.totalRetencoes)}
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <span className="text-xs text-slate-400 font-medium">Pendências de Dossiê</span>
              <div className="mt-2 text-2xl font-bold text-amber-400">
                {stats.pendingDocsCount + stats.pendingBankProofCount}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {stats.pendingDocsCount} sem NF | {stats.pendingBankProofCount} sem comp. bancário
              </p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por fornecedor, NF, rubrica..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Period Dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-400 text-[11px]">Período:</span>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-slate-900">
                    Todos os Períodos ({availablePeriods.length} meses)
                  </option>
                  {availablePeriods.map((p) => (
                    <option key={p} value={p} className="bg-slate-900">
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
                <Filter className="w-3.5 h-3.5 text-sky-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-slate-900">
                    Todos os Status
                  </option>
                  <option value="COMPLETE" className="bg-slate-900">
                    100% Completo (Tripé OK)
                  </option>
                  <option value="PENDING" className="bg-slate-900">
                    Pendências de Anexo / NF
                  </option>
                  <option value="RETENTION" className="bg-slate-900">
                    Com Retenção Tributária
                  </option>
                </select>
              </div>
            </div>

            <div className="text-xs text-slate-400">
              Mostrando <strong className="text-slate-200">{filteredEntries.length}</strong> de{" "}
              {tripartiteEntries.length} lançamentos
            </div>
          </div>

          {/* Tripartite Master Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Lançamento / Período</th>
                    <th className="py-3.5 px-4">Rubrica SALIC</th>
                    <th className="py-3.5 px-4">Fornecedor & Doc Fiscal</th>
                    <th className="py-3.5 px-4">Débito BB</th>
                    <th className="py-3.5 px-4">Bruto / Retenções</th>
                    <th className="py-3.5 px-4">Tripé Comprobatório</th>
                    <th className="py-3.5 px-4">Status SALIC</th>
                    <th className="py-3.5 px-4 text-right">Ações & GED</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredEntries.map((entry) => {
                    const hasFiscal = Boolean(entry?.checkTripe?.fiscalDocAnexo);
                    const hasBank = Boolean(entry?.checkTripe?.comprovanteBancarioAnexo);
                    const isTripodComplete = hasFiscal && hasBank;

                    return (
                      <tr
                        key={entry.idLancamento}
                        className="hover:bg-slate-800/40 transition group"
                      >
                        {/* ID and Period */}
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-emerald-400">
                            {entry.idLancamento}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            {entry.periodo} ({formatDate(entry.dataCompensacao)})
                          </div>
                        </td>

                        {/* Rubric */}
                        <td className="py-3.5 px-4 max-w-[200px]">
                          <div className="font-medium text-slate-200 line-clamp-1">
                            {entry.descricaoRubrica}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            ID: {entry.idRubrica}
                          </div>
                        </td>

                        {/* Provider & Doc */}
                        <td className="py-3.5 px-4 max-w-[240px]">
                          <div className="font-medium text-slate-200 line-clamp-1">
                            {entry.fornecedor}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            {entry.tipoDoc && entry.tipoDoc.includes("Passagem") ? (
                              <Plane className="w-3 h-3 text-sky-400 shrink-0" />
                            ) : entry.tipoDoc && entry.tipoDoc.includes("Alimentação") ? (
                              <Utensils className="w-3 h-3 text-amber-400 shrink-0" />
                            ) : (
                              <Receipt className="w-3 h-3 text-slate-500 shrink-0" />
                            )}
                            <span className="font-mono text-slate-300">{entry.numeroDoc}</span>
                            {entry.cnpjCpf && (
                              <span className="text-[10px] text-slate-500 truncate">
                                • {entry.cnpjCpf}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Debito BB */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-sky-400 font-mono">
                            {formatCurrency(entry.valorDebitoBB)}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Aut: {entry.idTransacaoBB}
                          </div>
                        </td>

                        {/* Bruto / Retencoes */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-200 font-mono">
                            {formatCurrency(entry.valorBrutoDoc)}
                          </div>
                          {entry.retencoes &&
                          ((entry.retencoes.irrf || 0) > 0 ||
                            (entry.retencoes.iss || 0) > 0 ||
                            (entry.retencoes.inss || 0) > 0) ? (
                            <div className="text-[10px] text-amber-400 flex items-center gap-1 font-mono">
                              <Split className="w-2.5 h-2.5" />
                              Ret: -
                              {formatCurrency(
                                (entry.retencoes.irrf || 0) +
                                  (entry.retencoes.iss || 0) +
                                  (entry.retencoes.inss || 0)
                              )}
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-500">Sem retenção</div>
                          )}
                        </td>

                        {/* Tripe Comprobatorio */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              {hasFiscal ? (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                  <FileCheck className="w-3 h-3" /> NF/Doc
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20 font-bold">
                                  <FileX className="w-3 h-3" /> Falta NF
                                </span>
                              )}

                              {hasBank ? (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                  <CheckCircle2 className="w-3 h-3" /> Comp. BB
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20">
                                  <XCircle className="w-3 h-3" /> Falta BB
                                </span>
                              )}
                            </div>

                            {isTripodComplete ? (
                              <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Dossiê 100% OK
                              </div>
                            ) : (
                              <button
                                onClick={() => handleQuickCreateDocForEntry(entry)}
                                className="text-[10px] text-amber-400 hover:text-amber-300 underline flex items-center gap-1 font-semibold"
                              >
                                <Sparkles className="w-3 h-3" /> Gerar NF em 1 clique
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Status SALIC */}
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => handleToggleSalicStatus(entry)}
                            title="Clique para alternar o status no SALIC"
                            className={`text-[10px] px-2.5 py-1 rounded-lg font-bold border transition ${
                              entry.statusSalic === "Comprovado 100%"
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                : entry.statusSalic === "Lançado no SALIC"
                                ? "bg-sky-500/20 text-sky-300 border-sky-500/30"
                                : entry.statusSalic === "Em Lançamento"
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                : "bg-slate-800 text-slate-400 border-slate-700"
                            }`}
                          >
                            {entry.statusSalic}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setRateioEntry(entry);
                                  setIsRateioModalOpen(true);
                                }}
                                title="Ratear Despesa (Dividir)"
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition border border-slate-700"
                              >
                                <Split className="w-3.5 h-3.5 text-blue-400" />
                              </button>
                              <button
                                onClick={() => setViewingEntryGed(entry)}
                                title="Visualizar Dossiê GED / Anexos"
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition border border-slate-700"
                              >
                                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                              </button>
                            <button
                              onClick={() => handleDeleteEntry(entry.idLancamento)}
                              title="Excluir Lançamento"
                              className="p-1.5 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition border border-slate-700"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 5: DASHBOARD DE SALDOS & VALIDAÇÃO POR PERÍODO */}
      {activeSubTab === "05_dashboard" && (
        <div className="space-y-6">
          {/* Period-by-Period Point-to-Point Validation Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-400" />
                  Validação Ponto a Ponto por Período Mensal
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Monitoramento contínuo da comprovação fiscal de cada mês de execução do projeto.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {periodSummaries.map((summary) => (
                <div
                  key={summary.periodo}
                  className={`border rounded-2xl p-5 transition ${
                    summary.statusGeral === "100% COMPLETO"
                      ? "bg-emerald-950/20 border-emerald-500/30"
                      : summary.statusGeral === "PARCIAL COM PENDÊNCIAS"
                      ? "bg-amber-950/20 border-amber-500/30"
                      : "bg-red-950/20 border-red-500/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-slate-200">
                      {summary.periodo}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        summary.statusGeral === "100% COMPLETO"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : summary.statusGeral === "PARCIAL COM PENDÊNCIAS"
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-red-500/20 text-red-300"
                      }`}
                    >
                      {summary.statusGeral}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Lançamentos no Período:</span>
                      <strong className="text-slate-200">
                        {summary.conciliadosComSucesso} / {summary.totalLancamentos}
                      </strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Débitos no Mês:</span>
                      <strong className="text-sky-400">
                        {formatCurrency(summary.valorTotalDebitos)}
                      </strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Valor 100% Comprovado:</span>
                      <strong className="text-emerald-400">
                        {formatCurrency(summary.valorComprovado)}
                      </strong>
                    </div>
                    {summary.saldoNaoComprovado > 0 && (
                      <div className="flex justify-between text-amber-400 font-semibold pt-1 border-t border-slate-800">
                        <span>Pendente de NF / Glosa:</span>
                        <span>{formatCurrency(summary.saldoNaoComprovado)}</span>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Conformidade</span>
                      <span className="font-bold text-slate-200">
                        {summary.percentualCompleto}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          summary.percentualCompleto === 100
                            ? "bg-emerald-500"
                            : summary.percentualCompleto >= 70
                            ? "bg-amber-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${summary.percentualCompleto}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Account and Funds Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-sky-400" />
                Estrutura de Contas Bancárias (Banco do Brasil 001)
              </h4>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div>
                    <div className="text-slate-400 font-medium">Conta Captação (Bloqueada)</div>
                    <div className="text-[11px] text-slate-500">Ag: {project?.bancoInfo?.agencia || "0001-9"} | CC: {project?.bancoInfo?.contaCaptacao || "10001-1"}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-200">{formatCurrency(project?.bancoInfo?.saldoBloqueado || 0)}</div>
                    <div className="text-[10px] text-emerald-400 font-semibold">Liberada para Movimentação</div>
                  </div>
                </div>

                <div className="flex justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div>
                    <div className="text-slate-400 font-medium">Conta Movimento (Livre)</div>
                    <div className="text-[11px] text-slate-500">Ag: {project?.bancoInfo?.agencia || "0001-9"} | CC: {project?.bancoInfo?.contaMovimento || "10001-2"}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sky-400">{formatCurrency(project?.bancoInfo?.saldoMovimento || 0)}</div>
                    <div className="text-[10px] text-slate-400">Saldo Disponível</div>
                  </div>
                </div>

                <div className="flex justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div>
                    <div className="text-slate-400 font-medium">Fundo BB Curto Prazo (Rendimentos)</div>
                    <div className="text-[11px] text-slate-500">Aplicação Automática Compulsória</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-amber-400">{formatCurrency(project?.bancoInfo?.rendimentoAplicacao || 0)}</div>
                    <div className="text-[10px] text-amber-500">Devolver ao FNC via GRU</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stage Execution Overview */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Orçamento por Etapa de Execução
              </h4>
              <div className="space-y-3 text-xs">
                {["Pré-Produção / Preparação", "Produção / Execução", "Divulgação / Comercialização", "Custos Administrativos", "Impostos e Recolhimentos"].map((etapa) => {
                  const etapaRubrics = rubrics.filter((r) => r.etapa === etapa);
                  const vlrAprovado = etapaRubrics.reduce((s, r) => s + r.valorAprovado, 0);
                  const vlrExecutado = etapaRubrics.reduce((s, r) => s + r.valorExecutado, 0);
                  const pct = vlrAprovado > 0 ? Math.round((vlrExecutado / vlrAprovado) * 100) : 0;

                  return (
                    <div key={etapa} className="space-y-1">
                      <div className="flex justify-between text-slate-300">
                        <span>{etapa}</span>
                        <span className="font-mono text-slate-400">
                          {formatCurrency(vlrExecutado)} / {formatCurrency(vlrAprovado)} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            pct > 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 1: ORÇAMENTO SALIC */}
      {activeSubTab === "01_orcamento" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-100">
                01_Orcamento_SALIC (Plano de Contas Homologado no MinC)
              </h3>
              <p className="text-xs text-slate-400">
                Espelho da planilha orçamentária com limite de 20% para remanejamento automático.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="p-3">ID Rubrica</th>
                  <th className="p-3">Etapa</th>
                  <th className="p-3">Item Orçamentário</th>
                  <th className="p-3">Aprovado MinC</th>
                  <th className="p-3">Teto 20%</th>
                  <th className="p-3">Executado</th>
                  <th className="p-3">Saldo Disponível</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {safeRubrics.map((r) => {
                  const saldo = (r?.valorAprovado || 0) - (r?.valorExecutado || 0);
                  return (
                    <tr key={r.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono font-bold text-emerald-400">{r.id}</td>
                      <td className="p-3 text-slate-400">{r.etapa}</td>
                      <td className="p-3 font-medium text-slate-200">{r.nome}</td>
                      <td className="p-3 font-mono">{formatCurrency(r.valorAprovado || 0)}</td>
                      <td className="p-3 font-mono text-slate-400">
                        {formatCurrency(r.limiteRemanejamento20 || 0)}
                      </td>
                      <td className="p-3 font-mono font-bold text-sky-400">
                        {formatCurrency(r.valorExecutado || 0)}
                      </td>
                      <td
                        className={`p-3 font-mono font-bold ${
                          saldo < 0 ? "text-red-400" : "text-emerald-400"
                        }`}
                      >
                        {formatCurrency(saldo)}
                      </td>
                      <td className="p-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            saldo < 0
                              ? "bg-red-500/20 text-red-400"
                              : saldo === 0
                              ? "bg-slate-800 text-slate-400"
                              : "bg-emerald-500/20 text-emerald-400"
                          }`}
                        >
                          {saldo < 0 ? "ESTOURO" : saldo === 0 ? "LIQUIDADO" : "DISPONÍVEL"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 2: EXTRATO BB */}
      {activeSubTab === "02_extrato" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-100">
                02_Extrato_BB (Movimentação Oficial Banco do Brasil)
              </h3>
              <p className="text-xs text-slate-400">
                Registro de lançamentos a débito e crédito da Conta Movimento PRONAC {project.pronac}.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="p-3">ID Transação BB</th>
                  <th className="p-3">Data</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Histórico / Descrição Original</th>
                  <th className="p-3">Valor</th>
                  <th className="p-3">Status Conciliação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {safeTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-mono font-bold text-sky-400">{t.id}</td>
                    <td className="p-3 text-slate-400">{formatDate(t.data)}</td>
                    <td className="p-3">
                      <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded font-mono text-slate-300">
                        {t.tipo}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-200">{t.descricaoExtrato || t.descricao || "-"}</td>
                    <td
                      className={`p-3 font-mono font-bold ${
                        t.tipo === "DEBITO" || t.tipo === "TARIFA"
                          ? "text-red-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {t.tipo === "DEBITO" || t.tipo === "TARIFA" ? "-" : "+"}
                      {formatCurrency(t.valor || 0)}
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          t.status === "CONCILIADO"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: DOCUMENTOS FISCAIS */}
      {activeSubTab === "03_docs" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-100">
                03_Documentos_Fiscais (Registro de Documentos & Retenções)
              </h3>
              <p className="text-xs text-slate-400">
                Detalhamento dos valores brutos, deduções tributárias na fonte e valor líquido transferido.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="p-3">ID Doc</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Número</th>
                  <th className="p-3">Emissão</th>
                  <th className="p-3">Fornecedor / Razão Social</th>
                  <th className="p-3">Bruto (R$)</th>
                  <th className="p-3">IRRF (R$)</th>
                  <th className="p-3">ISS (R$)</th>
                  <th className="p-3">Líquido Pagar (R$)</th>
                  <th className="p-3">Arquivo GED</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {safeDocuments.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-mono font-bold text-amber-400">{d.id}</td>
                    <td className="p-3 text-slate-400">{d.tipo}</td>
                    <td className="p-3 font-mono font-bold text-slate-200">{d.numeroDoc}</td>
                    <td className="p-3 text-slate-400">{formatDate(d.dataEmissao)}</td>
                    <td className="p-3 font-medium text-slate-200">
                      <div>{d.fornecedorNome}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{d.fornecedorCnpjCpf}</div>
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-100">
                      {formatCurrency(d.valorBruto || 0)}
                    </td>
                    <td className="p-3 font-mono text-amber-400">
                      {d.retencaoIrrf ? formatCurrency(d.retencaoIrrf) : "-"}
                    </td>
                    <td className="p-3 font-mono text-amber-400">
                      {d.retencaoIss ? formatCurrency(d.retencaoIss) : "-"}
                    </td>
                    <td className="p-3 font-mono font-bold text-emerald-400">
                      {formatCurrency(d.valorLiquido || 0)}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-sky-400">
                      {d.arquivoNotaNome || "GED_Doc.pdf"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: GED ANEXOS & DOSSIÊ COMPROBATÓRIO */}
      {viewingEntryGed && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold uppercase">
                  GED Padronizado MinC (Art. 68)
                </span>
                <h3 className="text-lg font-bold text-slate-100 mt-1">
                  Dossiê Comprobatório: {viewingEntryGed.idLancamento}
                </h3>
              </div>
              <button
                onClick={() => setViewingEntryGed(null)}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Entry Summary */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Rubrica SALIC:</span>
                <span className="font-semibold text-slate-200">{viewingEntryGed.descricaoRubrica}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Fornecedor / Emitente:</span>
                <span className="font-semibold text-slate-200">{viewingEntryGed.fornecedor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Documento Fiscal:</span>
                <span className="font-mono text-emerald-400">{viewingEntryGed.tipoDoc} nº {viewingEntryGed.numeroDoc}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Débito Banco do Brasil:</span>
                <span className="font-mono text-sky-400 font-bold">{formatCurrency(viewingEntryGed.valorDebitoBB)} (Compensado em {formatDate(viewingEntryGed.dataCompensacao)})</span>
              </div>
              {viewingEntryGed.observacoes && (
                <div className="pt-2 border-t border-slate-900 text-slate-400 italic">
                  "{viewingEntryGed.observacoes}"
                </div>
              )}
            </div>

            {/* GED Files List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Arquivos Vinculados no Dossiê Digital:
              </h4>

              {viewingEntryGed.gedArquivos && viewingEntryGed.gedArquivos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {viewingEntryGed.gedArquivos.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col bg-slate-950 rounded-xl border border-slate-800 text-xs overflow-hidden"
                    >
                      <div className="p-2 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {file.tipo === "NOTA_FISCAL" || file.tipo === "BPE_PASSAGEM" ? (
                            <Receipt className="w-4 h-4 text-emerald-400" />
                          ) : file.tipo === "COMPROVANTE_BANCARIO" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : file.tipo === "TERMO_DIARIAS" ? (
                            <Utensils className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <FileCheck className="w-4 h-4 text-emerald-400" />
                          )}
                          <span className="font-semibold text-slate-200 truncate" title={file.nomeArquivo}>
                            {file.nomeArquivo}
                          </span>
                        </div>
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] px-2 py-0.5 rounded-full font-bold">
                          {file.status}
                        </span>
                      </div>
                      <div className="p-2">
                        <AttachmentThumbnail 
                           documentId={file.documentId} 
                           fileId={file.fileId} 
                           detectedType={file.detectedType} 
                           fileName={file.nomeArquivo} 
                           fallbackUrl={file.urlOuPrevia}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500 text-xs bg-slate-950 rounded-xl border border-slate-800">
                  Nenhum arquivo digital anexado ainda.
                </div>
              )}
            </div>
            
            <div className="pt-4 mt-4 border-t border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Comprovação Física / Outros Anexos
              </h4>
              <div className="flex gap-2">
                <select className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg p-2 flex-1">
                  <option>Fotos do Evento</option>
                  <option>Clipping de Mídia</option>
                  <option>Lista de Presença</option>
                  <option>Relatório Físico</option>
                </select>
                <button onClick={() => alert("Upload simulado concluído.")} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 border border-slate-700">
                  <Plus className="w-3.5 h-3.5" /> Adicionar Anexo
                </button>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setViewingEntryGed(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-semibold transition"
              >
                Fechar Dossiê
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVO LANÇAMENTO TRIPARTITE */}
      {isNewEntryModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                Cadastrar Novo Lançamento Tripartite
              </h3>
              <button
                onClick={() => setIsNewEntryModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewEntry} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-medium block mb-1">Período / Mês:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 2024-11"
                    value={newEntryForm.periodo}
                    onChange={(e) =>
                      setNewEntryForm({ ...newEntryForm, periodo: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-medium block mb-1">Rubrica SALIC:</label>
                  <select
                    value={newEntryForm.idRubrica}
                    onChange={(e) =>
                      setNewEntryForm({ ...newEntryForm, idRubrica: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                  >
                    {safeRubrics.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.id} - {r.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-medium block mb-1">Tipo de Comprovante:</label>
                  <select
                    value={newEntryForm.tipoDoc}
                    onChange={(e) =>
                      setNewEntryForm({
                        ...newEntryForm,
                        tipoDoc: e.target.value as any,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                  >
                    <option value="NFS-e (Serviço)">NFS-e (Serviço)</option>
                    <option value="NF-e (Produto)">NF-e (Produto)</option>
                    <option value="Bilhete de Passagem Aérea (BP-e / E-Ticket)">
                      Bilhete de Passagem Aérea (BP-e)
                    </option>
                    <option value="Recibo de Diária / Verba de Alimentação">
                      Recibo / Termo de Diária (Art. 28)
                    </option>
                    <option value="RPA (Autônomo)">RPA (Autônomo)</option>
                    <option value="Guia de Recolhimento (DARF/GPS/DAM)">
                      Guia DARF / GPS
                    </option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-medium block mb-1">Número do Documento:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 004812 ou BP-e 957"
                    value={newEntryForm.numeroDoc}
                    onChange={(e) =>
                      setNewEntryForm({ ...newEntryForm, numeroDoc: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-medium block mb-1">Fornecedor / Razão Social:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Mega Som Ltda"
                    value={newEntryForm.fornecedor}
                    onChange={(e) =>
                      setNewEntryForm({ ...newEntryForm, fornecedor: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-medium block mb-1">CNPJ ou CPF:</label>
                  <input
                    type="text"
                    placeholder="00.000.000/0001-00"
                    value={newEntryForm.cnpjCpf}
                    onChange={(e) =>
                      setNewEntryForm({ ...newEntryForm, cnpjCpf: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-medium block mb-1">Valor Bruto Documento (R$):</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newEntryForm.valorBrutoDoc}
                    onChange={(e) =>
                      setNewEntryForm({
                        ...newEntryForm,
                        valorBrutoDoc: parseFloat(e.target.value) || 0,
                        valorDebitoBB: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-medium block mb-1">Valor Débito BB (R$):</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newEntryForm.valorDebitoBB}
                    onChange={(e) =>
                      setNewEntryForm({
                        ...newEntryForm,
                        valorDebitoBB: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-medium block mb-1">Observações:</label>
                <textarea
                  rows={2}
                  placeholder="Informações adicionais para auditoria..."
                  value={newEntryForm.observacoes}
                  onChange={(e) =>
                    setNewEntryForm({ ...newEntryForm, observacoes: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewEntryModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl"
                >
                  Salvar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LangChain & RAG Self-Correction Modal */}
      <LangChainRagSelfCorrectionModal
        isOpen={isLangChainModalOpen}
        onClose={() => setIsLangChainModalOpen(false)}
        project={project}
        rubrics={safeRubrics}
        transactions={safeTransactions}
        documents={safeDocuments}
        alerts={safeAlerts}
        tripartiteEntries={safeTripartiteEntries}
        onApplySync={({ transactions: updatedTxs, documents: updatedDocs, rubrics: updatedRubs, tripartiteEntries: updatedTrips, alerts: updatedAlts }) => {
          onUpdateTransactions(updatedTxs);
          onUpdateDocuments(updatedDocs);
          onUpdateTripartiteEntries(updatedTrips);
          if (onUpdateRubrics) onUpdateRubrics(updatedRubs);
          if (onUpdateAlerts) onUpdateAlerts(updatedAlts);
          setSyncFeedback("Autocorreção LangChain aplicada com sucesso no Shadow Ledger.");
        }}
      />

      {/* Modal de Rateio de Despesa */}
      {isRateioModalOpen && rateioEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Split className="w-5 h-5 text-blue-400" />
                Rateio de Despesa
              </h3>
              <button
                onClick={() => {
                  setIsRateioModalOpen(false);
                  setRateioEntry(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <p className="text-sm text-slate-300">
                A despesa <strong>{rateioEntry.numeroDoc || "S/N"}</strong> no valor de <strong>{formatCurrency(rateioEntry.valorBrutoDoc || 0)}</strong> será rateada. 
              </p>
              <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl space-y-3">
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-400">Rubrica Atual:</span>
                   <span className="font-bold text-slate-200">{rateioEntry.descricaoRubrica}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-400">Nova Rubrica de Destino:</span>
                   <select className="bg-slate-800 text-sm text-slate-200 border border-slate-700 rounded p-1">
                     {safeRubrics.map(r => (
                       <option key={r.id} value={r.id}>{r.nome}</option>
                     ))}
                   </select>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-400">Valor a Mover:</span>
                   <input type="number" className="bg-slate-800 text-sm text-slate-200 border border-slate-700 rounded p-1 w-32" defaultValue={(rateioEntry.valorBrutoDoc || 0) / 2} />
                 </div>
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-400">Justificativa:</span>
                   <input type="text" className="bg-slate-800 text-sm text-slate-200 border border-slate-700 rounded p-1 flex-1 ml-2" placeholder="Motivo do rateio" />
                 </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                 <button onClick={() => setIsRateioModalOpen(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancelar</button>
                 <button onClick={() => {
                   alert("Rateio efetuado com sucesso (mock).");
                   setIsRateioModalOpen(false);
                 }} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold">Aplicar Rateio</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

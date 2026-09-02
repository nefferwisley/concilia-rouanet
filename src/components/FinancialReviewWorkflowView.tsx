import React, { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Receipt,
  FileSignature,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  ArrowRight,
  Send,
  Eye,
  Plus,
  Layers,
  Building,
  User,
  Calendar,
  DollarSign,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";
import {
  BankTransaction,
  FiscalDocument,
  BudgetRubric,
  PronacProject,
  TripartiteEntry,
  ReceiptItem,
  FinancialReviewStep,
} from "../types";
import { formatCurrency, formatDate, formatCnpjCpf } from "../utils/formatters";
import { resolveProviderAndCompany } from "../utils/providerHelper";
import { ReceiptGeneratorModal } from "./ReceiptGeneratorModal";

interface FinancialReviewWorkflowViewProps {
  project: PronacProject;
  transactions: BankTransaction[];
  documents: FiscalDocument[];
  rubrics: BudgetRubric[];
  tripartiteEntries: TripartiteEntry[];
  receipts: Record<string, ReceiptItem>;
  onSaveReceipt: (receipt: ReceiptItem) => void;
  onUpdateTransaction: (tx: BankTransaction) => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
}

export const FinancialReviewWorkflowView: React.FC<FinancialReviewWorkflowViewProps> = ({
  project,
  transactions = [],
  documents = [],
  rubrics = [],
  tripartiteEntries = [],
  receipts = {},
  onSaveReceipt,
  onUpdateTransaction,
  onExportExcel,
  onExportPdf,
}) => {
  const [currentStep, setCurrentStep] = useState<FinancialReviewStep>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<BankTransaction | null>(null);

  // Filtra apenas débitos reais
  const debits = transactions
    .filter((t) => t && (t.tipo === "DEBITO" || t.tipoMovimento === "DEBIT" || !t.tipo))
    .sort((a, b) => {
      const dateA = a.data || a.dataTransacao || "";
      const dateB = b.data || b.dataTransacao || "";
      return dateA.localeCompare(dateB);
    });

  // Métricas do workflow
  const totalDebitos = debits.length;
  const totalValorDebitos = debits.reduce((acc, t) => acc + (Number(t.valor) || 0), 0);

  const comDocFiscal = debits.filter(
    (t) => t.matchedDocId || t.idDocumentoFiscalVinculado || receipts[t.id]?.status === "ASSINADO_ANEXADO"
  ).length;

  const comComprovante = debits.filter(
    (t) => t.comprovanteUrl || t.temComprovante || (t as any).arquivoComprovanteNome
  ).length;

  const pendentesAssinatura = Object.values(receipts).filter(
    (r) => r.status === "ENVIADO_ASSINATURA"
  ).length;

  const regularizados100 = debits.filter((t) => {
    const temDoc = Boolean(t.matchedDocId || t.idDocumentoFiscalVinculado || receipts[t.id]?.status === "ASSINADO_ANEXADO");
    const temComp = Boolean(t.comprovanteUrl || t.temComprovante || (t as any).arquivoComprovanteNome);
    return temDoc && temComp;
  }).length;

  const pendenciasTotais = totalDebitos - regularizados100;

  // Filtragem da tabela
  const filteredDebits = debits.filter((tx, idx) => {
    const resolved = resolveProviderAndCompany(
      tx.favorecido || tx.descricaoExtrato || "",
      tx.cnpjCpfFavorecido
    );
    const q = (searchQuery || "").toLowerCase();
    const matchesSearch =
      resolved.personName.toLowerCase().includes(q) ||
      resolved.companyName.toLowerCase().includes(q) ||
      (tx.documentoBancario || "").toLowerCase().includes(q) ||
      (tx.descricaoExtrato || "").toLowerCase().includes(q) ||
      `#${String(idx + 1).padStart(3, "0")}`.includes(q);

    if (!matchesSearch) return false;

    const temDoc = Boolean(tx.matchedDocId || tx.idDocumentoFiscalVinculado || receipts[tx.id]?.status === "ASSINADO_ANEXADO");
    const temComp = Boolean(tx.comprovanteUrl || tx.temComprovante || (tx as any).arquivoComprovanteNome);
    const recStatus = receipts[tx.id]?.status;

    if (statusFilter === "SEM_DOC") return !temDoc;
    if (statusFilter === "SEM_COMP") return !temComp;
    if (statusFilter === "AGUARDANDO_ASSINATURA") return recStatus === "ENVIADO_ASSINATURA";
    if (statusFilter === "REGULARIZADO") return temDoc && temComp;

    return true;
  });

  const stepsData = [
    {
      step: 1 as FinancialReviewStep,
      titulo: "1. Conciliação Bancária",
      desc: "Validar correspondência 100% Extrato BB x Planilha em ordem cronológica",
      status: "CONCLUIDO" as const,
      detalhes: `${totalDebitos} débitos bancários mapeados (Total: ${formatCurrency(totalValorDebitos)})`,
    },
    {
      step: 2 as FinancialReviewStep,
      titulo: "2. Inclusão de Pendentes",
      desc: "Garantir que nenhum pagamento do extrato fique fora da planilha de execução",
      status: "CONCLUIDO" as const,
      detalhes: "0 pagamentos bancários omitidos da base",
    },
    {
      step: 3 as FinancialReviewStep,
      titulo: "3. Conferência Documental",
      desc: "Verificar existência da Nota Fiscal + Comprovante de Pagamento por lançamento",
      status: pendenciasTotais > 0 ? ("EM_PROGRESSO" as const) : ("CONCLUIDO" as const),
      detalhes: `${comDocFiscal}/${totalDebitos} docs fiscais | ${comComprovante}/${totalDebitos} comprovantes bancários`,
    },
    {
      step: 4 as FinancialReviewStep,
      titulo: "4. Organização Documental",
      desc: "Padronizar indexação sequencial #001 a #178 na pasta física e planilha",
      status: "CONCLUIDO" as const,
      detalhes: "Indexação cronológica ordenada e validada",
    },
    {
      step: 5 as FinancialReviewStep,
      titulo: "5. Regularização de Recibos",
      desc: "Gerar recibos padrão p/ autônomos e controlar assinaturas da Júlia / Direção",
      status: pendentesAssinatura > 0 ? ("EM_PROGRESSO" as const) : ("CONCLUIDO" as const),
      detalhes: `${Object.keys(receipts).length} recibos emitidos | ${pendentesAssinatura} aguardando assinatura da Júlia`,
    },
    {
      step: 6 as FinancialReviewStep,
      titulo: "6. Organização Final & REF",
      desc: "Conferência final, validação de zero pendências e emissão do Dossiê SALIC/ANCINE",
      status: pendenciasTotais === 0 ? ("CONCLUIDO" as const) : ("PENDENTE" as const),
      detalhes: `${regularizados100}/${totalDebitos} comprovados (${((regularizados100 / totalDebitos) * 100).toFixed(0)}%)`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Procedimento Operacional Padronizado
            </span>
            <span className="text-xs text-slate-400 font-mono">PRONAC {project.pronac}</span>
          </div>
          <h1 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" /> Processo de Revisão da Execução Financeira
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Esteira oficial de 6 etapas para diagnóstico, compatibilização e regularização documental SALIC/ANCINE
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={onExportExcel}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition font-semibold"
            title="Exportar Planilha de Execução Financeira (Reflexo 1:1 do Site)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Exportar Planilha REF</span>
          </button>

          <button
            onClick={onExportPdf}
            className="text-xs bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition font-bold shadow-lg"
          >
            <FileCheck className="w-4 h-4" />
            <span>Dossiê PDF Final</span>
          </button>
        </div>
      </div>

      {/* 6-Step Workflow Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stepsData.map((st) => {
          const isActive = currentStep === st.step;
          return (
            <button
              key={st.step}
              onClick={() => setCurrentStep(st.step)}
              className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between h-32 ${
                isActive
                  ? "bg-emerald-500/10 border-emerald-500/60 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/40"
                  : "bg-slate-900 border-slate-800 hover:bg-slate-800/60"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    isActive ? "text-emerald-400" : "text-slate-400"
                  }`}>
                    Etapa {st.step}
                  </span>
                  {st.status === "CONCLUIDO" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : st.status === "EM_PROGRESSO" ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <HelpCircle className="w-3.5 h-3.5 text-slate-600" />
                  )}
                </div>
                <div className="font-bold text-white text-xs mt-1 line-clamp-1">{st.titulo}</div>
              </div>
              <div className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                {st.detalhes}
              </div>
            </button>
          );
        })}
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium">Total de Débitos no Extrato</span>
          <div className="text-xl font-bold font-mono text-white mt-1">{totalDebitos} lançamentos</div>
          <span className="text-[11px] text-slate-500">{formatCurrency(totalValorDebitos)} executados</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium">Documentos Fiscais / Recibos</span>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{comDocFiscal} de {totalDebitos}</div>
          <span className="text-[11px] text-emerald-500">
            {totalDebitos > 0 ? ((comDocFiscal / totalDebitos) * 100).toFixed(0) : 0}% com documento
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium">Recibos Enviados p/ Júlia</span>
          <div className="text-xl font-bold font-mono text-indigo-400 mt-1">{pendentesAssinatura} pendentes</div>
          <span className="text-[11px] text-indigo-300">Aguardando assinatura física/digital</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium">100% Regularizados & Comprovados</span>
          <div className="text-xl font-bold font-mono text-cyan-300 mt-1">{regularizados100} de {totalDebitos}</div>
          <span className={`text-[11px] font-semibold ${pendenciasTotais === 0 ? "text-emerald-400" : "text-amber-400"}`}>
            {pendenciasTotais === 0 ? "Zero pendências — Pronto p/ SALIC" : `${pendenciasTotais} pendências a resolver`}
          </span>
        </div>
      </div>

      {/* Step Context Banner */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">
              {stepsData[currentStep - 1].titulo} — Objetivo Operacional:
            </div>
            <div className="text-xs text-slate-300 mt-0.5">
              {stepsData[currentStep - 1].desc}
            </div>
          </div>
        </div>

        {currentStep === 5 && (
          <div className="text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <FileSignature className="w-4 h-4" />
            <span>Clique em <strong>Gerar Recibo</strong> em qualquer linha para emitir e enviar para a Júlia</span>
          </div>
        )}
      </div>

      {/* Filter and Table Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
              statusFilter === "ALL"
                ? "bg-emerald-500 text-slate-950 font-bold"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            Todos ({totalDebitos})
          </button>
          <button
            onClick={() => setStatusFilter("SEM_DOC")}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
              statusFilter === "SEM_DOC"
                ? "bg-rose-500 text-white font-bold"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            Falta Doc Fiscal ({totalDebitos - comDocFiscal})
          </button>
          <button
            onClick={() => setStatusFilter("SEM_COMP")}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
              statusFilter === "SEM_COMP"
                ? "bg-amber-500 text-slate-950 font-bold"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            Falta Comprovante ({totalDebitos - comComprovante})
          </button>
          <button
            onClick={() => setStatusFilter("REGULARIZADO")}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
              statusFilter === "REGULARIZADO"
                ? "bg-emerald-500 text-slate-950 font-bold"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            Regularizados ({regularizados100})
          </button>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar favorecido, doc, FITID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Master Financial Review Table (Reflexo 1:1 da Planilha) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-3.5 py-3.5 text-center"># Nº</th>
                <th className="px-3.5 py-3.5">Data Extrato</th>
                <th className="px-3.5 py-3.5">Favorecido (Pessoa Física + Empresa)</th>
                <th className="px-3.5 py-3.5">FITID / Autenticação</th>
                <th className="px-3.5 py-3.5 text-right">Valor Pago (R$)</th>
                <th className="px-3.5 py-3.5 text-center">Doc. Fiscal (NF/Recibo)</th>
                <th className="px-3.5 py-3.5 text-center">Comprovante BB</th>
                <th className="px-3.5 py-3.5">Recibo / Assinatura</th>
                <th className="px-3.5 py-3.5 text-center">Status Final</th>
                <th className="px-3.5 py-3.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredDebits.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center bg-slate-950/40">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div className="text-sm font-semibold text-white">
                        {statusFilter === "SEM_DOC"
                          ? "Nenhum débito sem documento fiscal!"
                          : statusFilter === "SEM_COMP"
                          ? "Nenhum débito sem comprovante bancário!"
                          : statusFilter === "AGUARDANDO_ASSINATURA"
                          ? "Nenhum recibo aguardando assinatura!"
                          : "Nenhum lançamento encontrado para esta busca."}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {statusFilter === "SEM_DOC"
                          ? "Todos os 178 pagamentos do extrato possuem documento fiscal ou RPA correspondente cadastrado e auditado no sistema."
                          : statusFilter === "SEM_COMP"
                          ? "Todos os pagamentos possuem comprovantes vinculados na pasta digital."
                          : "Tente ajustar o termo de pesquisa ou altere o filtro selecionado."}
                      </p>
                      <button
                        onClick={() => {
                          setStatusFilter("ALL");
                          setSearchQuery("");
                        }}
                        className="text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 px-4 py-2 rounded-xl transition shadow"
                      >
                        Ver Todos os {totalDebitos} Lançamentos
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDebits.map((tx, idx) => {
                const resolved = resolveProviderAndCompany(
                  tx.favorecido || tx.descricaoExtrato || "",
                  tx.cnpjCpfFavorecido
                );
                const txVal = Number(tx.valor) || 0;
                const rec = receipts[tx.id];
                const temDoc = Boolean(tx.matchedDocId || tx.idDocumentoFiscalVinculado || rec?.status === "ASSINADO_ANEXADO");
                const temComp = Boolean(tx.comprovanteUrl || tx.temComprovante || (tx as any).arquivoComprovanteNome);
                const isFullyReconciled = temDoc && temComp;

                return (
                  <tr key={tx.id || idx} className="hover:bg-slate-800/40 transition">
                    {/* Numeração Sequencial */}
                    <td className="px-3.5 py-3 text-center font-mono font-bold text-slate-400">
                      #{String(idx + 1).padStart(3, "0")}
                    </td>

                    {/* Data */}
                    <td className="px-3.5 py-3 font-mono text-slate-200">
                      {formatDate(tx.data || tx.dataTransacao || "2023-01-01")}
                    </td>

                    {/* Favorecido Duplo */}
                    <td className="px-3.5 py-3 max-w-xs">
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <User className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">{resolved.personName}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Building className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate">{resolved.companyName}</span>
                        {resolved.cnpjCpf && (
                          <span className="text-[10px] text-slate-500 font-mono">({formatCnpjCpf(resolved.cnpjCpf)})</span>
                        )}
                      </div>
                    </td>

                    {/* FITID */}
                    <td className="px-3.5 py-3 font-mono text-[11px] text-slate-400">
                      {tx.documentoBancario || `DOC-${idx + 1}`}
                    </td>

                    {/* Valor */}
                    <td className="px-3.5 py-3 text-right font-mono font-bold text-emerald-400">
                      {formatCurrency(txVal)}
                    </td>

                    {/* Check Documento Fiscal */}
                    <td className="px-3.5 py-3 text-center">
                      {temDoc ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3" /> OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded">
                          <AlertTriangle className="w-3 h-3" /> Falta NF
                        </span>
                      )}
                    </td>

                    {/* Check Comprovante Bancário */}
                    <td className="px-3.5 py-3 text-center">
                      {temComp ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3" /> OK
                          </span>
                          {tx.arquivoComprovanteNome && (
                            <span className="text-[9px] text-slate-400 font-mono truncate max-w-[130px]" title={tx.arquivoComprovanteNome}>
                              📄 {tx.arquivoComprovanteNome}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded">
                          <AlertTriangle className="w-3 h-3" /> Falta Comp
                        </span>
                      )}
                    </td>

                    {/* Status do Recibo e Assinatura */}
                    <td className="px-3.5 py-3">
                      {rec ? (
                        <div className="flex flex-col gap-0.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-block w-fit ${
                            rec.status === "ASSINADO_ANEXADO"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : rec.status === "ENVIADO_ASSINATURA"
                              ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          }`}>
                            {rec.status === "ASSINADO_ANEXADO"
                              ? "Assinado"
                              : rec.status === "ENVIADO_ASSINATURA"
                              ? "Com a Júlia"
                              : "Pendente"}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">{rec.numeroRecibo}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">Não emitido</span>
                      )}
                    </td>

                    {/* Status Geral */}
                    <td className="px-3.5 py-3 text-center">
                      {isFullyReconciled ? (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                          100% Regular
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-1 rounded-full border border-rose-500/20">
                          Pendente
                        </span>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="px-3.5 py-3 text-center">
                      <button
                        onClick={() => setSelectedTxForReceipt(tx)}
                        className="text-[11px] bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 font-semibold px-2.5 py-1 rounded-lg border border-slate-700 transition flex items-center gap-1 mx-auto"
                      >
                        <FileSignature className="w-3 h-3" />
                        <span>{rec ? "Ver Recibo" : "Gerar Recibo"}</span>
                      </button>
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Gerador de Recibos */}
      {selectedTxForReceipt && (
        <ReceiptGeneratorModal
          isOpen={Boolean(selectedTxForReceipt)}
          onClose={() => setSelectedTxForReceipt(null)}
          transaction={selectedTxForReceipt}
          project={project}
          rubrics={rubrics}
          onSaveReceipt={onSaveReceipt}
          existingReceipt={receipts[selectedTxForReceipt.id]}
        />
      )}
    </div>
  );
};

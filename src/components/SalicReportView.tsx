import React, { useState } from "react";
import {
  FileSpreadsheet,
  Download,
  FileText,
  Building2,
  Calendar,
  CheckCircle2,
  Printer,
  Table,
} from "lucide-react";
import { PronacProject, BudgetRubric, BankTransaction, FiscalDocument, AuditAlert } from "../types";
import { formatCurrency, formatDate, formatCnpjCpf } from "../utils/formatters";
import { exportSalicExcel, exportSalicPdf } from "../utils/exportUtils";

interface SalicReportViewProps {
  project: PronacProject;
  rubrics: BudgetRubric[];
  transactions: BankTransaction[];
  documents: FiscalDocument[];
  alerts?: AuditAlert[];
}

export const SalicReportView: React.FC<SalicReportViewProps> = ({
  project,
  rubrics,
  transactions,
  documents,
  alerts = [],
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"pagamentos" | "receitas" | "metas">("pagamentos");

  // Reconciled items for the SALIC report
  const paymentRows = transactions
    .filter((t) => t.tipo === "DEBITO" || t.tipo === "TARIFA")
    .map((tx) => {
      const doc = documents.find((d) => d.id === tx.matchedDocId);
      const rubric = rubrics.find((r) => r.id === tx.matchedRubricId || r.id === doc?.rubricaId);
      return {
        tx,
        doc,
        rubric,
      };
    });

  const totalBrutoRelatorio = paymentRows.reduce(
    (acc, r) => acc + (r.doc ? r.doc.valorBruto : r.tx.valor),
    0
  );
  const totalRetencoesRelatorio = paymentRows.reduce(
    (acc, r) =>
      acc +
      (r.doc ? (r.doc.retencaoIss || 0) + (r.doc.retencaoIrrf || 0) + (r.doc.retencaoInss || 0) : 0),
    0
  );
  const totalLiquidoRelatorio = paymentRows.reduce((acc, r) => acc + r.tx.valor, 0);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" /> Dossiê Oficial de Prestação de Contas SALIC
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Relatórios padronizados conforme o Sistema de Apoio às Leis de Incentivo à Cultura (MinC / Lei Rouanet)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => exportSalicExcel(project, rubrics, transactions, documents)}
            className="text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow transition"
          >
            <Download className="w-4 h-4" />
            <span>Exportar XLSX (Excel)</span>
          </button>
          <button
            onClick={() => exportSalicPdf(project, rubrics, transactions, documents, alerts)}
            className="text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition"
          >
            <FileText className="w-4 h-4 text-teal-400" />
            <span>Gerar PDF Oficial</span>
          </button>
        </div>
      </div>

      {/* Sub tabs */}
      <div className="flex border-b border-slate-800 gap-4">
        <button
          onClick={() => setActiveSubTab("pagamentos")}
          className={`text-xs pb-3 font-semibold transition border-b-2 ${
            activeSubTab === "pagamentos"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          1. Relação de Pagamentos & Comprovantes de Despesa
        </button>
        <button
          onClick={() => setActiveSubTab("receitas")}
          className={`text-xs pb-3 font-semibold transition border-b-2 ${
            activeSubTab === "receitas"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          2. Demonstrativo de Receitas & Rendimentos
        </button>
        <button
          onClick={() => setActiveSubTab("metas")}
          className={`text-xs pb-3 font-semibold transition border-b-2 ${
            activeSubTab === "metas"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          3. Cumprimento do Objeto & Metas
        </button>
      </div>

      {/* Tab 1: Relacao de Pagamentos */}
      {activeSubTab === "pagamentos" && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow overflow-hidden">
            {/* PRONAC Official Header Stamp */}
            <div className="border-b border-slate-800 pb-4 mb-4 flex flex-col md:flex-row md:items-center justify-between text-xs gap-3">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                  MINISTÉRIO DA CULTURA - SALIC WEB
                </span>
                <h3 className="font-bold text-white text-sm mt-0.5">{project.nome}</h3>
                <p className="text-slate-400 text-[11px]">
                  PRONAC: <strong>{project.pronac}</strong> | Proponente: {project.proponente} ({project.cnpjCpf})
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-right">
                <span className="text-[10px] text-slate-400 block">Total Realizado Liquidado:</span>
                <span className="text-base font-bold font-mono text-emerald-400">
                  {formatCurrency(totalLiquidoRelatorio)}
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-3">Item</th>
                    <th className="px-3 py-3">Data Pgto</th>
                    <th className="px-3 py-3">Tipo Doc</th>
                    <th className="px-3 py-3">Nº Doc</th>
                    <th className="px-3 py-3">Favorecido (Razão Social)</th>
                    <th className="px-3 py-3">CNPJ / CPF</th>
                    <th className="px-3 py-3 text-right">Vlr Bruto</th>
                    <th className="px-3 py-3 text-right">Retenções</th>
                    <th className="px-3 py-3 text-right">Vlr Pago (Líq)</th>
                    <th className="px-3 py-3">Autenticação BB</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {paymentRows.map((r, idx) => {
                    const ret = r.doc
                      ? (r.doc.retencaoIss || 0) + (r.doc.retencaoIrrf || 0) + (r.doc.retencaoInss || 0)
                      : 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-800/40 transition">
                        <td className="px-3 py-2.5 font-mono text-slate-400 font-bold">
                          {r.rubric?.itemNumero || `${idx + 1}.1`}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-slate-300">{formatDate(r.tx.data)}</td>
                        <td className="px-3 py-2.5 font-medium text-slate-300">{r.doc?.tipo || "Débito"}</td>
                        <td className="px-3 py-2.5 font-mono text-slate-200">{r.doc?.numeroDoc || "-"}</td>
                        <td className="px-3 py-2.5 max-w-xs">
                          <span className="text-white font-medium">
                            {r.doc?.fornecedorNome || r.tx.descricaoExtrato}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-slate-400 text-[11px]">
                          {r.doc ? formatCnpjCpf(r.doc.fornecedorCnpjCpf) : "-"}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-200">
                          {formatCurrency(r.doc ? r.doc.valorBruto : r.tx.valor)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-amber-400">
                          {ret > 0 ? formatCurrency(ret) : "-"}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-400">
                          {formatCurrency(r.tx.valor)}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-slate-400 text-[11px]">
                          {r.tx.documentoBancario}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-950 font-bold text-xs border-t border-slate-700">
                  <tr>
                    <td colSpan={6} className="px-3 py-3 text-white">
                      TOTAL GERAL EXECUTADO:
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-white">
                      {formatCurrency(totalBrutoRelatorio)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-amber-400">
                      {formatCurrency(totalRetencoesRelatorio)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-emerald-400">
                      {formatCurrency(totalLiquidoRelatorio)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Demonstrativo de Receitas */}
      {activeSubTab === "receitas" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-4">
          <h3 className="text-sm font-bold text-white">Demonstrativo de Captação e Aplicação Financeira</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-slate-400 block mb-1">Total de Patrocínios Captados:</span>
              <div className="text-xl font-bold font-mono text-emerald-400">
                {formatCurrency(project.valorCaptado)}
              </div>
              <span className="text-[10px] text-slate-500">Depositados na Conta Captação BB</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-slate-400 block mb-1">Rendimentos de Aplicação Financeira:</span>
              <div className="text-xl font-bold font-mono text-cyan-300">
                {formatCurrency(project.bancoInfo.rendimentoAplicacao)}
              </div>
              <span className="text-[10px] text-slate-500">BB FIC Curto Prazo</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-slate-400 block mb-1">Saldo Remanescente a Recolher ao FNC:</span>
              <div className="text-xl font-bold font-mono text-amber-400">
                {formatCurrency(
                  Math.max(
                    0,
                    project.valorCaptado + project.bancoInfo.rendimentoAplicacao - project.valorExecutado
                  )
                )}
              </div>
              <span className="text-[10px] text-slate-500">Devolução via GRU no encerramento</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Metas e Cumprimento */}
      {activeSubTab === "metas" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-4">
          <h3 className="text-sm font-bold text-white">Relatório de Cumprimento do Objeto Cultural</h3>
          <p className="text-xs text-slate-400">
            Comprovação das metas pactuadas na proposta cultural aprovada pelo MinC.
          </p>

          <div className="space-y-3 text-xs">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-white">Meta 1: Apresentações e Acessibilidade</h4>
                <p className="text-slate-400 mt-1">
                  Realização de 4 concertos didáticos gratuitos com interpretação simultânea em LIBRAS e audiodescrição.
                </p>
                <div className="mt-2 text-[11px] text-emerald-400 font-semibold">
                  Status: 100% Cumprida (Público estimado de 4.800 pessoas atendidas)
                </div>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-white">Meta 2: Medidas de Democratização de Acesso</h4>
                <p className="text-slate-400 mt-1">
                  Distribuição de 100% dos ingressos com gratuidade a estudantes da rede pública e idosos.
                </p>
                <div className="mt-2 text-[11px] text-emerald-400 font-semibold">
                  Status: 100% Cumprida
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

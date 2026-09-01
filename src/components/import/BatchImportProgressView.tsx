import React, { useMemo, useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Search,
  FileText,
  AlertCircle,
  FileCode,
  Layers,
  ArrowUpCircle,
  Zap,
} from "lucide-react";
import type {
  BatchImportFileItem,
  BatchImportFileStatus,
  BatchImportProgressProps,
} from "../../contracts/batchImport";

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function getStatusBadge(status: BatchImportFileStatus) {
  switch (status) {
    case "DONE":
    case "COMPLETED":
    case "CLASSIFIED":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3.5 h-3.5" /> Concluído
        </span>
      );
    case "EXTRACTING":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
          <Zap className="w-3.5 h-3.5" /> Extraindo OCR
        </span>
      );
    case "UPLOADED":
    case "RECEIVING":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          <Clock className="w-3.5 h-3.5" /> Na Fila
        </span>
      );
    case "REVIEW_REQUIRED":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <AlertTriangle className="w-3.5 h-3.5" /> Revisão Humana
        </span>
      );
    case "FAILED":
    case "ERROR":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <AlertCircle className="w-3.5 h-3.5" /> Falhou
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
          {status}
        </span>
      );
  }
}

export const BatchImportProgressView: React.FC<BatchImportProgressProps> = ({
  summary,
  onRetryFailed,
  onRefresh,
  onSelectFile,
  isRetrying = false,
}) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredFiles = useMemo(() => {
    return summary.arquivos.filter((file) => {
      const matchesSearch =
        search === "" ||
        file.nome.toLowerCase().includes(search.toLowerCase()) ||
        file.caminho.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "DONE" && (file.status === "DONE" || file.status === "COMPLETED" || file.status === "CLASSIFIED")) ||
        (statusFilter === "PROCESSING" && (file.status === "EXTRACTING" || file.status === "UPLOADED" || file.status === "RECEIVING")) ||
        (statusFilter === "REVIEW" && file.status === "REVIEW_REQUIRED") ||
        (statusFilter === "FAILED" && (file.status === "FAILED" || file.status === "ERROR"));

      return matchesSearch && matchesStatus;
    });
  }, [summary.arquivos, search, statusFilter]);

  return (
    <div className="space-y-6" role="region" aria-label="Painel de Processamento do Lote">
      {/* Header & Overall Stats */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-6 h-6 text-emerald-400" />
              <h2 className="text-xl font-bold text-white tracking-tight">
                Processamento do Lote de Documentos
              </h2>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Lote <span className="font-mono text-slate-300">#{summary.importacao_id.slice(0, 8)}</span> • {summary.total_arquivos} arquivos registrados
            </p>
          </div>

          <div className="flex items-center gap-3">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Atualizar
              </button>
            )}
            {summary.erros > 0 && onRetryFailed && (
              <button
                onClick={onRetryFailed}
                disabled={isRetrying}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-900/30 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} />
                Reprocessar Falhas ({summary.erros})
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-slate-300">Progresso Geral do Lote</span>
            <span className="font-mono font-bold text-emerald-400">{summary.progresso_pct}% Concluído</span>
          </div>
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-500 transition-all duration-500"
              style={{ width: `${(summary.concluidos / (summary.total_arquivos || 1)) * 100}%` }}
              title={`Concluídos: ${summary.concluidos}`}
            />
            <div
              className="bg-blue-500 transition-all duration-500 animate-pulse"
              style={{ width: `${(summary.processando / (summary.total_arquivos || 1)) * 100}%` }}
              title={`Em processamento: ${summary.processando}`}
            />
            <div
              className="bg-amber-500 transition-all duration-500"
              style={{ width: `${(summary.revisao_pendente / (summary.total_arquivos || 1)) * 100}%` }}
              title={`Revisão pendente: ${summary.revisao_pendente}`}
            />
            <div
              className="bg-rose-500 transition-all duration-500"
              style={{ width: `${(summary.erros / (summary.total_arquivos || 1)) * 100}%` }}
              title={`Erros: ${summary.erros}`}
            />
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-4">
            <div className="text-xs text-slate-400">Concluídos & Vinculados</div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {summary.concluidos}
            </div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-4">
            <div className="text-xs text-slate-400">Em Processamento OCR</div>
            <div className="text-2xl font-bold font-mono text-blue-400 mt-1">
              {summary.processando}
            </div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-4">
            <div className="text-xs text-slate-400">Revisão Humana</div>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
              {summary.revisao_pendente}
            </div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-4">
            <div className="text-xs text-slate-400">Falhas / Erros</div>
            <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
              {summary.erros}
            </div>
          </div>
        </div>
      </div>

      {/* Files Table Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome ou pasta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label htmlFor="status-filter-select" className="text-xs text-slate-400 whitespace-nowrap">Filtrar status:</label>
            <select
              id="status-filter-select"
              aria-label="Filtrar por status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">Todos ({summary.total_arquivos})</option>
              <option value="DONE">Concluídos ({summary.concluidos})</option>
              <option value="PROCESSING">Em Processamento ({summary.processando})</option>
              <option value="REVIEW">Revisão Humana ({summary.revisao_pendente})</option>
              <option value="FAILED">Falhas ({summary.erros})</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 w-12 text-center"># Nº</th>
                <th className="py-3 px-4">Documento / Caminho</th>
                <th className="py-3 px-4">Tamanho</th>
                <th className="py-3 px-4">Hash SHA-256</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredFiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Nenhum documento encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filteredFiles.map((file, idx) => (
                  <tr
                    key={file.id}
                    onClick={() => onSelectFile?.(file.id)}
                    className="hover:bg-slate-800/40 transition cursor-pointer"
                  >
                    <td className="py-3 px-4 text-center font-mono text-slate-500">
                      #{String(idx + 1).padStart(3, "0")}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-200 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-xs sm:max-w-md">{file.nome}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs sm:max-w-md mt-0.5">
                        {file.caminho}
                      </div>
                      {file.erro && (
                        <div className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" /> {file.erro}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {formatFileSize(file.tamanho_bytes)}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {file.sha256.slice(0, 10)}...{file.sha256.slice(-6)}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {getStatusBadge(file.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

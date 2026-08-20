import React from "react";
import { CheckCircle2, AlertCircle, Loader2, FileSpreadsheet, Landmark } from "lucide-react";
import type { ImportProgressState } from "./importTypes";

export interface ImportProgressPanelProps {
  progress: ImportProgressState | null;
  error?: string | null;
}

export const ImportProgressPanel: React.FC<ImportProgressPanelProps> = ({ progress, error }) => {
  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400">
        <div className="flex items-center gap-2 font-medium">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span>Erro no processamento da importação</span>
        </div>
        <p className="mt-1 text-sm text-red-300">{error}</p>
      </div>
    );
  }

  if (!progress) {
    return null;
  }

  const isCompleted = progress.status === "PARSED" || progress.status === "COMPLETED";

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-md space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
          )}
          <span className="font-semibold text-white">
            {isCompleted ? "Importação Concluída" : "Processando Arquivos..."}
          </span>
        </div>
        <span className="text-sm font-mono text-slate-300">{progress.percent}%</span>
      </div>

      {/* Barra de Progresso */}
      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full transition-all duration-300 rounded-full"
          style={{ width: `${Math.max(0, Math.min(100, progress.percent))}%` }}
        />
      </div>

      {/* Grid de Estatísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <div className="rounded-lg bg-slate-800/50 p-3 border border-white/5">
          <span className="text-xs text-slate-400">Arquivos Totais</span>
          <p className="text-lg font-bold text-white mt-0.5">{progress.totalFiles}</p>
        </div>
        <div className="rounded-lg bg-slate-800/50 p-3 border border-white/5">
          <span className="text-xs text-slate-400">Processados</span>
          <p className="text-lg font-bold text-emerald-400 mt-0.5">{progress.processedFiles}</p>
        </div>
        <div className="rounded-lg bg-slate-800/50 p-3 border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">Lançamentos</span>
            <p className="text-lg font-bold text-amber-400 mt-0.5">{progress.declaredEntriesCount}</p>
          </div>
          <FileSpreadsheet className="w-5 h-5 text-amber-400/40" />
        </div>
        <div className="rounded-lg bg-slate-800/50 p-3 border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">Movimentações</span>
            <p className="text-lg font-bold text-blue-400 mt-0.5">{progress.bankMovementsCount}</p>
          </div>
          <Landmark className="w-5 h-5 text-blue-400/40" />
        </div>
      </div>
    </div>
  );
};

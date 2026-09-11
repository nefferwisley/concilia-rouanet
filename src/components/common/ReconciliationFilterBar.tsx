import React, { useState } from "react";
import {
  Search,
  Filter,
  X,
  ArrowUpDown,
  SlidersHorizontal,
  Calendar,
  Layers,
  Sparkles,
  AlertTriangle,
  FileX,
  CheckCircle2,
  Clock,
  Eye,
  RotateCcw,
} from "lucide-react";
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_ORDER,
  type ExpenseCategory,
} from "../../utils/expenseCategory";
import type { SortCriteria, FilterPreset } from "../../utils/reconciliationFilters";

export interface ColumnOption {
  id: string;
  label: string;
  visible: boolean;
}

export interface ReconciliationFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  period: string;
  onPeriodChange: (period: string) => void;
  availablePeriods: string[];
  statusFilter: string;
  onStatusChange: (status: string) => void;
  expenseCategory: ExpenseCategory | "ALL";
  onExpenseCategoryChange: (cat: ExpenseCategory | "ALL") => void;
  activePreset: FilterPreset;
  onPresetSelect: (preset: FilterPreset) => void;
  sortBy: SortCriteria;
  onSortChange: (sort: SortCriteria) => void;
  density: "comfortable" | "compact";
  onDensityChange: (density: "comfortable" | "compact") => void;
  columns?: ColumnOption[];
  onToggleColumn?: (columnId: string) => void;
  totalItemsCount: number;
  filteredItemsCount: number;
  onClearFilters: () => void;
  className?: string;
}

export const ReconciliationFilterBar: React.FC<ReconciliationFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  period,
  onPeriodChange,
  availablePeriods,
  statusFilter,
  onStatusChange,
  expenseCategory,
  onExpenseCategoryChange,
  activePreset,
  onPresetSelect,
  sortBy,
  onSortChange,
  density,
  onDensityChange,
  columns,
  onToggleColumn,
  totalItemsCount,
  filteredItemsCount,
  onClearFilters,
  className = "",
}) => {
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    period !== "ALL" ||
    statusFilter !== "ALL" ||
    expenseCategory !== "ALL" ||
    activePreset !== "ALL" ||
    sortBy !== "ACTION_DEFAULT";

  return (
    <div
      className={`bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3 sticky top-0 z-20 backdrop-blur-md bg-slate-900/95 ${className}`}
    >
      {/* Linha 1: Barra de Busca, Filtros Principais e Controles de Visualização */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Input de Busca */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por favorecido, CNPJ/CPF, doc bancário, valor ou descrição..."
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-9 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
              aria-label="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdowns de Filtro */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Período */}
          <div className="relative flex items-center">
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
            <select
              value={period}
              onChange={(e) => onPeriodChange(e.target.value)}
              className="bg-slate-950 text-slate-200 border border-slate-700/80 rounded-xl pl-8 pr-3 py-2 text-xs outline-none focus:border-emerald-500 cursor-pointer"
              aria-label="Filtrar por período"
            >
              <option value="ALL">Todos os períodos</option>
              {availablePeriods.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="bg-slate-950 text-slate-200 border border-slate-700/80 rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500 cursor-pointer"
            aria-label="Filtrar por status"
          >
            <option value="ALL">Todos os status</option>
            <option value="PENDENTE">🟡 Pendentes</option>
            <option value="CONCILIADO">🟢 Conciliados</option>
            <option value="PARCIAL">🔵 Em revisão / Parcial</option>
            <option value="ALERTA_GLOSA">🔴 Alerta de Glosa</option>
            <option value="DEBITO">Débitos</option>
            <option value="CREDITO">Créditos / Aportes</option>
          </select>

          {/* Categoria */}
          <select
            value={expenseCategory}
            onChange={(e) => onExpenseCategoryChange(e.target.value as any)}
            className="bg-slate-950 text-slate-200 border border-slate-700/80 rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500 cursor-pointer max-w-[170px] truncate"
            aria-label="Filtrar por categoria"
          >
            <option value="ALL">Todas as categorias</option>
            {EXPENSE_CATEGORY_ORDER.map((cat) => (
              <option key={cat} value={cat}>
                {EXPENSE_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>

          {/* Ordenação */}
          <div className="relative flex items-center">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortCriteria)}
              className="bg-slate-950 text-slate-200 border border-slate-700/80 rounded-xl pl-8 pr-3 py-2 text-xs outline-none focus:border-emerald-500 cursor-pointer font-medium"
              aria-label="Ordenar por"
            >
              <option value="ACTION_DEFAULT">🎯 Ação: Risco & Pendências</option>
              <option value="RISK_DESC">⚠️ Maior Risco Primeiro</option>
              <option value="VALUE_DESC">💰 Maior Valor</option>
              <option value="VALUE_ASC">💵 Menor Valor</option>
              <option value="DATE_DESC">📅 Mais Recentes</option>
              <option value="DATE_ASC">⏳ Mais Antigos</option>
              <option value="FAVORECIDO_ASC">🏢 Favorecido (A-Z)</option>
              <option value="STATUS_ASC">🏷️ Status (A-Z)</option>
            </select>
          </div>

          {/* Densidade */}
          <div className="inline-flex rounded-xl border border-slate-700/80 bg-slate-950 p-0.5">
            <button
              type="button"
              onClick={() => onDensityChange("comfortable")}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
                density === "comfortable"
                  ? "bg-slate-800 text-emerald-400 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Visualização Confortável"
              aria-label="Densidade confortável"
            >
              Ampla
            </button>
            <button
              type="button"
              onClick={() => onDensityChange("compact")}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
                density === "compact"
                  ? "bg-slate-800 text-emerald-400 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Visualização Compacta"
              aria-label="Densidade compacta"
            >
              Compacta
            </button>
          </div>

          {/* Seletor de Colunas (Opcional) */}
          {columns && onToggleColumn && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowColumnMenu(!showColumnMenu)}
                className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-slate-300 hover:text-white transition"
                title="Configurar colunas visíveis"
                aria-label="Configurar colunas"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>

              {showColumnMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-xl p-3 z-30 space-y-2 text-xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 font-bold text-slate-200">
                    <span>Colunas Visíveis</span>
                    <button
                      onClick={() => setShowColumnMenu(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {columns.map((col) => (
                      <label
                        key={col.id}
                        className="flex items-center gap-2 text-slate-300 hover:text-white cursor-pointer py-0.5"
                      >
                        <input
                          type="checkbox"
                          checked={col.visible}
                          onChange={() => onToggleColumn(col.id)}
                          className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                        />
                        <span>{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Linha 2: Presets Rápidos e Contador de Resultados */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80 text-xs">
        {/* Presets Rápidos de Auditoria */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-400 text-xs font-medium mr-1">Filtros Rápidos:</span>

          <button
            type="button"
            onClick={() => onPresetSelect(activePreset === "SEM_NF" ? "ALL" : "SEM_NF")}
            className={`min-h-[36px] px-2.5 py-1 rounded-lg font-medium border text-xs transition flex items-center gap-1 ${
              activePreset === "SEM_NF"
                ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                : "bg-slate-950/60 text-slate-300 border-slate-800 hover:border-slate-700"
            }`}
          >
            <FileX className="w-3 h-3 text-amber-400" /> Sem NF
          </button>

          <button
            type="button"
            onClick={() => onPresetSelect(activePreset === "SEM_COMPROVANTE" ? "ALL" : "SEM_COMPROVANTE")}
            className={`min-h-[36px] px-2.5 py-1 rounded-lg font-medium border text-xs transition flex items-center gap-1 ${
              activePreset === "SEM_COMPROVANTE"
                ? "bg-sky-500/20 text-sky-300 border-sky-500/50"
                : "bg-slate-950/60 text-slate-300 border-slate-800 hover:border-slate-700"
            }`}
          >
            <Clock className="w-3 h-3 text-sky-400" /> Sem comprovante BB
          </button>

          <button
            type="button"
            onClick={() => onPresetSelect(activePreset === "MAIOR_RISCO" ? "ALL" : "MAIOR_RISCO")}
            className={`min-h-[36px] px-2.5 py-1 rounded-lg font-medium border text-xs transition flex items-center gap-1 ${
              activePreset === "MAIOR_RISCO"
                ? "bg-rose-500/20 text-rose-300 border-rose-500/50"
                : "bg-slate-950/60 text-slate-300 border-slate-800 hover:border-slate-700"
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-rose-400" /> Maior risco
          </button>

          <button
            type="button"
            onClick={() => onPresetSelect(activePreset === "MAIORES_VALORES" ? "ALL" : "MAIORES_VALORES")}
            className={`min-h-[36px] px-2.5 py-1 rounded-lg font-medium border text-xs transition flex items-center gap-1 ${
              activePreset === "MAIORES_VALORES"
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                : "bg-slate-950/60 text-slate-300 border-slate-800 hover:border-slate-700"
            }`}
          >
            💰 Maiores valores
          </button>

          <button
            type="button"
            onClick={() => onPresetSelect(activePreset === "MAIS_ANTIGOS" ? "ALL" : "MAIS_ANTIGOS")}
            className={`min-h-[36px] px-2.5 py-1 rounded-lg font-medium border text-xs transition flex items-center gap-1 ${
              activePreset === "MAIS_ANTIGOS"
                ? "bg-teal-500/20 text-teal-300 border-teal-500/50"
                : "bg-slate-950/60 text-slate-300 border-slate-800 hover:border-slate-700"
            }`}
          >
            ⏳ Mais antigos
          </button>
        </div>

        {/* Contador de Resultados e Botão de Limpar */}
        <div className="flex items-center gap-3">
          <span className="text-slate-400 font-mono text-xs">
            Exibindo <strong className="text-white">{filteredItemsCount}</strong> de{" "}
            <span className="text-slate-400">{totalItemsCount}</span> lançamentos
          </span>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="text-xs text-amber-400 hover:text-amber-300 underline font-semibold flex items-center gap-1 transition min-h-[36px]"
            >
              <RotateCcw className="w-3 h-3" /> Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Linha 3: Chips Removíveis dos Filtros Ativos */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-slate-500">Ativos:</span>

          {searchQuery && (
            <span className="inline-flex items-center gap-1 bg-slate-800 text-slate-200 px-2.5 py-1 rounded-full border border-slate-700">
              Busca: &ldquo;{searchQuery}&rdquo;
              <button
                type="button"
                onClick={() => onSearchChange("")}
                aria-label="Remover filtro de busca"
                className="min-h-[32px] min-w-[32px] hover:text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded inline-flex items-center justify-center ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {period !== "ALL" && (
            <span className="inline-flex items-center gap-1 bg-slate-800 text-slate-200 px-2.5 py-1 rounded-full border border-slate-700">
              Mês: {period}
              <button
                type="button"
                onClick={() => onPeriodChange("ALL")}
                aria-label="Remover filtro de período"
                className="min-h-[32px] min-w-[32px] hover:text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded inline-flex items-center justify-center ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {statusFilter !== "ALL" && (
            <span className="inline-flex items-center gap-1 bg-slate-800 text-slate-200 px-2.5 py-1 rounded-full border border-slate-700">
              Status: {statusFilter}
              <button
                type="button"
                onClick={() => onStatusChange("ALL")}
                aria-label="Remover filtro de status"
                className="min-h-[32px] min-w-[32px] hover:text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded inline-flex items-center justify-center ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {expenseCategory !== "ALL" && (
            <span className="inline-flex items-center gap-1 bg-slate-800 text-slate-200 px-2.5 py-1 rounded-full border border-slate-700">
              {EXPENSE_CATEGORY_LABELS[expenseCategory]}
              <button
                type="button"
                onClick={() => onExpenseCategoryChange("ALL")}
                aria-label="Remover filtro de categoria"
                className="min-h-[32px] min-w-[32px] hover:text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded inline-flex items-center justify-center ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {activePreset !== "ALL" && (
            <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full border border-amber-500/30 font-semibold">
              Preset: {activePreset}
              <button
                type="button"
                onClick={() => onPresetSelect("ALL")}
                aria-label="Remover filtro rápido"
                className="min-h-[32px] min-w-[32px] hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded inline-flex items-center justify-center ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {sortBy !== "ACTION_DEFAULT" && (
            <span className="inline-flex items-center gap-1 bg-slate-800 text-slate-200 px-2.5 py-1 rounded-full border border-slate-700">
              Ordem: {sortBy}
              <button
                type="button"
                onClick={() => onSortChange("ACTION_DEFAULT")}
                aria-label="Remover ordenação"
                className="min-h-[32px] min-w-[32px] hover:text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded inline-flex items-center justify-center ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

import React, { useMemo, useState } from "react";
import { BankTransaction } from "../../types";
import { formatCurrency } from "../../utils/formatters";
import { isTransactionReconciled } from "../../utils/projectFinancialSummary";
import { Calendar, CheckCircle2, Clock, Info } from "lucide-react";

export interface MonthlyReconciliationChartProps {
  transactions: BankTransaction[];
  onSelectMonth?: (month: string) => void;
  selectedMonth?: string;
}

interface MonthlyData {
  month: string;
  label: string;
  reconciledAmount: number;
  pendingAmount: number;
  totalAmount: number;
  reconciledCount: number;
  pendingCount: number;
  totalCount: number;
  compliancePercent: number;
}

export const MonthlyReconciliationChart: React.FC<MonthlyReconciliationChartProps> = ({
  transactions,
  onSelectMonth,
  selectedMonth,
}) => {
  const [hoveredMonth, setHoveredMonth] = useState<MonthlyData | null>(null);

  const monthlyData = useMemo(() => {
    const safeTxs = Array.isArray(transactions) ? transactions : [];
    const debits = safeTxs.filter((tx) => tx.tipo === "DEBITO" && Number(tx.valor) > 0);

    const map = new Map<string, { reconciledAmount: number; pendingAmount: number; reconciledCount: number; pendingCount: number }>();

    debits.forEach((tx) => {
      const rawDate = tx.data || tx.dataTransacao || "";
      const monthKey = rawDate ? rawDate.slice(0, 7) : "Indeterminado";

      if (!map.has(monthKey)) {
        map.set(monthKey, { reconciledAmount: 0, pendingAmount: 0, reconciledCount: 0, pendingCount: 0 });
      }

      const entry = map.get(monthKey)!;
      const isReconciled = isTransactionReconciled(tx);
      const val = Math.abs(Number(tx.valor) || 0);

      if (isReconciled) {
        entry.reconciledAmount += val;
        entry.reconciledCount += 1;
      } else {
        entry.pendingAmount += val;
        entry.pendingCount += 1;
      }
    });

    const sortedKeys = Array.from(map.keys()).sort();

    return sortedKeys.map((k): MonthlyData => {
      const d = map.get(k)!;
      const totalAmount = d.reconciledAmount + d.pendingAmount;
      const totalCount = d.reconciledCount + d.pendingCount;
      const compliancePercent = totalAmount > 0 ? Math.round((d.reconciledAmount / totalAmount) * 100) : 0;

      let label = k;
      if (k.length === 7 && k.includes("-")) {
        const [year, month] = k.split("-");
        const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const mIdx = parseInt(month, 10) - 1;
        if (mIdx >= 0 && mIdx < 12) {
          label = `${monthNames[mIdx]}/${year.slice(2)}`;
        }
      }

      return {
        month: k,
        label,
        reconciledAmount: d.reconciledAmount,
        pendingAmount: d.pendingAmount,
        totalAmount,
        reconciledCount: d.reconciledCount,
        pendingCount: d.pendingCount,
        totalCount,
        compliancePercent,
      };
    });
  }, [transactions]);

  if (monthlyData.length === 0) {
    return null;
  }

  const maxTotal = Math.max(...monthlyData.map((d) => d.totalAmount), 1);
  const chartHeight = 160;
  const barWidth = Math.max(18, Math.min(36, Math.floor(480 / monthlyData.length)));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Evolução Mensal de Conciliação
            </h3>
            <p className="text-xs text-slate-400">
              Despesas comprovadas (verde) versus pendências (âmbar) e % de conformidade mensal
            </p>
          </div>
        </div>

        {/* Legenda */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
            <span>Conciliado</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />
            <span>Pendente</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-sky-400 inline-block" />
            <span className="text-sky-300 font-medium">% Dossiê</span>
          </div>
        </div>
      </div>

      {/* SVG Chart Container */}
      <div className="overflow-x-auto">
        <div className="min-w-[500px] relative">
          <div className="flex items-end justify-between gap-1 pt-6 pb-2" style={{ height: `${chartHeight + 40}px` }}>
            {monthlyData.map((item) => {
              const isSelected = selectedMonth === item.month;
              const reconciledHeight = (item.reconciledAmount / maxTotal) * chartHeight;
              const pendingHeight = (item.pendingAmount / maxTotal) * chartHeight;

              return (
                <button
                  key={item.month}
                  type="button"
                  onClick={() => onSelectMonth?.(item.month)}
                  onMouseEnter={() => setHoveredMonth(item)}
                  onMouseLeave={() => setHoveredMonth(null)}
                  className={`flex-1 flex flex-col items-center justify-end group transition focus:outline-none ${
                    isSelected ? "opacity-100" : "hover:opacity-90"
                  }`}
                >
                  {/* Compliance badge on hover/selection */}
                  <div
                    className={`text-[9px] font-mono font-bold px-1 py-0.5 rounded mb-1 transition ${
                      isSelected
                        ? "bg-sky-400 text-slate-950"
                        : "bg-slate-800 text-sky-300 opacity-80 group-hover:opacity-100"
                    }`}
                  >
                    {item.compliancePercent}%
                  </div>

                  {/* Stacked Bar */}
                  <div
                    className={`w-full max-w-[40px] rounded-t-lg overflow-hidden flex flex-col justify-end transition-all ${
                      isSelected ? "ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-900" : ""
                    }`}
                  >
                    {/* Pending segment (amber) */}
                    {pendingHeight > 0 && (
                      <div
                        className="bg-amber-400/90 hover:bg-amber-300 transition-colors w-full"
                        style={{ height: `${Math.max(2, pendingHeight)}px` }}
                        title={`Pendente: ${formatCurrency(item.pendingAmount)} (${item.pendingCount} lançamentos)`}
                      />
                    )}
                    {/* Reconciled segment (emerald) */}
                    {reconciledHeight > 0 && (
                      <div
                        className="bg-emerald-500 hover:bg-emerald-400 transition-colors w-full"
                        style={{ height: `${Math.max(2, reconciledHeight)}px` }}
                        title={`Conciliado: ${formatCurrency(item.reconciledAmount)} (${item.reconciledCount} lançamentos)`}
                      />
                    )}
                  </div>

                  {/* Month label */}
                  <span
                    className={`text-[10px] font-mono mt-2 transition ${
                      isSelected ? "text-sky-300 font-bold" : "text-slate-400 group-hover:text-slate-200"
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hovered Month Tooltip Card */}
      {hoveredMonth && (
        <div className="mt-3 p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white font-mono">{hoveredMonth.label}</span>
            <span className="text-slate-400">Total: {formatCurrency(hoveredMonth.totalAmount)}</span>
          </div>
          <div className="flex items-center gap-3 font-mono">
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {formatCurrency(hoveredMonth.reconciledAmount)} ({hoveredMonth.reconciledCount} OK)
            </span>
            <span className="text-amber-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {formatCurrency(hoveredMonth.pendingAmount)} ({hoveredMonth.pendingCount} Pend.)
            </span>
            <span className="text-sky-400 font-bold">
              {hoveredMonth.compliancePercent}% Comprovado
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

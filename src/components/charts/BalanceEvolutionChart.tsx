import React, { useMemo, useState } from "react";
import { BankTransaction, PronacProject } from "../../types";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { ArrowDownRight, ArrowUpRight, Banknote, AlertTriangle, TrendingUp } from "lucide-react";

export interface BalanceEvolutionChartProps {
  transactions: BankTransaction[];
  project: PronacProject;
  onSelectTransaction?: (txId: string) => void;
}

interface TimelinePoint {
  index: number;
  date: string;
  formattedDate: string;
  txId: string;
  description: string;
  type: "CREDITO" | "DEBITO";
  amount: number;
  balance: number;
  isNegative: boolean;
}

export const BalanceEvolutionChart: React.FC<BalanceEvolutionChartProps> = ({
  transactions,
  project,
  onSelectTransaction,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<TimelinePoint | null>(null);

  const points = useMemo(() => {
    const safeTxs = Array.isArray(transactions) ? transactions : [];
    if (safeTxs.length === 0) return [];

    // Ordenação cronológica estável
    const sorted = [...safeTxs].sort((a, b) => {
      const dateA = a.data || a.dataTransacao || "";
      const dateB = b.data || b.dataTransacao || "";
      return dateA.localeCompare(dateB);
    });

    let runningBalance = 0;
    const timeline: TimelinePoint[] = [];

    // Se temos saldo de captação inicial e rendimentos registrados
    sorted.forEach((tx, idx) => {
      const isCredit = tx.tipo === "CREDITO";
      const val = Math.abs(Number(tx.valor) || 0);

      if (isCredit) {
        runningBalance += val;
      } else {
        runningBalance -= val;
      }

      const rawDate = tx.data || tx.dataTransacao || "";

      timeline.push({
        index: idx,
        date: rawDate,
        formattedDate: formatDate(rawDate),
        txId: tx.id,
        description: tx.descricaoExtrato || tx.favorecido || (isCredit ? "Crédito Bancário" : "Débito"),
        type: isCredit ? "CREDITO" : "DEBITO",
        amount: val,
        balance: runningBalance,
        isNegative: runningBalance < 0,
      });
    });

    return timeline;
  }, [transactions]);

  if (points.length === 0) return null;

  // Dimensões do SVG
  const width = 800;
  const height = 180;
  const paddingX = 40;
  const paddingY = 25;

  const balances = points.map((p) => p.balance);
  const minBalance = Math.min(0, ...balances);
  const maxBalance = Math.max(project.valorAprovado || 1000, ...balances);
  const balanceRange = maxBalance - minBalance || 1;

  const getY = (val: number) => {
    const norm = (val - minBalance) / balanceRange;
    return height - paddingY - norm * (height - 2 * paddingY);
  };

  const getX = (idx: number) => {
    if (points.length <= 1) return width / 2;
    return paddingX + (idx / (points.length - 1)) * (width - 2 * paddingX);
  };

  // Gerar caminho SVG da linha
  const pathD = points
    .map((p, idx) => `${idx === 0 ? "M" : "L"} ${getX(idx).toFixed(1)} ${getY(p.balance).toFixed(1)}`)
    .join(" ");

  // Área preenchida sob a curva
  const areaD = `${pathD} L ${getX(points.length - 1).toFixed(1)} ${getY(0).toFixed(1)} L ${getX(0).toFixed(1)} ${getY(0).toFixed(1)} Z`;

  const zeroY = getY(0);
  const hasNegativeBalance = points.some((p) => p.isNegative);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Linha Temporal do Saldo em Conta
            </h3>
            <p className="text-xs text-slate-400">
              Trajetória de saldo bancário, entradas de captação e débitos executados
            </p>
          </div>
        </div>

        {hasNegativeBalance && (
          <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Alerta: Saldo a descoberto detectado no período</span>
          </div>
        )}
      </div>

      {/* SVG Canvas */}
      <div className="w-full overflow-x-auto">
        <div className="min-w-[650px]">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
            <defs>
              <linearGradient id="balanceAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Linha de zero / baseline */}
            <line
              x1={paddingX}
              y1={zeroY}
              x2={width - paddingX}
              y2={zeroY}
              stroke="#334155"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
            <text x={paddingX - 5} y={zeroY + 3} textAnchor="end" className="text-[9px] fill-slate-500 font-mono">
              R$ 0
            </text>

            {/* Top limit line */}
            <line
              x1={paddingX}
              y1={paddingY}
              x2={width - paddingX}
              y2={paddingY}
              stroke="#1e293b"
              strokeWidth="1"
            />
            <text x={paddingX - 5} y={paddingY + 3} textAnchor="end" className="text-[9px] fill-slate-500 font-mono">
              {formatCurrency(maxBalance)}
            </text>

            {/* Area Fill */}
            <path d={areaD} fill="url(#balanceAreaGrad)" />

            {/* Line Path */}
            <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />

            {/* Event Dots (sample every few points or major moves) */}
            {points.map((p, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === points.length - 1;
              const isCredit = p.type === "CREDITO";
              const isLargeMove = p.amount > 20000;

              if (!isFirst && !isLast && !isCredit && !isLargeMove && idx % 10 !== 0) return null;

              const cx = getX(idx);
              const cy = getY(p.balance);

              return (
                <circle
                  key={p.txId || idx}
                  cx={cx}
                  cy={cy}
                  r={isCredit ? 4.5 : isLast ? 4 : 3}
                  className={`cursor-pointer transition-transform hover:scale-150 ${
                    p.isNegative
                      ? "fill-rose-500 stroke-slate-900 stroke-2"
                      : isCredit
                      ? "fill-emerald-400 stroke-slate-900 stroke-2"
                      : "fill-sky-400 stroke-slate-900 stroke-2"
                  }`}
                  onMouseEnter={() => setHoveredPoint(p)}
                  onClick={() => onSelectTransaction?.(p.txId)}
                />
              );
            })}
          </svg>
        </div>
      </div>

      {/* Hover Information Banner */}
      {hoveredPoint ? (
        <div className="mt-3 p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono text-slate-400">{hoveredPoint.formattedDate}</span>
            <span className="font-semibold text-white truncate max-w-xs">{hoveredPoint.description}</span>
          </div>
          <div className="flex items-center gap-4 font-mono">
            <span className={hoveredPoint.type === "CREDITO" ? "text-emerald-400" : "text-rose-400"}>
              {hoveredPoint.type === "CREDITO" ? "+ " : "- "}
              {formatCurrency(hoveredPoint.amount)}
            </span>
            <span className="text-slate-300">
              Saldo resultante:{" "}
              <strong className={hoveredPoint.isNegative ? "text-rose-400" : "text-emerald-300"}>
                {formatCurrency(hoveredPoint.balance)}
              </strong>
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-2 text-right text-[10px] text-slate-500 font-mono">
          {points.length} movimentações cronológicas mapeadas
        </div>
      )}
    </div>
  );
};

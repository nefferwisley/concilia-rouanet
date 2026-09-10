import React, { useState } from "react";
import { formatCurrency } from "../../utils/formatters";

export interface BudgetBulletChartProps {
  label: string;
  sublabel?: string;
  approved: number;
  executed: number;
  limit20?: number;
  color?: string;
  showDetails?: boolean;
}

export const BudgetBulletChart: React.FC<BudgetBulletChartProps> = ({
  label,
  sublabel,
  approved,
  executed,
  limit20,
  color = "bg-emerald-500",
  showDetails = true,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const safeApproved = Math.max(0, Number(approved) || 0);
  const safeExecuted = Math.max(0, Number(executed) || 0);
  const percent = safeApproved > 0 ? (safeExecuted / safeApproved) * 100 : 0;
  const isOverBudget = safeExecuted > safeApproved;
  const saldo = safeApproved - safeExecuted;

  // Escala dinâmica: o domínio máximo do gráfico é pelo menos 125% do aprovado ou 110% do executado,
  // permitindo que o excesso ultrapasse visualmente o marcador de 100% sem nenhum corte (anti-clipping).
  const maxDomain = Math.max(safeApproved * 1.25, safeExecuted * 1.08, 1);
  const approvedPosPercent = Math.min(95, (safeApproved / maxDomain) * 100);
  const executedPosPercent = Math.min(100, (safeExecuted / maxDomain) * 100);

  // Barra de 100% normal vs excesso
  const normalBarWidth = Math.min(executedPosPercent, approvedPosPercent);
  const excessBarWidth = executedPosPercent > approvedPosPercent ? executedPosPercent - approvedPosPercent : 0;

  const excessPp = (percent - 100).toFixed(1);
  const percentText = isOverBudget
    ? `${percent.toFixed(1)}% executado — excede o limite em ${excessPp} p.p.`
    : `${percent.toFixed(1)}% executado`;

  const chartDescription = `${label}: Orçamento aprovado de ${formatCurrency(safeApproved)}, executado ${formatCurrency(safeExecuted)} (${percent.toFixed(1)}%)${isOverBudget ? ` — excede o limite em ${excessPp} pontos percentuais` : ""}.`;

  return (
    <div
      role="img"
      aria-label={chartDescription}
      className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3.5 transition hover:border-slate-700"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
        <div className="min-w-0">
          <span className="font-semibold text-slate-200 truncate block">{label}</span>
          {sublabel && <span className="text-xs text-slate-400 block truncate">{sublabel}</span>}
        </div>
        <div className="text-right shrink-0">
          <span className="font-mono text-slate-200 font-bold">{formatCurrency(safeExecuted)}</span>
          <span className="text-slate-400 text-xs font-normal ml-1">/ {formatCurrency(safeApproved)}</span>
        </div>
      </div>

      {/* Bullet Chart Track */}
      <div className="relative w-full h-4 bg-slate-900 rounded-lg overflow-visible my-1.5 border border-slate-800">
        {/* Zona Legal 100% (Background range) */}
        <div
          className="absolute top-0 bottom-0 left-0 bg-slate-800/40 rounded-l-lg"
          style={{ width: `${approvedPosPercent}%` }}
        />

        {/* Barra de Execução Normal (até 100%) */}
        <div
          className={`absolute top-0.5 bottom-0.5 left-0 rounded-l transition-all duration-500 ${
            isOverBudget ? "bg-amber-400" : color
          }`}
          style={{ width: `${normalBarWidth}%` }}
        />

        {/* Barra de Excesso Estendida (> 100% Não-cortada / Unclipped) */}
        {excessBarWidth > 0 && (
          <div
            className="absolute top-0.5 bottom-0.5 bg-rose-500 rounded-r transition-all duration-500 animate-pulse"
            style={{
              left: `${approvedPosPercent}%`,
              width: `${excessBarWidth}%`,
            }}
            title={`Excesso orçamentário: +${formatCurrency(safeExecuted - safeApproved)} (${percent.toFixed(1)}%)`}
          />
        )}

        {/* Marcador Vertical de 100% do Teto Aprovado */}
        <div
          className="absolute top-[-3px] bottom-[-3px] w-1 bg-white shadow-md shadow-white/40 rounded-full z-10"
          style={{ left: `${approvedPosPercent}%` }}
          title={`Teto Aprovado: ${formatCurrency(safeApproved)} (100%)`}
        />

        {/* Marcador do Limite de Remanejamento (+20%) se configurado */}
        {limit20 && limit20 > safeApproved && (
          <div
            className="absolute top-[-2px] bottom-[-2px] w-0.5 bg-amber-400/80 border-dashed border-amber-400 z-10"
            style={{ left: `${Math.min(99, (limit20 / maxDomain) * 100)}%` }}
            title={`Limite Legal Remanejamento 20%: ${formatCurrency(limit20)}`}
          />
        )}
      </div>

      {/* Detalhes e Indicadores inferiores */}
      {showDetails && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-300 mt-1 gap-1">
          <div className="flex items-center gap-2">
            <span>
              Saldo:{" "}
              <strong className={`font-mono ${saldo < 0 ? "text-rose-400 font-bold" : "text-slate-200"}`}>
                {saldo < 0 ? `- ${formatCurrency(Math.abs(saldo))}` : formatCurrency(saldo)}
              </strong>
            </span>
            {isOverBudget && (
              <span className="text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded font-semibold">
                Estouro Orçamentário
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`font-mono font-semibold ${isOverBudget ? "text-rose-400 font-bold" : "text-slate-300"}`}>
              {percentText}
            </span>
          </div>
        </div>
      )}

      {/* Tooltip interativo ao pairar */}
      {isHovered && (
        <div className="mt-2 pt-2 border-t border-slate-800 text-xs text-slate-300 flex justify-between font-mono">
          <span>Aprovado: {formatCurrency(safeApproved)}</span>
          <span>Executado: {formatCurrency(safeExecuted)}</span>
          <span className={saldo < 0 ? "text-rose-400 font-bold" : "text-emerald-400"}>
            {saldo < 0 ? "Excesso: " : "Disponível: "}
            {formatCurrency(Math.abs(saldo))}
          </span>
        </div>
      )}
    </div>
  );
};

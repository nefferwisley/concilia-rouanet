import React from "react";
import { CheckCircle2, Clock, AlertTriangle, Search } from "lucide-react";
import type { BankTransaction, TripartiteEntry } from "../../types";

export type StandardStatus = "Conciliado" | "Pendente" | "Em revisão" | "Alerta";

export interface StatusBadgeProps {
  status?: StandardStatus | string | BankTransaction | TripartiteEntry;
  detail?: string;
  showDetail?: boolean;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  tooltipText?: string;
  /** Submotivo legível, como "NF ausente" ou "Risco de glosa". */
  detail?: string;
  className?: string;
  onClick?: () => void;
}

/**
 * Resolve o submotivo descritivo para enriquecer a taxonomia única
 * Exemplo: "NF ausente", "Sem comprovante BB", "Risco de glosa", "Rateio parcial"
 */
export function resolveStatusDetail(
  input: {
    status?: string;
    hasFiscalDoc?: boolean;
    hasBankVoucher?: boolean;
    hasRubric?: boolean;
    isReconciled?: boolean;
    alertaRisco?: string;
  } | BankTransaction | TripartiteEntry | string | undefined
): string | undefined {
  if (!input || typeof input === "string") return undefined;

  // Se for TripartiteEntry
  if ("statusTripartite" in input || "checkTripe" in input) {
    const entry = input as TripartiteEntry;
    if (entry.observacoes?.toUpperCase().includes("GLOSA") || entry.statusTripartite?.includes("DIVERG")) {
      return "Risco de glosa";
    }
    const hasFiscal = Boolean(entry.idDocFiscal || entry.numeroDoc || entry.checkTripe?.fiscalDocAnexo);
    const hasBank = Boolean(entry.idTransacaoBB || entry.checkTripe?.comprovanteBancarioAnexo);
    if (!hasFiscal) return "NF ausente";
    if (!hasBank) return "Comprovante ausente";
    if (entry.statusSalic === "Em Lançamento" || entry.statusTripartite?.includes("PARCIAL")) {
      return "Em conferência";
    }
    return undefined;
  }

  // Se for BankTransaction
  const tx = input as BankTransaction;
  const rawStatus = (tx.status || tx.statusConciliacao || "").toUpperCase();
  if (rawStatus === "ALERTA_GLOSA" || tx.alertaRisco) {
    return tx.alertaRisco || "Risco de glosa";
  }
  const hasFiscal = Boolean(tx.matchedDocId || tx.idDocumentoFiscalVinculado);
  const hasBank = Boolean(tx.documentoNumero || tx.documentoBancario);
  if (!hasFiscal && !hasBank) return "NF e comprovante ausentes";
  if (!hasFiscal) return "NF ausente";
  if (!hasBank) return "Comprovante ausente";
  if (rawStatus === "PARCIAL") return "Rateio parcial";

  return undefined;
}

/**
 * Normaliza qualquer status interno de transação, documento ou tripartite
 * para um dos 4 estados de apresentação canônicos exigidos pela auditoria:
 * 1. Conciliado
 * 2. Pendente
 * 3. Em revisão
 * 4. Alerta
 */
export function resolveStandardStatus(
  input: {
    status?: string;
    hasFiscalDoc?: boolean;
    hasBankVoucher?: boolean;
    hasRubric?: boolean;
    isReconciled?: boolean;
    alertaRisco?: string;
  } | BankTransaction | TripartiteEntry | string | undefined,
  _isDebit: boolean = true
): StandardStatus {
  if (!input) return "Pendente";

  // Se for string direta
  if (typeof input === "string") {
    const s = input.toUpperCase().trim();
    if (s.includes("GLOSA") || s.includes("ALERTA") || s.includes("DIVERG")) {
      return "Alerta";
    }
    if (s.includes("REVIS") || s.includes("PARCIAL") || s.includes("ANALISE")) {
      return "Em revisão";
    }
    if (s.includes("CONCILIADO") || s.includes("COMPROVADO") || s.includes("OK") || s.includes("VALIDADO")) {
      return "Conciliado";
    }
    return "Pendente";
  }

  // Se for TripartiteEntry
  if ("statusTripartite" in input || "checkTripe" in input) {
    const entry = input as TripartiteEntry;
    if (
      entry.statusTripartite?.includes("DIVERG") ||
      entry.observacoes?.toUpperCase().includes("GLOSA") ||
      entry.observacoes?.toUpperCase().includes("ALERTA")
    ) {
      return "Alerta";
    }
    const hasFiscal = Boolean(entry.idDocFiscal || entry.numeroDoc || entry.checkTripe?.fiscalDocAnexo);
    const hasBank = Boolean(entry.idTransacaoBB || entry.checkTripe?.comprovanteBancarioAnexo);
    const hasRubric = Boolean(entry.idRubrica);

    if (hasFiscal && hasBank && hasRubric) {
      if (
        entry.statusTripartite === "CONCILIADO_PERFEITO" ||
        entry.statusTripartite === "CONCILIADO LÍQUIDO/BRUTO" ||
        entry.statusTripartite === "CONCILIADO COM RETENÇÃO"
      ) {
        return "Conciliado";
      }
      return "Em revisão";
    }

    if (entry.statusSalic === "Em Lançamento" || entry.statusTripartite?.includes("PARCIAL")) {
      return "Em revisão";
    }

    return "Pendente";
  }

  // Se for BankTransaction
  const tx = input as BankTransaction;
  const rawStatus = (tx.status || tx.statusConciliacao || "").toUpperCase();

  if (rawStatus === "ALERTA_GLOSA" || rawStatus.includes("ALERTA") || Boolean(tx.alertaRisco)) {
    return "Alerta";
  }

  const hasFiscal = Boolean(tx.matchedDocId || tx.idDocumentoFiscalVinculado);
  const isDirectReconciled = rawStatus === "CONCILIADO" || rawStatus === "CONCILIADO_TOTAL";

  if (isDirectReconciled && hasFiscal) {
    return "Conciliado";
  }

  if (rawStatus === "PARCIAL" || (hasFiscal && !isDirectReconciled)) {
    return "Em revisão";
  }

  return "Pendente";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status = "Pendente",
  detail,
  showDetail = false,
  size = "md",
  showTooltip = false,
  tooltipText,
  detail,
  className = "",
  onClick,
}) => {
  const normalized: StandardStatus =
    typeof status === "string" && ["Conciliado", "Pendente", "Em revisão", "Alerta"].includes(status)
      ? (status as StandardStatus)
      : resolveStandardStatus(status);

  const resolvedDetail = detail !== undefined ? detail : (showDetail ? resolveStatusDetail(status) : undefined);

  // Configuração acessível segura para daltonismo (WCAG 2.1 AA)
  const styleConfig = {
    Conciliado: {
      bg: "bg-emerald-950/60",
      text: "text-emerald-300",
      border: "border-emerald-500/50",
      icon: CheckCircle2,
      iconColor: "text-emerald-400",
      defaultTooltip: "Lançamento totalmente comprovado com nexo documental e bancário completo.",
      ariaLabel: "Status: Conciliado",
    },
    Pendente: {
      bg: "bg-amber-950/60",
      text: "text-amber-300",
      border: "border-amber-500/50",
      icon: Clock,
      iconColor: "text-amber-400",
      defaultTooltip: "Lançamento pendente de nota fiscal, comprovante bancário ou rubrica orçamentária.",
      ariaLabel: "Status: Pendente",
    },
    "Em revisão": {
      bg: "bg-sky-950/60",
      text: "text-sky-300",
      border: "border-sky-500/50",
      icon: Search,
      iconColor: "text-sky-400",
      defaultTooltip: "Documentos em conferência ou conciliação parcial aguardando validação final.",
      ariaLabel: "Status: Em revisão",
    },
    Alerta: {
      bg: "bg-rose-950/60",
      text: "text-rose-300",
      border: "border-rose-500/60",
      icon: AlertTriangle,
      iconColor: "text-rose-400",
      defaultTooltip: "Risco de glosa ou divergência material com normas do MinC / ANCINE.",
      ariaLabel: "Status: Alerta de Glosa ou Risco",
    },
  }[normalized];

  // Fontes: piso operacional mínimo de 12px (text-xs) no tamanho sm; 14px (text-sm) no md e lg
  const sizeClasses = {
    sm: "text-xs px-2.5 py-1 gap-1.5 min-h-[28px]",
    md: "text-xs sm:text-sm px-3 py-1 gap-2 font-medium",
    lg: "text-sm px-3.5 py-1.5 gap-2 font-semibold",
  }[size];

  const iconSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-4 h-4",
  }[size];

  const Icon = styleConfig.icon;
  const description = tooltipText || styleConfig.defaultTooltip;

  const fullLabel = resolvedDetail ? `${normalized} — ${resolvedDetail}` : normalized;

  const badgeContent = (
    <span
      role="status"
      aria-label={`${styleConfig.ariaLabel}${resolvedDetail ? `: ${resolvedDetail}` : ""}`}
      title={showTooltip || tooltipText ? description : undefined}
      className={`inline-flex items-center font-medium rounded-lg border ${styleConfig.bg} ${styleConfig.text} ${styleConfig.border} ${sizeClasses} ${className} select-none transition-colors`}
    >
      <Icon className={`${iconSizes} ${styleConfig.iconColor} shrink-0`} aria-hidden="true" />
      <span>{fullLabel}</span>
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="cursor-pointer min-h-[44px] min-w-[44px] inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg"
      >
        {badgeContent}
      </button>
    );
  }

  return badgeContent;
};

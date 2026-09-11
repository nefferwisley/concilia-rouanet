export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

export function formatDate(dateString: string): string {
  if (!dateString) return "-";
  const parts = dateString.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
}

export function formatCnpjCpf(value: string): string {
  if (!value) return "";
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length === 14) {
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  return value;
}

export function calculatePercent(part: number, total: number): number {
  if (!total || total === 0) return 0;
  // 125% precisa continuar visível para não esconder estouro orçamentário.
  return Math.round((part / total) * 100);
}

/**
 * Formata percentuais orçamentários sinalizando expressamente quando há estouro (> 100% ou limite legal)
 * Exemplo: "125.0% — excede o limite em 25.0 p.p."
 */
export function formatPercentWithExcess(percent: number, limit: number = 100): string {
  const rounded = Number(percent.toFixed(1));
  if (rounded > limit) {
    const excess = Number((rounded - limit).toFixed(1));
    return `${rounded}% — excede o limite em ${excess} p.p.`;
  }
  return `${rounded}%`;
}

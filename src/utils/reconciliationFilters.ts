import type { BankTransaction, FiscalDocument, TripartiteEntry, BudgetRubric } from "../types";
import { resolveExpenseCategory, type ExpenseCategory } from "./expenseCategory";
import { isTransactionReconciled } from "./projectFinancialSummary";

export type SortCriteria =
  | "ACTION_DEFAULT"
  | "RISK_DESC"
  | "VALUE_DESC"
  | "VALUE_ASC"
  | "DATE_DESC"
  | "DATE_ASC"
  | "FAVORECIDO_ASC";

export type FilterPreset =
  | "ALL"
  | "SEM_NF"
  | "SEM_COMPROVANTE"
  | "MAIOR_RISCO"
  | "MAIORES_VALORES"
  | "MAIS_ANTIGOS";

export interface TransactionFilterOptions {
  searchQuery?: string;
  period?: string; // "YYYY-MM" or "ALL"
  statusFilter?: string; // "ALL" | "CONCILIADO" | "PENDENTE" | "PARCIAL" | "ALERTA_GLOSA" | "CREDITO"
  expenseCategory?: ExpenseCategory | "ALL";
  preset?: FilterPreset;
  sortBy?: SortCriteria;
  hasImportedBankStatement?: boolean;
}

export function sortTransactionsActionOriented(
  transactions: BankTransaction[],
  sortBy: SortCriteria = "ACTION_DEFAULT",
  hasImportedBankStatement: boolean = true
): BankTransaction[] {
  const list = [...transactions];

  return list.sort((a, b) => {
    const isGlosaA = a.status === "ALERTA_GLOSA" || Boolean(a.alertaRisco);
    const isGlosaB = b.status === "ALERTA_GLOSA" || Boolean(b.alertaRisco);

    const hasNfA = Boolean(a.matchedDocId || a.idDocumentoFiscalVinculado);
    const hasNfB = Boolean(b.matchedDocId || b.idDocumentoFiscalVinculado);

    const hasBankA = Boolean(a.documentoNumero || a.documentoBancario || hasImportedBankStatement);
    const hasBankB = Boolean(b.documentoNumero || b.documentoBancario || hasImportedBankStatement);

    const valA = Number(a.valor) || 0;
    const valB = Number(b.valor) || 0;

    const dateA = a.data || a.dataTransacao || "";
    const dateB = b.data || b.dataTransacao || "";

    const nameA = (a.favorecido || a.descricaoExtrato || "").toLowerCase();
    const nameB = (b.favorecido || b.descricaoExtrato || "").toLowerCase();

    switch (sortBy) {
      case "RISK_DESC":
        if (isGlosaA !== isGlosaB) return isGlosaA ? -1 : 1;
        return valB - valA;

      case "VALUE_DESC":
        return valB - valA;

      case "VALUE_ASC":
        return valA - valB;

      case "DATE_DESC":
        return dateB.localeCompare(dateA);

      case "DATE_ASC":
        return dateA.localeCompare(dateB);

      case "FAVORECIDO_ASC":
        return nameA.localeCompare(nameB);

      case "ACTION_DEFAULT":
      default:
        // Ordem canônica:
        // 1. Glosa / Alerta de Risco
        // 2. Sem Nota Fiscal
        // 3. Sem Comprovante Bancário
        // 4. Maior Valor
        // 5. Mais Antigo (data ASC)
        if (isGlosaA !== isGlosaB) return isGlosaA ? -1 : 1;
        if (hasNfA !== hasNfB) return hasNfA ? 1 : -1; // sem NF primeiro
        if (hasBankA !== hasBankB) return hasBankA ? 1 : -1; // sem comprovante primeiro
        if (valA !== valB) return valB - valA; // maior valor
        return dateA.localeCompare(dateB); // mais antigo
    }
  });
}

export function filterTransactions(
  transactions: BankTransaction[],
  rubrics: BudgetRubric[],
  options: TransactionFilterOptions
): BankTransaction[] {
  const {
    searchQuery = "",
    period = "ALL",
    statusFilter = "ALL",
    expenseCategory = "ALL",
    preset = "ALL",
    sortBy = "ACTION_DEFAULT",
    hasImportedBankStatement = true,
  } = options;

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filtered = transactions.filter((tx) => {
    const isDebit =
      tx.tipo === "DEBITO" || tx.tipo === "TARIFA" || !tx.tipo || (tx as any).tipoMovimento === "DEBIT";
    const isCredit =
      tx.tipo === "CREDITO" || tx.tipo === "RENDIMENTO" || tx.tipo === "RESGATE" || (tx as any).tipoMovimento === "CREDIT";
    const reconciled = isTransactionReconciled(tx, hasImportedBankStatement);
    const hasNf = Boolean(tx.matchedDocId || tx.idDocumentoFiscalVinculado);
    const hasBank = Boolean(tx.documentoNumero || tx.documentoBancario);
    const isGlosa = tx.status === "ALERTA_GLOSA" || Boolean(tx.alertaRisco);

    // Filtro por período (YYYY-MM)
    if (period !== "ALL") {
      const txDate = tx.data || tx.dataTransacao || "";
      if (!txDate.startsWith(period)) return false;
    }

    // Filtro por status
    if (statusFilter === "CONCILIADO" && !reconciled) return false;
    if (statusFilter === "PENDENTE" && (!isDebit || reconciled || isGlosa)) return false;
    if (statusFilter === "PARCIAL" && tx.status !== "PARCIAL") return false;
    if (statusFilter === "ALERTA_GLOSA" && !isGlosa) return false;
    if (statusFilter === "CREDITO" && !isCredit) return false;
    if (statusFilter === "DEBITO" && !isDebit) return false;

    // Filtro por categoria
    if (expenseCategory !== "ALL") {
      if (resolveExpenseCategory(tx, rubrics) !== expenseCategory) return false;
    }

    // Filtro por Preset
    if (preset === "SEM_NF") {
      if (!isDebit || hasNf) return false;
    } else if (preset === "SEM_COMPROVANTE") {
      if (!isDebit || hasBank) return false;
    } else if (preset === "MAIOR_RISCO") {
      if (!isGlosa && reconciled) return false;
    }

    // Busca textual
    if (normalizedQuery) {
      const desc = (tx.descricaoExtrato || tx.descricao || tx.descricaoOriginalExtrato || "").toLowerCase();
      const fav = (tx.favorecido || "").toLowerCase();
      const docNum = (tx.documentoNumero || tx.documentoBancario || "").toLowerCase();
      const valStr = String(tx.valor || "");
      const obs = (tx.observacoes || "").toLowerCase();

      const matches =
        desc.includes(normalizedQuery) ||
        fav.includes(normalizedQuery) ||
        docNum.includes(normalizedQuery) ||
        valStr.includes(normalizedQuery) ||
        obs.includes(normalizedQuery);

      if (!matches) return false;
    }

    return true;
  });

  // Ajustar ordenação se o preset sugerir ordenação específica
  let effectiveSort = sortBy;
  if (preset === "MAIORES_VALORES" && sortBy === "ACTION_DEFAULT") {
    effectiveSort = "VALUE_DESC";
  } else if (preset === "MAIS_ANTIGOS" && sortBy === "ACTION_DEFAULT") {
    effectiveSort = "DATE_ASC";
  } else if (preset === "MAIOR_RISCO" && sortBy === "ACTION_DEFAULT") {
    effectiveSort = "RISK_DESC";
  }

  return sortTransactionsActionOriented(filtered, effectiveSort, hasImportedBankStatement);
}

import type { BankTransaction, BudgetRubric } from "../types";

export type ExpenseCategory =
  | "ALIMENTACAO_DIARIAS"
  | "ROTEIRO_DIRECAO"
  | "HOSPEDAGEM"
  | "PASSAGENS_AEREAS"
  | "PRODUCAO_EQUIPE"
  | "TRANSPORTE_TERRESTRE"
  | "PRESTACAO_CONTAS"
  | "MATERIAL_CONSUMO"
  | "EDICAO_FINALIZACAO"
  | "OUTROS";

export const EXPENSE_CATEGORY_ORDER: ExpenseCategory[] = [
  "ALIMENTACAO_DIARIAS",
  "ROTEIRO_DIRECAO",
  "HOSPEDAGEM",
  "PASSAGENS_AEREAS",
  "PRODUCAO_EQUIPE",
  "TRANSPORTE_TERRESTRE",
  "PRESTACAO_CONTAS",
  "MATERIAL_CONSUMO",
  "EDICAO_FINALIZACAO",
  "OUTROS",
];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  ALIMENTACAO_DIARIAS: "Alimentação e diárias",
  ROTEIRO_DIRECAO: "Roteiro e direção",
  HOSPEDAGEM: "Hospedagem",
  PASSAGENS_AEREAS: "Passagens aéreas",
  PRODUCAO_EQUIPE: "Produção e equipe",
  TRANSPORTE_TERRESTRE: "Transporte terrestre",
  PRESTACAO_CONTAS: "Prestação de contas",
  MATERIAL_CONSUMO: "Material de consumo",
  EDICAO_FINALIZACAO: "Edição e finalização",
  OUTROS: "Outros",
};

const normalize = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const resolveExpenseCategory = (
  transaction: BankTransaction,
  rubrics: BudgetRubric[],
): ExpenseCategory => {
  const rubric = rubrics.find(
    (item) =>
      item.id === transaction.matchedRubricId ||
      item.id === transaction.rubricaId ||
      item.id === transaction.idRubricaVinculada,
  );
  const source = normalize(
    [rubric?.nome, rubric?.nomeRubrica, transaction.descricaoExtrato, transaction.descricao]
      .filter(Boolean)
      .join(" "),
  );

  if (/perdiem|alimentacao/.test(source)) return "ALIMENTACAO_DIARIAS";
  if (/hospedagem/.test(source)) return "HOSPEDAGEM";
  if (/passagens?/.test(source)) return "PASSAGENS_AEREAS";
  if (/taxi|carro de producao|van de equipe/.test(source)) return "TRANSPORTE_TERRESTRE";
  if (/roteiro|\bdiretor\b/.test(source)) return "ROTEIRO_DIRECAO";
  if (/despesas? de producao|assistente de producao/.test(source)) return "PRODUCAO_EQUIPE";
  if (/controller|prestacao de contas/.test(source)) return "PRESTACAO_CONTAS";
  if (/material de consumo/.test(source)) return "MATERIAL_CONSUMO";
  if (/edicao|finalizacao/.test(source)) return "EDICAO_FINALIZACAO";
  return "OUTROS";
};

export const getExpenseCategoryCounts = (
  transactions: BankTransaction[],
  rubrics: BudgetRubric[],
): Map<ExpenseCategory, number> => {
  const counts = new Map<ExpenseCategory, number>();
  transactions.forEach((transaction) => {
    const category = resolveExpenseCategory(transaction, rubrics);
    counts.set(category, (counts.get(category) || 0) + 1);
  });
  return counts;
};

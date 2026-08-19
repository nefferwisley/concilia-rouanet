import { z } from "zod";

// =========================================================================
// INSTRUCTOR / PYDANTIC PATTERN (ZOD SCHEMA-FIRST EXTRACTION & VALIDATION)
// =========================================================================

export const FiscalDocumentZodSchema = z.object({
  tipo: z.enum([
    "NF-e (Produto)",
    "NFS-e (Serviço)",
    "Bilhete de Passagem Aérea (BP-e / E-Ticket)",
    "Recibo de Diária / Verba de Alimentação",
    "Fatura de Agência de Viagens",
    "RPA (Autônomo)",
    "Cupom Fiscal",
    "Recibo de Cachê",
    "Guia de Recolhimento (DARF/GPS/DAM)",
  ]),
  numeroDoc: z.string().min(1, "Número do documento obrigatório"),
  serie: z.string().default("1"),
  dataEmissao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de emissão deve estar no formato YYYY-MM-DD"),
  fornecedorNome: z.string().min(2, "Nome/Razão Social do fornecedor obrigatório"),
  fornecedorCnpjCpf: z.string().min(11, "CNPJ ou CPF do fornecedor obrigatório"),
  descricaoServico: z.string().min(3, "Descrição do serviço/produto obrigatória"),
  valorBruto: z.number().positive("Valor bruto deve ser maior que zero"),
  retencaoIss: z.number().nonnegative().default(0),
  retencaoIrrf: z.number().nonnegative().default(0),
  retencaoInss: z.number().nonnegative().default(0),
  valorLiquido: z.number().positive("Valor líquido deve ser maior que zero"),
  etapaSugerida: z.string().optional(),
  itemRubricaSugerido: z.string().optional(),
  justificativaSalic: z.string().optional(),
}).refine(
  (data) => {
    const totalRetencoes = (data.retencaoIss || 0) + (data.retencaoIrrf || 0) + (data.retencaoInss || 0);
    const esperadoLiquido = data.valorBruto - totalRetencoes;
    // Permite tolerância de R$ 0.10 para arredondamento fiscal
    return Math.abs(esperadoLiquido - data.valorLiquido) <= 0.10;
  },
  {
    message: "Inconsistência tributária: Valor Líquido deve ser igual ao Valor Bruto menos Retenções (ISS + IRRF + INSS).",
    path: ["valorLiquido"],
  }
);

export const BankTransactionZodSchema = z.object({
  id: z.string().min(1),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data no formato YYYY-MM-DD"),
  tipo: z.enum(["DEBITO", "CREDITO", "APLICACAO", "RESGATE", "TARIFA"]),
  valor: z.number().positive("Valor da transação deve ser positivo"),
  descricaoExtrato: z.string().min(2, "Descrição do extrato obrigatória"),
  documentoBancario: z.string().optional(),
  favorecido: z.string().optional(),
  cnpjCpfFavorecido: z.string().optional(),
});

export const BudgetRubricZodSchema = z.object({
  id: z.string().min(1),
  etapa: z.string().min(1),
  itemNumero: z.string().min(1),
  nome: z.string().min(2),
  valorAprovado: z.number().nonnegative(),
  valorExecutado: z.number().nonnegative().default(0),
  limiteRemanejamento20: z.number().nonnegative(),
});

export type ValidatedFiscalDoc = z.infer<typeof FiscalDocumentZodSchema>;
export type ValidatedBankTx = z.infer<typeof BankTransactionZodSchema>;
export type ValidatedRubric = z.infer<typeof BudgetRubricZodSchema>;

/**
 * Validates and self-corrects data against the schema (Instructor retry mechanism)
 */
export function validateWithAutoCorrection<T>(
  schema: z.ZodType<T>,
  rawInput: any
): { success: boolean; data?: T; errors?: string[]; corrected?: boolean } {
  const result = schema.safeParse(rawInput);
  if (result.success) {
    return { success: true, data: result.data, corrected: false };
  }

  // Attempt auto-corrections for common LLM extraction flaws
  const correctedInput = { ...rawInput };
  let wasCorrected = false;

  // 1. Fix date format if in DD/MM/YYYY
  if (typeof correctedInput.dataEmissao === "string" && correctedInput.dataEmissao.includes("/")) {
    const parts = correctedInput.dataEmissao.split("/");
    if (parts.length === 3 && parts[2].length === 4) {
      correctedInput.dataEmissao = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      wasCorrected = true;
    }
  }

  // 2. Fix string numbers to actual numbers
  const numFields = ["valorBruto", "valorLiquido", "retencaoIss", "retencaoIrrf", "retencaoInss", "valor", "valorAprovado"];
  for (const field of numFields) {
    if (typeof correctedInput[field] === "string") {
      const cleanNum = parseFloat(
        correctedInput[field].replace("R$", "").replace(/\./g, "").replace(",", ".").trim()
      );
      if (!isNaN(cleanNum)) {
        correctedInput[field] = cleanNum;
        wasCorrected = true;
      }
    }
  }

  // 3. Fix negative value issues
  if (typeof correctedInput.valor === "number" && correctedInput.valor < 0) {
    correctedInput.valor = Math.abs(correctedInput.valor);
    correctedInput.tipo = "DEBITO";
    wasCorrected = true;
  }

  // 4. Recalculate net value if omitted or inconsistent
  if (correctedInput.valorBruto && !correctedInput.valorLiquido) {
    const ret = (correctedInput.retencaoIss || 0) + (correctedInput.retencaoIrrf || 0) + (correctedInput.retencaoInss || 0);
    correctedInput.valorLiquido = Math.max(0, correctedInput.valorBruto - ret);
    wasCorrected = true;
  }

  const secondAttempt = schema.safeParse(correctedInput);
  if (secondAttempt.success) {
    return { success: true, data: secondAttempt.data, corrected: wasCorrected };
  }

  return {
    success: false,
    errors: secondAttempt.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    corrected: wasCorrected,
  };
}

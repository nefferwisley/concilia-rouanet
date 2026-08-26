/**
 * Motor Fiscal de Retenções Tributárias na Fonte (Lei Rouanet / Audiovisual / Receita Federal)
 * Aplica regras de IRRF (Tabela Progressiva), INSS (Autônomo/RPA) e ISSQN Municipal.
 */

export interface TaxCalculationInput {
  valorBruto: number;
  tipoPessoa: "PF" | "PJ";
  temInssAutonomo?: boolean;
  aliquotaIss?: number; // Ex: 0.02 a 0.05
  dependentes?: number;
}

export interface TaxCalculationResult {
  valorBruto: number;
  inssRetido: number;
  baseCalculoIrrf: number;
  irrfRetido: number;
  issRetido: number;
  totalRetencoes: number;
  valorLiquido: number;
  darfCodigoReceita: string; // Ex: "0588" (RPA/Trabalho sem Vínculo) ou "1708" (PJ)
  darfVencimento: string; // 20º dia do mês subsequente
  linhaDigitavelDarf: string;
}

// Tabela Progressiva Mensal IRRF 2026 (Receita Federal)
export function calcularIrrfProgressivo(baseCalculo: number): number {
  if (baseCalculo <= 2259.20) return 0;
  if (baseCalculo <= 2826.65) return (baseCalculo * 0.075) - 169.44;
  if (baseCalculo <= 3751.05) return (baseCalculo * 0.15) - 381.44;
  if (baseCalculo <= 4664.68) return (baseCalculo * 0.225) - 662.77;
  return (baseCalculo * 0.275) - 896.00;
}

export function calcularRetencoesTributarias(input: TaxCalculationInput): TaxCalculationResult {
  const { valorBruto, tipoPessoa, temInssAutonomo = true, aliquotaIss = 0.05, dependentes = 0 } = input;

  let inssRetido = 0;
  let irrfRetido = 0;
  let issRetido = 0;

  if (tipoPessoa === "PF") {
    // INSS Autônomo (11% retido até o teto)
    const tetoInss = 908.85; // Teto de contribuição mensal
    if (temInssAutonomo) {
      inssRetido = Math.min(valorBruto * 0.11, tetoInss);
    }

    // Base IRRF = Bruto - INSS - Dedução por Dependente (R$ 189,59 por dependente)
    const deducaoDependentes = dependentes * 189.59;
    const baseIrrf = Math.max(0, valorBruto - inssRetido - deducaoDependentes);
    irrfRetido = Math.max(0, calcularIrrfProgressivo(baseIrrf));

    // ISS Autônomo
    issRetido = valorBruto * aliquotaIss;
  } else {
    // PJ: Retenção ampla de IRRF 1.5% e ISS 2% a 5%
    irrfRetido = valorBruto * 0.015;
    issRetido = valorBruto * aliquotaIss;
  }

  const totalRetencoes = inssRetido + irrfRetido + issRetido;
  const valorLiquido = Math.max(0, valorBruto - totalRetencoes);

  // Vencimento DARF: 20 do mês seguinte
  const hoje = new Date();
  const mesSeguinte = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 20);
  const darfVencimento = mesSeguinte.toLocaleDateString("pt-BR");

  const darfCodigoReceita = tipoPessoa === "PF" ? "0588" : "1708";
  const linhaDigitavelDarf = `85890000001 ${irrfRetido.toFixed(2).replace(".", "")} 05880000000 12345678901`;

  return {
    valorBruto,
    inssRetido: Number(inssRetido.toFixed(2)),
    baseCalculoIrrf: Number((valorBruto - inssRetido).toFixed(2)),
    irrfRetido: Number(irrfRetido.toFixed(2)),
    issRetido: Number(issRetido.toFixed(2)),
    totalRetencoes: Number(totalRetencoes.toFixed(2)),
    valorLiquido: Number(valorLiquido.toFixed(2)),
    darfCodigoReceita,
    darfVencimento,
    linhaDigitavelDarf,
  };
}

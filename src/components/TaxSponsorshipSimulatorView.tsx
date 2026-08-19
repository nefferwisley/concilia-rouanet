import React, { useState } from "react";
import {
  Calculator,
  Building,
  UserCheck,
  TrendingUp,
  Percent,
  CheckCircle2,
  HelpCircle,
  FileCheck,
  Sparkles,
  Download,
} from "lucide-react";
import { PronacProject } from "../types";
import { formatCurrency } from "../utils/formatters";

interface TaxSponsorshipSimulatorViewProps {
  project: PronacProject;
}

export const TaxSponsorshipSimulatorView: React.FC<TaxSponsorshipSimulatorViewProps> = ({
  project,
}) => {
  const [sponsorType, setSponsorType] = useState<"PJ_LUCRO_REAL" | "PF_DECLARACAO_COMPLETA">(
    "PJ_LUCRO_REAL"
  );
  const [artigo, setArtigo] = useState<"ARTIGO_18" | "ARTIGO_26">("ARTIGO_18");
  const [tipoAporte, setTipoAporte] = useState<"PATROCINIO" | "DOACAO">("PATROCINIO");

  // Inputs
  const [faturamentoOuRenda, setFaturamentoOuRenda] = useState<number>(5000000); // 5M lucro
  const [irDevidoEstimado, setIrDevidoEstimado] = useState<number>(750000); // 750k IRPJ
  const [valorAporte, setValorAporte] = useState<number>(30000); // 30k patrocínio

  // Calculations
  const tetoPercent = sponsorType === "PJ_LUCRO_REAL" ? 4 : 6;
  const limiteMaximoDeducao = (irDevidoEstimado * tetoPercent) / 100;

  // Abatimento rate
  let aliquotaAbatimento = 100;
  if (artigo === "ARTIGO_26") {
    if (sponsorType === "PJ_LUCRO_REAL") {
      aliquotaAbatimento = tipoAporte === "PATROCINIO" ? 30 : 40;
    } else {
      aliquotaAbatimento = tipoAporte === "PATROCINIO" ? 60 : 80;
    }
  }

  const abatimentoDiretoIR = Math.min(
    limiteMaximoDeducao,
    (valorAporte * aliquotaAbatimento) / 100
  );

  // For PJ in Artigo 26, can also deduct as operational expense (saving ~24% CSLL+IRPJ)
  const economiaDespesaOperacional =
    artigo === "ARTIGO_26" && sponsorType === "PJ_LUCRO_REAL" ? valorAporte * 0.24 : 0;

  const economiaTributariaTotal = Math.min(valorAporte, abatimentoDiretoIR + economiaDespesaOperacional);
  const custoLiquidoEfetivo = Math.max(0, valorAporte - economiaTributariaTotal);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-400" /> Simulador de Patrocínio & Benefício Fiscal Rouanet
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Calcule o abatimento de 100% no IRPJ (Artigo 18) ou dedução proporcional (Artigo 26) para patrocinadores
          </p>
        </div>

        <div className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-xl font-mono">
          Enquadramento do Projeto: <strong>{project.artigoEnquadramento}</strong>
        </div>
      </div>

      {/* Main Grid: Parameters + Result */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Parameters Form (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            Perfil do Apoiador / Patrocinador
          </h2>

          {/* Sponsor Type Toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setSponsorType("PJ_LUCRO_REAL");
                setIrDevidoEstimado(750000);
                setValorAporte(30000);
              }}
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 transition ${
                sponsorType === "PJ_LUCRO_REAL"
                  ? "bg-emerald-500 text-slate-950 border-emerald-400"
                  : "bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800"
              }`}
            >
              <Building className="w-4 h-4" />
              <span>Empresa (Lucro Real - 4%)</span>
            </button>

            <button
              onClick={() => {
                setSponsorType("PF_DECLARACAO_COMPLETA");
                setIrDevidoEstimado(60000);
                setValorAporte(3600);
              }}
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 transition ${
                sponsorType === "PF_DECLARACAO_COMPLETA"
                  ? "bg-emerald-500 text-slate-950 border-emerald-400"
                  : "bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800"
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Pessoa Física (IRPF - 6%)</span>
            </button>
          </div>

          {/* Artigo Selection */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Enquadramento da Proposta</label>
              <select
                value={artigo}
                onChange={(e) => setArtigo(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
              >
                <option value="ARTIGO_18">Artigo 18 (100% de Abatimento no IR)</option>
                <option value="ARTIGO_26">Artigo 26 (30% a 80% Abatimento)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Modalidade do Aporte</label>
              <select
                value={tipoAporte}
                onChange={(e) => setTipoAporte(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
              >
                <option value="PATROCINIO">Patrocínio (com contrapartida de marca)</option>
                <option value="DOACAO">Doação (sem divulgação institucional)</option>
              </select>
            </div>
          </div>

          {/* Inputs */}
          <div className="space-y-3 pt-2 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                {sponsorType === "PJ_LUCRO_REAL"
                  ? "Imposto de Renda (IRPJ Devido Anual Estimado em R$):"
                  : "Imposto de Renda (IRPF Devido Anual Estimado em R$):"}
              </label>
              <input
                type="number"
                step="1000"
                value={irDevidoEstimado}
                onChange={(e) => setIrDevidoEstimado(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono text-sm"
              />
              <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                <span>Teto máximo dedutível ({tetoPercent}% do IR):</span>
                <strong className="text-emerald-400 font-mono">{formatCurrency(limiteMaximoDeducao)}</strong>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Valor Pretendido do Aporte Cultural (R$):
              </label>
              <input
                type="number"
                step="1000"
                value={valorAporte}
                onChange={(e) => setValorAporte(Number(e.target.value))}
                className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl p-2.5 text-emerald-400 font-bold font-mono text-sm"
              />
              <input
                type="range"
                min="1000"
                max={Math.max(limiteMaximoDeducao * 1.5, 100000)}
                step="1000"
                value={valorAporte}
                onChange={(e) => setValorAporte(Number(e.target.value))}
                className="w-full accent-emerald-500 mt-2"
              />
            </div>
          </div>
        </div>

        {/* Results & Commercial Pitch (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-slate-200">Demonstrativo Financeiro do Aporte</span>
              <span className="text-xs bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/20">
                Alíquota: {aliquotaAbatimento}%
              </span>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Valor do Patrocínio Realizado:</span>
                <span className="font-mono font-bold text-white text-sm">{formatCurrency(valorAporte)}</span>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Abatimento Direto no IRPJ/IRPF:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  - {formatCurrency(abatimentoDiretoIR)}
                </span>
              </div>

              {economiaDespesaOperacional > 0 && (
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Economia como Despesa Operacional (CSLL+IR):</span>
                  <span className="font-mono font-bold text-cyan-300 text-sm">
                    - {formatCurrency(economiaDespesaOperacional)}
                  </span>
                </div>
              )}

              {/* Big Highlight Card */}
              <div className="bg-gradient-to-br from-emerald-950/60 to-slate-950 border border-emerald-500/30 p-4 rounded-2xl text-center space-y-1">
                <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">
                  Custo Efetivo Líquido para o Patrocinador:
                </span>
                <div className="text-3xl font-extrabold font-mono text-white">
                  {formatCurrency(custoLiquidoEfetivo)}
                </div>
                <p className="text-xs text-emerald-400 font-medium">
                  {custoLiquidoEfetivo === 0
                    ? "CUSTO ZERO! 100% do patrocínio é compensado com o imposto de renda já devido."
                    : `Patrocínio altamente vantajoso: ${Math.round(
                        (economiaTributariaTotal / valorAporte) * 100
                      )}% financiado pelo incentivo fiscal.`}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1 text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Emissão de Recibo de Mecenato no SALIC
            </span>
            <span className="font-semibold text-slate-300">Lei nº 8.313/1991</span>
          </div>
        </div>
      </div>
    </div>
  );
};

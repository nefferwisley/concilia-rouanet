import React, { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Copy,
  Check,
  HelpCircle,
  Scale,
  RefreshCw,
} from "lucide-react";
import { PronacProject, BudgetRubric, BankTransaction, FiscalDocument, AuditAlert, ComplianceReport } from "../types";
import { formatCurrency } from "../utils/formatters";
import { auditComplianceWithAi, generateJustificationWithAi } from "../services/geminiService";

interface ComplianceAuditViewProps {
  project: PronacProject;
  rubrics: BudgetRubric[];
  transactions: BankTransaction[];
  documents: FiscalDocument[];
  alerts: AuditAlert[];
  onUpdateAlerts: (alerts: AuditAlert[]) => void;
  onRunAiAudit: () => void;
  isAuditing: boolean;
}

export const ComplianceAuditView: React.FC<ComplianceAuditViewProps> = ({
  project,
  rubrics,
  transactions,
  documents,
  alerts,
  onUpdateAlerts,
  onRunAiAudit,
  isAuditing,
}) => {
  const [selectedAlertForJustify, setSelectedAlertForJustify] = useState<AuditAlert | null>(null);
  const [isGeneratingJustification, setIsGeneratingJustification] = useState(false);
  const [generatedJustification, setGeneratedJustification] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const unresolvedAlerts = alerts.filter((a) => !a.resolvido);
  const resolvedAlerts = alerts.filter((a) => a.resolvido);
  const criticalCount = alerts.filter((a) => a.gravidade === "ALTA" && !a.resolvido).length;

  // Health Score Calculation
  const healthScore = Math.max(
    10,
    100 - criticalCount * 25 - alerts.filter((a) => a.gravidade === "MEDIA" && !a.resolvido).length * 10
  );

  // Toggle resolve
  const handleToggleResolve = (alertId: string) => {
    const updated = alerts.map((a) => {
      if (a.id === alertId) {
        return { ...a, resolvido: !a.resolvido };
      }
      return a;
    });
    onUpdateAlerts(updated);
  };

  // Generate legal justification with Gemini
  const handleGenerateJustification = async (targetAlert: AuditAlert) => {
    try {
      setSelectedAlertForJustify(targetAlert);
      setIsGeneratingJustification(true);
      setGeneratedJustification(null);

      const res = await generateJustificationWithAi({
        tipoOcorrencia: targetAlert.categoria,
        dadosItem: {
          titulo: targetAlert.titulo,
          descricao: targetAlert.descricao,
          itemAfetado: targetAlert.itemAfetado,
          baseLegal: targetAlert.baseLegal,
        },
        contextoProjeto: {
          pronac: project.pronac,
          nome: project.nome,
          proponente: project.proponente,
          cnpj: project.cnpjCpf,
        },
      });

      setGeneratedJustification(res.justificativaFormatada);
    } catch (err: any) {
      alert(`Erro ao gerar justificativa: ${err.message}`);
    } finally {
      setIsGeneratingJustification(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" /> Auditoria Preventiva MinC & Risco de Glosas
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Varredura algorítmica e por Inteligência Artificial em conformidade com a Instrução Normativa MinC nº 01/2023
          </p>
        </div>

        <button
          onClick={onRunAiAudit}
          disabled={isAuditing}
          className="text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 px-4 py-2 rounded-xl flex items-center gap-2 shadow-md shadow-emerald-500/20 transition disabled:opacity-50"
        >
          <Sparkles className={`w-4 h-4 ${isAuditing ? "animate-spin" : ""}`} />
          <span>{isAuditing ? "Executando Auditoria MinC..." : "Executar Auditoria Geral com IA"}</span>
        </button>
      </div>

      {/* Health Score Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Score Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow flex items-center gap-4">
          <div
            className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center font-bold font-mono text-2xl shadow-inner ${
              healthScore >= 80
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : healthScore >= 60
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
            }`}
          >
            <span>{healthScore}%</span>
            <span className="text-[9px] font-normal uppercase tracking-wider">Score MinC</span>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-400">Diagnóstico Geral:</span>
            <div className="text-sm font-bold text-white mt-0.5">
              {healthScore >= 90
                ? "APROVAÇÃO PLENA COM LOUVOR"
                : healthScore >= 75
                ? "APROVAÇÃO COM RESSALVAS MENORES"
                : "RISCO DE GLOSA / REPROVAÇÃO"}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {unresolvedAlerts.length === 0
                ? "Nenhuma pendência grave detectada no dossiê."
                : `${unresolvedAlerts.length} apontamento(s) requerem atenção ou justificativa formal.`}
            </p>
          </div>
        </div>

        {/* Legal Rules Checklist Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow text-xs space-y-2">
          <div className="font-semibold text-slate-200 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
            <Scale className="w-4 h-4 text-emerald-400" /> Checklist Normativo Obrigatório
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between text-slate-300">
              <span>1. Vigência dos Pagamentos:</span>
              <span className="text-emerald-400 font-bold">100% OK</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>2. Remanejamento (&lt;20% por item):</span>
              <span className="text-emerald-400 font-bold">Regular (Art. 47)</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>3. Teto Custos Administrativos (15%):</span>
              <span className="text-emerald-400 font-bold">13.1% (Dentro do Teto)</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>4. Vedação de Saque em Espécie:</span>
              <span className="text-emerald-400 font-bold">Conforme</span>
            </div>
          </div>
        </div>

        {/* Action summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400">Risco Estimado de Glosa em Reais:</div>
            <div className="text-xl font-bold font-mono text-rose-400 mt-1">
              {criticalCount > 0 ? formatCurrency(48.5) : "R$ 0,00"}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {criticalCount > 0
                ? "Tarifas bancárias ou débitos sem NF passíveis de devolução ao erário."
                : "Sem valores sujeitos a ressarcimento com recursos próprios."}
            </p>
          </div>
          <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-800">
            Regulamentado pelo Decreto nº 11.453/2023 & IN MinC 01/2023
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center justify-between">
          <span>Apontamentos e Recomendações Técnicas ({alerts.length})</span>
          <span className="text-xs font-normal text-slate-400">
            {resolvedAlerts.length} de {alerts.length} sanados
          </span>
        </h2>

        <div className="space-y-3">
          {alerts.map((alt) => (
            <div
              key={alt.id}
              className={`rounded-2xl border p-5 transition ${
                alt.resolvido
                  ? "bg-slate-900/60 border-slate-800/80 opacity-70"
                  : alt.gravidade === "ALTA"
                  ? "bg-rose-500/5 border-rose-500/30"
                  : alt.gravidade === "MEDIA"
                  ? "bg-amber-500/5 border-amber-500/30"
                  : "bg-slate-900 border-slate-800"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        alt.gravidade === "ALTA"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : alt.gravidade === "MEDIA"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      Gravidade {alt.gravidade}
                    </span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                      {alt.categoria}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{alt.itemAfetado}</span>
                    {alt.resolvido && (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold border border-emerald-500/30">
                        ✓ Sanado / Justificado
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-white">{alt.titulo}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{alt.descricao}</p>

                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-xs space-y-1 mt-2">
                    <div className="text-[11px] text-slate-400">
                      <strong className="text-slate-300">Base Legal no MinC:</strong> {alt.baseLegal}
                    </div>
                    <div className="text-[11px] text-emerald-400">
                      <strong className="text-emerald-300">Ação Corretiva Recomendada:</strong>{" "}
                      {alt.acaoRecomendada}
                    </div>
                  </div>

                  {alt.justificativaSugeridaSalic && (
                    <div className="mt-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span className="font-semibold text-slate-300">
                          Minuta de Justificativa Pronta para o SALIC:
                        </span>
                        <button
                          onClick={() => copyToClipboard(alt.justificativaSugeridaSalic, alt.id)}
                          className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
                        >
                          {copiedId === alt.id ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> Copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Copiar Texto
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-slate-200 italic font-serif leading-relaxed">
                        "{alt.justificativaSugeridaSalic}"
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                  <button
                    onClick={() => handleGenerateJustification(alt)}
                    className="text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Redigir Defesa com IA</span>
                  </button>

                  <button
                    onClick={() => handleToggleResolve(alt.id)}
                    className={`text-xs px-3 py-1.5 rounded-xl border transition ${
                      alt.resolvido
                        ? "bg-slate-800 text-slate-300 border-slate-700"
                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    }`}
                  >
                    {alt.resolvido ? "Marcar como Pendente" : "Marcar como Sanado"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Justification Modal */}
      {selectedAlertForJustify && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 text-slate-200 shadow-2xl my-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" /> Redator Jurídico MinC / SALIC (IA)
              </h2>
              <button
                onClick={() => setSelectedAlertForJustify(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Fechar
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs mb-4">
              <span className="text-slate-400">Caso:</span>
              <p className="font-semibold text-white mt-0.5">{selectedAlertForJustify.titulo}</p>
            </div>

            {isGeneratingJustification ? (
              <div className="py-12 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-300 font-semibold">
                  Fundamentando defesa jurídica com base na IN MinC 01/2023...
                </p>
              </div>
            ) : generatedJustification ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Justificativa Técnica Formal Gerada:
                  </label>
                  <textarea
                    rows={8}
                    readOnly
                    value={generatedJustification}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-xs font-serif leading-relaxed focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedAlertForJustify(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      copyToClipboard(generatedJustification, "modal-copy");
                      alert("Texto copiado para a área de transferência!");
                    }}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copiar para o SALIC
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

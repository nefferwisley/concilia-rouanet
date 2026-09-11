import React, { useState } from "react";
import {
  Coins,
  Plus,
  AlertCircle,
  CheckCircle2,
  Filter,
  Search,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import { BudgetRubric, BudgetStageName, PronacProject } from "../types";
import { formatCurrency } from "../utils/formatters";

interface BudgetPlanViewProps {
  rubrics: BudgetRubric[];
  project: PronacProject;
  onAddRubric: (rubric: BudgetRubric) => void;
  onUpdateRubric: (rubric: BudgetRubric) => void;
}

const STAGES: BudgetStageName[] = [
  "Pré-Produção / Preparação",
  "Produção / Execução",
  "Divulgação / Comercialização",
  "Custos Administrativos",
  "Impostos e Recolhimentos",
];

export const BudgetPlanView: React.FC<BudgetPlanViewProps> = ({
  rubrics = [],
  project,
  onAddRubric,
  onUpdateRubric,
}) => {
  const safeRubrics = Array.isArray(rubrics) ? rubrics : [];
  const [selectedStage, setSelectedStage] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRubric, setEditingRubric] = useState<BudgetRubric | null>(null);

  // Helper canônico de normalização de rubrica
  const getItemApproved = (r: BudgetRubric): number =>
    Number(r?.valorTotalAprovado ?? r?.valorAprovado ?? 0);

  const getItemExecuted = (r: BudgetRubric): number =>
    Number(r?.valorExecutado ?? 0);

  const getItemName = (r: BudgetRubric): string =>
    r?.nomeRubrica || r?.nome || r?.descricaoDetalhada || "Rubrica Orçamentária";

  const getItemNumber = (r: BudgetRubric): string =>
    r?.itemNumero || r?.id?.replace("rub-1961-", "").replace(/-/g, ".") || "1.0";

  const getItemLimit20 = (r: BudgetRubric): number =>
    Number(r?.limiteRemanejamento20pct ?? r?.limiteRemanejamento20 ?? getItemApproved(r) * 1.2);

  // Identificar se a lista contém itens pai e filhos (para não duplicar na soma geral)
  const isLeafRubric = (r: BudgetRubric, all: BudgetRubric[]): boolean => {
    const num = getItemNumber(r);
    return !all.some((other) => other !== r && getItemNumber(other).startsWith(`${num}.`));
  };

  // Coleta todas as etapas dinâmicas presentes nas rubricas
  const dynamicStages = Array.from(
    new Set(safeRubrics.map((r) => r?.etapa).filter((et): et is string => Boolean(et)))
  );

  const filteredRubrics = safeRubrics.filter((r) => {
    if (!r) return false;
    const matchesStage = selectedStage === "ALL" || r.etapa === selectedStage;
    const q = (searchQuery || "").toLowerCase();
    const matchesSearch =
      getItemName(r).toLowerCase().includes(q) ||
      getItemNumber(r).toLowerCase().includes(q) ||
      (r.meta || "").toLowerCase().includes(q) ||
      (r.id || "").toLowerCase().includes(q);
    return matchesStage && matchesSearch;
  });

  // Cáculo de totais. Em vez de somar dinamicamente os valores de schema de rubrica (que contêm sujeiras do mock),
  // assumimos estritamente o valor aprovado do próprio projeto, caindo pro valor de auditoria do proj. 1961 (835k) em fallback.
  // Isso impede que a plataforma apresente informações falsas sobre o teto do projeto.
  const leafRubrics = safeRubrics.filter((r) => isLeafRubric(r, safeRubrics));
  const calcAprovado = (leafRubrics.length > 0 ? leafRubrics : safeRubrics).reduce(
    (acc, r) => acc + getItemApproved(r),
    0
  );
  const calcExecutado = (leafRubrics.length > 0 ? leafRubrics : safeRubrics).reduce(
    (acc, r) => acc + getItemExecuted(r),
    0
  );

  // Valor do projeto em primeiríssimo lugar (evita totalizadores errados de schema)
  const totalAprovado = Number(project?.valorAprovado) || 0;
  const totalExecutado = Number(project?.valorExecutado) || 0;
  const saldoGeral = totalAprovado - totalExecutado;

  // Form state
  const [formData, setFormData] = useState<Partial<BudgetRubric>>({
    etapa: "Produção / Execução",
    meta: "Meta 1 - Execução do Projeto",
    itemNumero: "2.1",
    nome: "",
    unidade: "Serviço",
    quantidade: 1,
    valorUnitario: 0,
    descricaoDetalhada: "",
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(formData.quantidade || 1);
    const unitVal = Number(formData.valorUnitario || 0);
    const vlrAprovado = qty * unitVal;

    if (editingRubric) {
      onUpdateRubric({
        ...editingRubric,
        etapa: (formData.etapa as BudgetStageName) || editingRubric.etapa,
        meta: formData.meta || editingRubric.meta,
        itemNumero: formData.itemNumero || editingRubric.itemNumero,
        nome: formData.nome || editingRubric.nome,
        unidade: (formData.unidade as any) || editingRubric.unidade,
        quantidade: qty,
        valorUnitario: unitVal,
        valorAprovado: vlrAprovado,
        limiteRemanejamento20: vlrAprovado * 1.2,
        descricaoDetalhada: formData.descricaoDetalhada || editingRubric.descricaoDetalhada,
      });
      setEditingRubric(null);
    } else {
      const newRubric: BudgetRubric = {
        id: `rub-${Date.now()}`,
        etapa: (formData.etapa as BudgetStageName) || "Produção / Execução",
        meta: formData.meta || "Meta 1",
        itemNumero: formData.itemNumero || `${rubrics.length + 1}.1`,
        nome: formData.nome || "Novo Item",
        unidade: (formData.unidade as any) || "Serviço",
        quantidade: qty,
        valorUnitario: unitVal,
        valorAprovado: vlrAprovado,
        valorExecutado: 0,
        limiteRemanejamento20: vlrAprovado * 1.2,
        descricaoDetalhada: formData.descricaoDetalhada || "",
      };
      onAddRubric(newRubric);
      setIsAddModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Coins className="w-5 h-5 text-emerald-400" /> Plano de Trabalho & Rubricas Orçamentárias
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Orçamento oficial aprovado no SALIC/MinC com monitoramento da Regra dos 20% de Remanejamento
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({
              etapa: "Produção / Execução",
              meta: "Meta 1 - Execução do Projeto",
              itemNumero: `${rubrics.length + 1}.1`,
              nome: "",
              unidade: "Serviço",
              quantidade: 1,
              valorUnitario: 0,
              descricaoDetalhada: "",
            });
            setIsAddModalOpen(true);
          }}
          className="text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar Rubrica</span>
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium">Orçamento Total Aprovado (SALIC)</span>
          <div className="text-xl font-bold font-mono text-white mt-1">{formatCurrency(totalAprovado)}</div>
          <span className="text-xs text-slate-500">{rubrics.length} itens orçamentários</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium">Total Realizado / Executado</span>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{formatCurrency(totalExecutado)}</div>
          <span className="text-xs text-emerald-500">
            {totalAprovado > 0 ? ((totalExecutado / totalAprovado) * 100).toFixed(1) : 0}% executado
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium">Saldo Disponível no Orçamento</span>
          <div className="text-xl font-bold font-mono text-cyan-300 mt-1">{formatCurrency(saldoGeral)}</div>
          <span className="text-xs text-cyan-400">Verba orçamentária remanescente</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          <button
            onClick={() => setSelectedStage("ALL")}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
              selectedStage === "ALL"
                ? "bg-emerald-500 text-slate-950 font-bold"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            Todas as Etapas
          </button>
          {(dynamicStages.length > 0 ? dynamicStages : STAGES).map((stg) => (
            <button
              key={stg}
              onClick={() => setSelectedStage(stg)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                selectedStage === stg
                  ? "bg-emerald-500 text-slate-950 font-bold"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {stg.split(" / ")[0]}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar rubrica ou item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Rubrics Desktop Table (>= md) */}
      <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-xs tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Item</th>
                <th className="px-4 py-3.5">Descrição da Rubrica / Meta</th>
                <th className="px-4 py-3.5">Etapa MinC</th>
                <th className="px-4 py-3.5 text-right">Qtd / Unid</th>
                <th className="px-4 py-3.5 text-right">Vlr Unit</th>
                <th className="px-4 py-3.5 text-right">Aprovado SALIC</th>
                <th className="px-4 py-3.5 text-right">Executado</th>
                <th className="px-4 py-3.5 text-right">Saldo</th>
                <th className="px-4 py-3.5 text-center">Status 20%</th>
                <th className="px-4 py-3.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredRubrics.map((r) => {
                const vlrAprov = getItemApproved(r);
                const vlrExec = getItemExecuted(r);
                const limite20 = getItemLimit20(r);
                const saldo = vlrAprov - vlrExec;
                const exceeded20 = vlrAprov > 0 && vlrExec > limite20;
                const reallocatedLegal = vlrAprov > 0 && vlrExec > vlrAprov && !exceeded20;
                const execPct = vlrAprov > 0 ? Math.min(Math.round((vlrExec / vlrAprov) * 100), 120) : 0;

                return (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-200">{getItemNumber(r)}</td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="font-semibold text-white">{getItemName(r)}</div>
                      <div className="text-xs text-slate-400 line-clamp-1">{r.meta || r.descricaoDetalhada}</div>
                      {vlrAprov > 0 && (
                        <div className="mt-1.5 w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${exceeded20 ? "bg-rose-500" : execPct > 80 ? "bg-amber-400" : "bg-emerald-500"}`}
                            style={{ width: `${Math.min(execPct, 100)}%` }}
                            title={`${execPct}% executado`}
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                        {r.etapa}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {r.quantidade || r.quantidadeAprovada || 1} {r.unidade || r.unidadeMedida || "Serviço"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-300">
                      {formatCurrency(r.valorUnitario || r.valorUnitarioAprovado || vlrAprov)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-100">
                      {formatCurrency(vlrAprov)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-400">
                      {formatCurrency(vlrExec)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono font-semibold ${
                        saldo < 0 ? "text-amber-400" : "text-slate-300"
                      }`}
                    >
                      {formatCurrency(saldo)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {exceeded20 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded">
                          <AlertTriangle className="w-3 h-3 text-rose-400" /> &gt;20% Glosa
                        </span>
                      ) : reallocatedLegal ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
                          <Info className="w-3 h-3 text-amber-400" /> Remanejado &lt;20%
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Regular
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          setEditingRubric(r);
                          setFormData({
                            etapa: r.etapa,
                            meta: r.meta,
                            itemNumero: r.itemNumero,
                            nome: r.nome,
                            unidade: r.unidade,
                            quantidade: r.quantidade,
                            valorUnitario: r.valorUnitario,
                            descricaoDetalhada: r.descricaoDetalhada,
                          });
                        }}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded transition"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rubrics Mobile Cards (< md) */}
      <div className="block md:hidden space-y-3">
        {filteredRubrics.length === 0 ? (
          <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs">
            Nenhuma rubrica encontrada para os filtros selecionados.
          </div>
        ) : (
          filteredRubrics.map((r, idx) => {
            const vlrAprov = getItemApproved(r);
            const vlrExec = getItemExecuted(r);
            const limite20 = getItemLimit20(r);
            const saldo = vlrAprov - vlrExec;
            const exceeded20 = vlrAprov > 0 && vlrExec > limite20;
            const reallocatedLegal = vlrAprov > 0 && vlrExec > vlrAprov && !exceeded20;
            const execPct = vlrAprov > 0 ? Math.min(Math.round((vlrExec / vlrAprov) * 100), 120) : 0;

            return (
              <div
                key={r.id}
                className={`bg-slate-900 border rounded-2xl p-4 shadow-md ${
                  exceeded20
                    ? "border-rose-500/40 bg-rose-950/10"
                    : reallocatedLegal
                    ? "border-amber-500/30"
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                {/* Linha 1: Item nº + Badge status */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400 bg-slate-800 px-2 py-1 rounded">
                      #{String(idx + 1).padStart(3, "0")}
                    </span>
                    <span className="font-mono text-xs font-bold text-emerald-400">{getItemNumber(r)}</span>
                  </div>
                  {exceeded20 ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded">
                      <AlertTriangle className="w-3 h-3" /> Glosa &gt;20%
                    </span>
                  ) : reallocatedLegal ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
                      <Info className="w-3 h-3" /> Remanejado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                      <CheckCircle2 className="w-3 h-3" /> Regular
                    </span>
                  )}
                </div>

                {/* Nome e meta */}
                <h4 className="text-sm font-bold text-white mb-0.5 line-clamp-2">{getItemName(r)}</h4>
                {(r.meta || r.descricaoDetalhada) && (
                  <p className="text-xs text-slate-400 line-clamp-1 mb-2">{r.meta || r.descricaoDetalhada}</p>
                )}

                {/* Etapa */}
                <div className="mb-2">
                  <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                    {r.etapa}
                  </span>
                </div>

                {/* Valores */}
                <div className="grid grid-cols-3 gap-2 text-xs py-2 border-t border-slate-800/80 mb-2">
                  <div>
                    <span className="text-slate-400 block">Aprovado</span>
                    <span className="font-mono font-semibold text-slate-100">{formatCurrency(vlrAprov)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Executado</span>
                    <span className="font-mono font-semibold text-emerald-400">{formatCurrency(vlrExec)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Saldo</span>
                    <span className={`font-mono font-semibold ${saldo < 0 ? "text-amber-400" : "text-slate-300"}`}>
                      {formatCurrency(saldo)}
                    </span>
                  </div>
                </div>

                {/* Barra de progresso */}
                {vlrAprov > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Execução orçamentária</span>
                      <span className="font-mono font-semibold text-slate-200">{execPct}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${exceeded20 ? "bg-rose-500" : execPct > 80 ? "bg-amber-400" : "bg-emerald-500"}`}
                        style={{ width: `${Math.min(execPct, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Ação */}
                <div className="pt-1 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRubric(r);
                      setFormData({
                        etapa: r.etapa,
                        meta: r.meta,
                        itemNumero: r.itemNumero,
                        nome: r.nome,
                        unidade: r.unidade,
                        quantidade: r.quantidade,
                        valorUnitario: r.valorUnitario,
                        descricaoDetalhada: r.descricaoDetalhada,
                      });
                    }}
                    className="w-full min-h-[44px] text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                    Editar Rubrica
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Modal */}
      {(isAddModalOpen || editingRubric) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-slate-200 shadow-2xl">
            <h2 className="text-base font-bold text-white mb-4">
              {editingRubric ? `Editar Rubrica: ${editingRubric.itemNumero}` : "Adicionar Nova Rubrica ao SALIC"}
            </h2>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Etapa MinC</label>
                  <select
                    value={formData.etapa}
                    onChange={(e) => setFormData({ ...formData, etapa: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Nº do Item (ex: 2.1)</label>
                  <input
                    type="text"
                    required
                    value={formData.itemNumero}
                    onChange={(e) => setFormData({ ...formData, itemNumero: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Nome da Rubrica / Serviço</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Locação de Rider de Som e Luz"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Meta Vinculada no Plano</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Meta 2 - Realização dos Concertos"
                  value={formData.meta}
                  onChange={(e) => setFormData({ ...formData, meta: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Unidade</label>
                  <select
                    value={formData.unidade}
                    onChange={(e) => setFormData({ ...formData, unidade: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="Serviço">Serviço</option>
                    <option value="Cachê">Cachê</option>
                    <option value="Mês">Mês</option>
                    <option value="Diária">Diária</option>
                    <option value="Verba">Verba</option>
                    <option value="Unidade">Unidade</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Quantidade</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.quantidade}
                    onChange={(e) => setFormData({ ...formData, quantidade: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Valor Unitário (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.valorUnitario}
                    onChange={(e) => setFormData({ ...formData, valorUnitario: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Justificativa / Descrição Técnica Detalhada</label>
                <textarea
                  rows={3}
                  placeholder="Descreva a finalidade desta contratação conforme o projeto aprovado no SALIC..."
                  value={formData.descricaoDetalhada}
                  onChange={(e) => setFormData({ ...formData, descricaoDetalhada: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingRubric(null);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl"
                >
                  Salvar no Plano
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

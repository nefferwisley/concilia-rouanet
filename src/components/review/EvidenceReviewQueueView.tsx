import React, { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Eye,
  ExternalLink,
  History,
  Sparkles,
  Search,
  Scale,
} from "lucide-react";
import type {
  EvidenceReviewQueueProps,
  ReviewQueueItem,
} from "../../contracts/evidenceReview";
import { formatCurrency, formatDate } from "../../utils/formatters";

export const EvidenceReviewQueueView: React.FC<EvidenceReviewQueueProps> = ({
  items,
  auditEvents = [],
  onApprove,
  onReject,
  onReplace,
  isLoading = false,
}) => {
  const [search, setSearch] = useState("");
  const [rejectingItem, setRejectingItem] = useState<ReviewQueueItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [activeTab, setActiveTab] = useState<"QUEUE" | "AUDIT">("QUEUE");

  const pendingItems = items.filter((i) => i.status_revisao === "PENDENTE");
  const filteredItems = pendingItems.filter(
    (i) =>
      search === "" ||
      i.fornecedor.toLowerCase().includes(search.toLowerCase()) ||
      (i.documento_nome && i.documento_nome.toLowerCase().includes(search.toLowerCase()))
  );

  const handleConfirmReject = () => {
    if (!rejectingItem || !rejectReason.trim()) return;
    onReject(rejectingItem, rejectReason.trim());
    setRejectingItem(null);
    setRejectReason("");
  };

  return (
    <div className="space-y-6" role="region" aria-label="Fila de Revisão Humana de Evidências">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              Fila de Revisão Documental & Evidências
            </h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {pendingItems.length} vínculo(s) aguardando validação humana para conciliação 1:1
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 self-start md:self-auto">
          <button
            onClick={() => setActiveTab("QUEUE")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === "QUEUE"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Fila Pendente ({pendingItems.length})
          </button>
          <button
            onClick={() => setActiveTab("AUDIT")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === "AUDIT"
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" /> Trilha de Auditoria ({auditEvents.length})
            </span>
          </button>
        </div>
      </div>

      {activeTab === "QUEUE" ? (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por favorecido ou documento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {filteredItems.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-12 text-center">
              <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-80" />
              <h3 className="text-base font-semibold text-white">Nenhuma pendência de revisão</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Todos os documentos do projeto foram validados ou conciliados automaticamente com alta confiança.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredItems.map((item, idx) => {
                const confiancaPct = item.confianca_ocr ? Math.round(item.confianca_ocr * 100) : 0;
                return (
                  <div
                    key={item.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 shadow-sm transition"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                      {/* Left: Bank transaction details */}
                      <div className="lg:col-span-5 space-y-2 border-b lg:border-b-0 lg:border-r border-slate-800 pb-4 lg:pb-0 lg:pr-6">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-slate-500 font-semibold">
                            #{String(idx + 1).padStart(3, "0")}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300">
                            Débito Extrato BB
                          </span>
                        </div>
                        <div className="text-base font-bold text-white tracking-tight">
                          {item.fornecedor}
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <div>
                            <span className="text-slate-500">Data: </span>
                            <span className="font-mono text-slate-300">{formatDate(item.data_pagamento)}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Valor Pago: </span>
                            <span className="font-mono font-bold text-emerald-400">
                              {formatCurrency(item.valor_bruto)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Center: OCR Evidence Details */}
                      <div className="lg:col-span-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-blue-400" /> Documento Sugerido
                          </span>
                          <span
                            className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                              confiancaPct >= 85
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            <Sparkles className="w-3 h-3 inline mr-1" /> {confiancaPct}% Confiança
                          </span>
                        </div>
                        <div className="text-xs font-medium text-slate-200 truncate max-w-xs">
                          {item.documento_nome || "Documento anexado no lote"}
                        </div>
                        {item.motivos && item.motivos.length > 0 && (
                          <div className="text-[11px] text-amber-400/90 flex items-start gap-1">
                            <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                            <span>{item.motivos.join("; ")}</span>
                          </div>
                        )}
                        {item.signed_url && (
                          <a
                            href={item.signed_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition"
                          >
                            <Eye className="w-3 h-3" /> Ver Comprovante Original <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>

                      {/* Right: Auditor Actions */}
                      <div className="lg:col-span-3 flex lg:flex-col items-center lg:items-end justify-end gap-2 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                        <button
                          onClick={() => onApprove(item)}
                          disabled={isLoading}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar Vínculo
                        </button>
                        <button
                          onClick={() => setRejectingItem(item)}
                          disabled={isLoading}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-rose-900/30 text-rose-300 border border-slate-700 hover:border-rose-500/40 transition disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Rejeitar...
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Audit Trail Tab */
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 font-semibold text-sm text-slate-200 flex items-center gap-2">
            <History className="w-4 h-4 text-blue-400" /> Trilha Imutável de Decisões & Auditoria
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-4">Ação</th>
                  <th className="py-3 px-4">Entidade</th>
                  <th className="py-3 px-4">Justificativa / Motivo</th>
                  <th className="py-3 px-4">Auditor ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {auditEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      Nenhum evento de auditoria registrado até o momento.
                    </td>
                  </tr>
                ) : (
                  auditEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                        {new Date(event.created_at).toLocaleString("pt-BR")}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {event.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {event.entity_type}: {event.entity_id.slice(0, 8)}...
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {event.reason || "—"}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {event.actor_id ? event.actor_id.slice(0, 8) : "Sistema"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">Rejeitar Vínculo de Comprovante</h3>
            </div>
            <p className="text-xs text-slate-400">
              Informe a justificativa regulatória para rejeitar a vinculação deste documento com o lançamento de{" "}
              <strong className="text-slate-200">{rejectingItem.fornecedor}</strong> ({formatCurrency(rejectingItem.valor_bruto)}).
            </p>
            <textarea
              rows={3}
              placeholder="Ex: Nota fiscal não corresponde ao serviço contratado / CNPJ divergente..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setRejectingItem(null);
                  setRejectReason("");
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition disabled:opacity-50 shadow-md shadow-rose-900/30"
              >
                Confirmar Rejeição
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

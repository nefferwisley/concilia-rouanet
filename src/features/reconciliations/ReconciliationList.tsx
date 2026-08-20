import React, { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Clock, XCircle, Search, Filter } from "lucide-react";
import type { ReconciliationItem, ReconciliationListResponse } from "./reconciliationTypes";
import { fetchReconciliations } from "./reconciliationApi";

export interface ReconciliationListProps {
  projectId: string;
  accessToken: string;
  selectedId?: string | null;
  onSelect: (item: ReconciliationItem) => void;
  api?: {
    fetchList: (
      projectId: string,
      accessToken: string,
      options?: any,
    ) => Promise<ReconciliationListResponse>;
  };
}

export const ReconciliationList: React.FC<ReconciliationListProps> = ({
  projectId,
  accessToken,
  selectedId,
  onSelect,
  api = { fetchList: fetchReconciliations },
}) => {
  const [items, setItems] = useState<ReconciliationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    api
      .fetchList(projectId, accessToken, { search, status: statusFilter })
      .then((res) => {
        if (isMounted) {
          setItems(res.items);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [projectId, accessToken, search, statusFilter, api]);

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Aprovado
          </span>
        );
      case "HUMAN_CONFIRMATION_REQUIRED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" /> Revisão Humana
          </span>
        );
      case "DIVERGENT":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-500/10 text-red-400 border border-red-500/20">
            <XCircle className="w-3 h-3" /> Divergente
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <Clock className="w-3 h-3" /> Pendente
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50 border border-white/10 rounded-xl overflow-hidden">
      {/* Barra de Filtros */}
      <div className="p-3 border-b border-white/10 flex items-center gap-2 bg-slate-900/80">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por fornecedor ou documento..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-white/10 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-500/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-800 border border-white/10 rounded-lg text-sm text-slate-300 px-3 py-1.5 focus:outline-none"
        >
          <option value="">Todos os status</option>
          <option value="HUMAN_CONFIRMATION_REQUIRED">Revisão Humana</option>
          <option value="APPROVED">Aprovados</option>
          <option value="DIVERGENT">Divergentes</option>
          <option value="PENDING">Pendentes</option>
        </select>
      </div>

      {/* Lista de Itens */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/5">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Carregando conciliações...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            Nenhum lançamento encontrado para os filtros selecionados.
          </div>
        ) : (
          items.map((item) => {
            const isSelected = selectedId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item)}
                className={`w-full text-left p-3.5 transition-colors flex items-center justify-between hover:bg-slate-800/50 ${
                  isSelected ? "bg-amber-500/10 border-l-2 border-amber-500" : ""
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-sm">
                      {item.fornecedorDeclarado || "Fornecedor não identificado"}
                    </span>
                    {item.documentoDeclarado && (
                      <span className="text-xs text-slate-400 font-mono">
                        ({item.documentoDeclarado})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>{item.dataDeclarada || "Data pendente"}</span>
                    {item.rubricaDeclarada && <span>• {item.rubricaDeclarada}</span>}
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <div className="font-mono font-medium text-white text-sm">
                    {item.valorDeclarado != null
                      ? `R$ ${item.valorDeclarado.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}`
                      : "—"}
                  </div>
                  <div>{renderStatusBadge(item.status)}</div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

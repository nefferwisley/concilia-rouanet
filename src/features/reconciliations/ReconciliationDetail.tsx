import React, { useEffect, useState } from "react";
import {
  FileSpreadsheet,
  Landmark,
  FileText,
  CreditCard,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import type { ReconciliationDetailItem } from "./reconciliationTypes";
import { fetchReconciliationDetail, getDocumentSignedUrl } from "./reconciliationApi";

export interface ReconciliationDetailProps {
  reconciliationId: string;
  accessToken: string;
  api?: {
    fetchDetail: (id: string, token: string) => Promise<ReconciliationDetailItem>;
    getSignedUrl?: (docId: string, token: string) => Promise<string>;
  };
}

export const ReconciliationDetail: React.FC<ReconciliationDetailProps> = ({
  reconciliationId,
  accessToken,
  api = { fetchDetail: fetchReconciliationDetail, getSignedUrl: getDocumentSignedUrl },
}) => {
  const [detail, setDetail] = useState<ReconciliationDetailItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    api
      .fetchDetail(reconciliationId, accessToken)
      .then((res) => {
        if (isMounted) {
          setDetail(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [reconciliationId, accessToken, api]);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm bg-slate-900/50 border border-white/10 rounded-xl">
        Carregando detalhes do lançamento...
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm bg-slate-900/50 border border-white/10 rounded-xl">
        Selecione um lançamento para visualizar as evidências.
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-5 space-y-6">
      {/* Cabeçalho do Lançamento */}
      <div className="flex items-start justify-between border-b border-white/10 pb-4">
        <div>
          <span className="text-xs font-mono text-slate-400">ID: {detail.id}</span>
          <h2 className="text-xl font-bold text-white mt-1">
            {detail.fornecedorDeclarado || "Lançamento Sem Fornecedor"}
          </h2>
          <p className="text-sm text-slate-400">
            Rubrica: <span className="text-slate-200">{detail.rubricaDeclarada || "Pendente"}</span>
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400">Valor Declarado</span>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {detail.valorDeclarado != null
              ? `R$ ${detail.valorDeclarado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
              : "—"}
          </div>
        </div>
      </div>

      {/* Grid das 4 Pernas de Evidência */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Planilha-Base */}
        <div className="border border-white/10 rounded-lg p-4 bg-slate-800/40 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Planilha-Base</span>
          </div>
          <div className="text-xs text-slate-300 space-y-1">
            <div>Data: {detail.dataDeclarada || "Não informada"}</div>
            <div>Doc: {detail.documentoDeclarado || "Não informado"}</div>
            <div className="text-emerald-400 font-medium">Origem: Importação da Planilha Declarada</div>
          </div>
        </div>

        {/* 2. Extrato Bancário */}
        <div className="border border-white/10 rounded-lg p-4 bg-slate-800/40 space-y-2">
          <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm">
            <Landmark className="w-4 h-4" />
            <span>Extrato Bancário</span>
          </div>
          <div className="text-xs text-slate-300 space-y-1">
            {detail.links.some((l) => l.evidenceType === "BANK_MOVEMENT") ? (
              <div className="text-emerald-400 font-medium">Movimentação identificada no extrato</div>
            ) : (
              <div className="text-slate-500 italic">Nenhuma movimentação bancária vinculada</div>
            )}
          </div>
        </div>

        {/* 3. Documento Fiscal */}
        <div className="border border-white/10 rounded-lg p-4 bg-slate-800/40 space-y-2">
          <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
            <FileText className="w-4 h-4" />
            <span>Documento Fiscal</span>
          </div>
          <div className="text-xs text-slate-300 space-y-1">
            {detail.links.some((l) => l.evidenceType === "FISCAL_DOCUMENT") ? (
              <div className="text-emerald-400 font-medium">Nota Fiscal / RPA localizada</div>
            ) : (
              <div className="text-slate-500 italic">Documento fiscal pendente</div>
            )}
          </div>
        </div>

        {/* 4. Comprovante de Pagamento */}
        <div className="border border-white/10 rounded-lg p-4 bg-slate-800/40 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <CreditCard className="w-4 h-4" />
            <span>Comprovante de Pagamento</span>
          </div>
          <div className="text-xs text-slate-300 space-y-1">
            {detail.links.some((l) => l.evidenceType === "PAYMENT_PROOF") ? (
              <div className="text-emerald-400 font-medium">Comprovante de transferência anexado</div>
            ) : (
              <div className="text-slate-500 italic">Comprovante bancário pendente</div>
            )}
          </div>
        </div>
      </div>

      {/* Seção de Apontamentos / Issues */}
      {detail.issues && detail.issues.length > 0 && (
        <div className="border border-amber-500/20 bg-amber-500/10 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
            <ShieldAlert className="w-4 h-4" />
            <span>Apontamentos Regulatórios ({detail.issues.length})</span>
          </div>
          <div className="space-y-1">
            {detail.issues.map((issue) => (
              <div key={issue.id} className="text-xs text-amber-200 flex items-start gap-2">
                <span className="font-mono font-bold">[{issue.issueCode}]</span>
                <span>{issue.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Link,
  Unlink,
  FileCheck2,
  FileX,
  AlertTriangle,
  Building,
  Calendar,
  Sparkles,
  CheckCircle2,
  Clock,
  Eye,
} from "lucide-react";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { resolveProviderAndCompany } from "../../utils/providerHelper";
import { StatusBadge } from "./StatusBadge";
import { AttachmentThumbnail } from "../AttachmentThumbnail";
import type { BankTransaction, FiscalDocument, BudgetRubric } from "../../types";

interface TransactionMobileCardProps {
  transaction: BankTransaction;
  index: number;
  matchedDoc?: FiscalDocument;
  matchedRubric?: BudgetRubric;
  projectId: string;
  isReconciled: boolean;
  onOpenLinkModal?: (tx: BankTransaction) => void;
  onUnlink?: (tx: BankTransaction) => void;
  onOpenPreview?: (doc: FiscalDocument, tx: BankTransaction) => void;
}

export const TransactionMobileCard: React.FC<TransactionMobileCardProps> = ({
  transaction,
  index,
  matchedDoc,
  matchedRubric,
  projectId,
  isReconciled,
  onOpenLinkModal,
  onUnlink,
  onOpenPreview,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const isDebit =
    transaction.tipo === "DEBITO" ||
    transaction.tipo === "TARIFA" ||
    !transaction.tipo ||
    (transaction as any).tipoMovimento === "DEBIT";

  const resolved = resolveProviderAndCompany(
    transaction.favorecido || transaction.descricaoExtrato || "",
    transaction.cnpjCpfFavorecido || ""
  );

  const hasFiscalDoc = Boolean(matchedDoc || transaction.matchedDocId || transaction.idDocumentoFiscalVinculado);
  const hasBankProof = Boolean(transaction.documentoNumero || transaction.documentoBancario);
  const isGlosa = transaction.status === "ALERTA_GLOSA" || Boolean(transaction.alertaRisco);

  return (
    <div
      className={`bg-slate-900 border rounded-2xl p-4 transition shadow-md ${
        isGlosa
          ? "border-rose-500/40 bg-rose-950/10"
          : isReconciled
          ? "border-emerald-500/30 bg-slate-900/90"
          : "border-slate-800 hover:border-slate-700"
      }`}
    >
      {/* Top row: Sequence number, Status Badge and Value */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
            #{String(index + 1).padStart(3, "0")}
          </span>
          <StatusBadge status={transaction} size="sm" />
        </div>

        <div className="text-right">
          <span
            className={`font-mono text-base font-bold tracking-tight ${
              isDebit ? "text-amber-300" : "text-emerald-400"
            }`}
          >
            {isDebit ? "-" : "+"}
            {formatCurrency(transaction.valor)}
          </span>
        </div>
      </div>

      {/* Middle row: Favorecido (PF + PJ) & Data */}
      <div className="space-y-1 mb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-white line-clamp-1">
              {resolved.personName || resolved.companyName || "Favorecido não identificado"}
            </h4>
            {resolved.companyName && resolved.companyName !== resolved.personName && (
              <p className="text-xs text-slate-400 line-clamp-1">{resolved.companyName}</p>
            )}
            {resolved.cnpjCpf && (
              <span className="text-[11px] font-mono text-emerald-400">
                {resolved.cnpjCpf}
              </span>
            )}
          </div>

          <span className="text-xs text-slate-400 shrink-0 font-medium flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-500" />
            {formatDate(transaction.data || transaction.dataTransacao)}
          </span>
        </div>
      </div>

      {/* Proof indicators row (NF badge, Comprovante BB badge) */}
      <div className="flex flex-wrap items-center gap-1.5 py-2 border-t border-slate-800/80 text-[11px]">
        {hasFiscalDoc ? (
          <span className="inline-flex items-center gap-1 text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium">
            <FileCheck2 className="w-3 h-3 text-emerald-400" /> NF Vinculada
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 font-medium">
            <FileX className="w-3 h-3 text-amber-400" /> Falta NF
          </span>
        )}

        {hasBankProof ? (
          <span className="inline-flex items-center gap-1 text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20 font-medium">
            <CheckCircle2 className="w-3 h-3 text-sky-400" /> Comp. BB OK
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full font-medium">
            <Clock className="w-3 h-3 text-slate-500" /> Sem doc BB
          </span>
        )}

        {/* Action Button on mobile card header */}
        <div className="ml-auto flex items-center gap-1">
          {hasFiscalDoc && matchedDoc && onOpenPreview ? (
            <button
              type="button"
              onClick={() => onOpenPreview(matchedDoc, transaction)}
              className="px-2.5 py-1 text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg flex items-center gap-1 transition"
            >
              <Eye className="w-3.5 h-3.5" /> Ver Doc
            </button>
          ) : isDebit && onOpenLinkModal ? (
            <button
              type="button"
              onClick={() => onOpenLinkModal(transaction)}
              className="px-2.5 py-1 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg flex items-center gap-1 transition shadow-sm"
            >
              <Link className="w-3.5 h-3.5" /> Vincular
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
            aria-label={isExpanded ? "Recolher detalhes" : "Expandir detalhes"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Section */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-800 space-y-3 text-xs animate-fadeIn">
          {/* Rubrica */}
          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
              Rubrica Orçamentária
            </span>
            <p className="text-slate-200 font-medium">
              {matchedRubric?.nomeRubrica || matchedRubric?.nome || "Não vinculada"}
            </p>
            {matchedRubric?.etapa && (
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Etapa: {matchedRubric.etapa}
              </span>
            )}
          </div>

          {/* Doc Bancário / FITID */}
          <div className="grid grid-cols-2 gap-2 text-slate-400 text-[11px]">
            <div>
              <span className="block text-slate-500">Doc. Bancário:</span>
              <span className="font-mono text-slate-300">
                {transaction.documentoNumero || transaction.documentoBancario || "N/D"}
              </span>
            </div>
            <div>
              <span className="block text-slate-500">Descrição Extrato:</span>
              <span className="text-slate-300 truncate block">
                {transaction.descricaoExtrato || transaction.descricao || "N/D"}
              </span>
            </div>
          </div>

          {/* Miniatura do Anexo se houver documento */}
          {hasFiscalDoc && matchedDoc && (
            <div className="pt-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                Comprovante Anexado
              </span>
              <div className="w-full max-w-[140px]">
                <AttachmentThumbnail
                  documentId={matchedDoc.id}
                  fileName={matchedDoc.arquivoNotaNome || matchedDoc.numeroDoc || "Comprovante"}
                  projectId={projectId}
                  compact={true}
                  onOpenPreview={() => onOpenPreview && onOpenPreview(matchedDoc, transaction)}
                />
              </div>
            </div>
          )}

          {/* Botão de desvincular se conciliado */}
          {hasFiscalDoc && onUnlink && (
            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => onUnlink(transaction)}
                className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 underline font-medium"
              >
                <Unlink className="w-3 h-3" /> Desvincular despesa
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

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

  const rubricTitle = matchedRubric?.nomeRubrica || matchedRubric?.nome || "Rubrica pendente";
  const formattedDate = formatDate(transaction.data || transaction.dataTransacao);
  const saldoAposDebito =
    transaction.saldoAposTransacao != null && Number.isFinite(Number(transaction.saldoAposTransacao))
      ? formatCurrency(Number(transaction.saldoAposTransacao))
      : null;

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
      {/* Linha 1: [ STATUS ] e Valor */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-slate-400 bg-slate-800 px-2 py-1 rounded">
            #{String(index + 1).padStart(3, "0")}
          </span>
          <StatusBadge status={transaction} size="sm" showDetail />
        </div>

        <div className="text-right">
          <span
            className={`font-mono text-base font-bold tracking-tight ${
              isDebit ? "text-amber-300" : "text-emerald-400"
            }`}
          >
            {isDebit ? "- " : "+ "}
            {formatCurrency(transaction.valor)}
          </span>
        </div>
      </div>

      {/* Linha 2: Favorecido / fornecedor */}
      <div className="mb-1.5">
        <h4 className="text-sm font-bold text-white line-clamp-1">
          {resolved.personName || resolved.companyName || "Favorecido não identificado"}
        </h4>
        {resolved.companyName && resolved.companyName !== resolved.personName && (
          <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{resolved.companyName}</p>
        )}
        {resolved.cnpjCpf && (
          <span className="text-xs font-mono text-emerald-400 mt-0.5 block">
            {resolved.cnpjCpf}
          </span>
        )}
      </div>

      {/* Linha 3: Data · Rubrica */}
      <div className="text-xs text-slate-300 flex items-center gap-1.5 mb-2 flex-wrap">
        <span className="font-medium text-slate-400 flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          {formattedDate}
        </span>
        <span className="text-slate-600">·</span>
        <span className="text-slate-300 truncate max-w-[220px]" title={rubricTitle}>
          {rubricTitle}
        </span>
      </div>

      {/* Linha 4: NF e Comprovante BB disponibilidade */}
      <div className="grid grid-cols-2 gap-2 text-xs py-2 border-t border-slate-800/80 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">NF:</span>
          {hasFiscalDoc ? (
            <span className="inline-flex items-center gap-1 text-emerald-300 font-semibold">
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" /> Disponível
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
              <FileX className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" /> Ausente
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">Comp. BB:</span>
          {hasBankProof ? (
            <span className="inline-flex items-center gap-1 text-sky-300 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" /> Disponível
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-slate-400 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" /> Ausente
            </span>
          )}
        </div>
      </div>

      {/* Linha 5: Saldo após débito */}
      <div className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 mb-3">
        <span className="text-slate-400 font-medium">Saldo após débito:</span>
        <span className="font-mono text-xs font-semibold text-slate-200">
          {saldoAposDebito || "Saldo não informado"}
        </span>
      </div>

      {/* Linha de Ações Mínimas Obrigatórias: [ Ver documentos ] [ Conciliar ] [ Mais detalhes ] */}
      <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-800/80">
        {hasFiscalDoc && matchedDoc && onOpenPreview ? (
          <button
            type="button"
            onClick={() => onOpenPreview(matchedDoc, transaction)}
            className="flex-1 min-h-[44px] px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95"
            aria-label={`Ver documentos de ${resolved.personName || "transação"}`}
          >
            <Eye className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            <span>Ver documentos</span>
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="flex-1 min-h-[44px] px-3 py-2 text-xs font-medium bg-slate-950 text-slate-600 border border-slate-800/50 rounded-xl flex items-center justify-center gap-1 cursor-not-allowed"
          >
            <FileX className="w-4 h-4 text-slate-600" aria-hidden="true" />
            <span>Sem doc</span>
          </button>
        )}

        {isDebit && !isReconciled && onOpenLinkModal ? (
          <button
            type="button"
            onClick={() => onOpenLinkModal(transaction)}
            className="flex-1 min-h-[44px] px-3 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl flex items-center justify-center gap-1.5 transition shadow-sm active:scale-95"
            aria-label={`Conciliar lançamento #${String(index + 1).padStart(3, "0")}`}
          >
            <Link className="w-4 h-4" aria-hidden="true" />
            <span>Conciliar</span>
          </button>
        ) : isReconciled && onUnlink ? (
          <button
            type="button"
            onClick={() => onUnlink(transaction)}
            className="flex-1 min-h-[44px] px-3 py-2 text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl flex items-center justify-center gap-1.5 transition"
            aria-label="Desvincular conciliação"
          >
            <Unlink className="w-4 h-4 text-rose-400" aria-hidden="true" />
            <span>Desvincular</span>
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="min-h-[44px] px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl flex items-center justify-center gap-1 transition"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Recolher detalhes" : "Mais detalhes do lançamento"}
        >
          <span>{isExpanded ? "Menos" : "Mais detalhes"}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
        </button>
      </div>

      {/* Seção de Detalhes Expansível */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-800 space-y-3 text-xs">
          {/* Rubrica Detalhada */}
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <span className="text-xs uppercase font-bold text-slate-400 block mb-1">
              Rubrica Orçamentária SALIC
            </span>
            <p className="text-slate-200 font-semibold text-xs">
              {matchedRubric?.codigo ? `${matchedRubric.codigo} - ` : ""}
              {rubricTitle}
            </p>
            {matchedRubric?.etapa && (
              <span className="text-xs text-slate-400 block mt-1">
                Etapa: {matchedRubric.etapa}
              </span>
            )}
          </div>

          {/* Doc Bancário / Descrição Extrato BB */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300 text-xs">
            <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800">
              <span className="block text-slate-400 text-xs font-medium">Doc. Bancário / FITID:</span>
              <span className="font-mono text-xs text-slate-200">
                {transaction.documentoNumero || transaction.documentoBancario || "Não identificado"}
              </span>
            </div>
            <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800">
              <span className="block text-slate-400 text-xs font-medium">Descrição no Extrato BB:</span>
              <span className="text-xs text-slate-200 truncate block">
                {transaction.descricaoExtrato || transaction.descricao || "Não informada"}
              </span>
            </div>
          </div>

          {/* Miniatura do Documento Vinculado */}
          {hasFiscalDoc && matchedDoc && (
            <div className="pt-1">
              <span className="text-xs uppercase font-bold text-slate-400 block mb-2">
                Prévia do Documento Fiscal
              </span>
              <div className="w-full max-w-[180px]">
                <AttachmentThumbnail
                  documentId={matchedDoc.id}
                  fileName={matchedDoc.arquivoNotaNome || matchedDoc.numeroDoc || "Documento Fiscal"}
                  projectId={projectId}
                  compact={false}
                  onOpenPreview={() => onOpenPreview && onOpenPreview(matchedDoc, transaction)}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

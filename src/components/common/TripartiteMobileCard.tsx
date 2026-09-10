import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  FileCheck2,
  FileX,
  CheckCircle2,
  Clock,
  Eye,
  Split,
  Calendar,
} from "lucide-react";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { resolveProviderAndCompany } from "../../utils/providerHelper";
import { StatusBadge } from "./StatusBadge";
import { AttachmentThumbnail } from "../AttachmentThumbnail";
import type { TripartiteEntry, FiscalDocument, BankTransaction, BudgetRubric } from "../../types";

interface TripartiteMobileCardProps {
  entry: TripartiteEntry;
  index: number;
  fiscalDocument?: FiscalDocument;
  bankTransaction?: BankTransaction;
  rubric?: BudgetRubric;
  projectId: string;
  onOpenPreview?: (type: "NF" | "BB") => void;
  onOpenRateio?: () => void;
  onToggleSalicStatus?: () => void;
}

export const TripartiteMobileCard: React.FC<TripartiteMobileCardProps> = ({
  entry,
  index,
  fiscalDocument,
  bankTransaction,
  rubric,
  projectId,
  onOpenPreview,
  onOpenRateio,
  onToggleSalicStatus,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const resolved = resolveProviderAndCompany(
    fiscalDocument?.fornecedorNome || entry.fornecedor || "",
    fiscalDocument?.fornecedorCnpjCpf || entry.cnpjCpf || ""
  );

  const hasFiscal = Boolean(entry.checkTripe?.fiscalDocAnexo);
  const hasBank = Boolean(entry.checkTripe?.comprovanteBancarioAnexo);
  const isTripodComplete = hasFiscal && hasBank;

  const saldoAposDebito =
    bankTransaction?.saldoAposTransacao != null && Number.isFinite(Number(bankTransaction.saldoAposTransacao))
      ? formatCurrency(Number(bankTransaction.saldoAposTransacao))
      : null;

  const rubricName = entry.descricaoRubrica || rubric?.nomeRubrica || rubric?.nome || "Rubrica não vinculada";
  const formattedDate = formatDate(entry.dataCompensacao || entry.dataEmissao);

  return (
    <div
      className={`bg-slate-900 border rounded-2xl p-4 transition shadow-md ${
        isTripodComplete
          ? "border-emerald-500/30 bg-slate-900/90"
          : "border-slate-800 hover:border-slate-700"
      }`}
    >
      {/* Linha 1: [ STATUS ] e Valor do Débito BB */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-slate-400 bg-slate-800 px-2 py-1 rounded">
            #{String(index + 1).padStart(3, "0")}
          </span>
          <StatusBadge status={entry} size="sm" showDetail />
        </div>

        <div className="text-right">
          <span className="font-mono text-base font-bold text-sky-400 tracking-tight">
            - {formatCurrency(entry.valorDebitoBB)}
          </span>
        </div>
      </div>

      {/* Linha 2: Favorecido / Fornecedor (PF + PJ) */}
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
        <span className="text-slate-300 truncate max-w-[220px]" title={rubricName}>
          {rubricName}
        </span>
      </div>

      {/* Linha 4: NF e Comprovante BB */}
      <div className="grid grid-cols-2 gap-2 text-xs py-2 border-t border-slate-800/80 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">NF:</span>
          {hasFiscal ? (
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
          {hasBank ? (
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

      {/* Linha de Ações: [ Ver documentos ] [ Rateio ] [ Mais detalhes ] */}
      <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-800/80">
        {hasFiscal && onOpenPreview ? (
          <button
            type="button"
            onClick={() => onOpenPreview("NF")}
            className="flex-1 min-h-[44px] px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95"
            aria-label={`Ver documentos de ${resolved.personName || "lançamento"}`}
          >
            <Eye className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            <span>Ver docs</span>
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

        {onOpenRateio ? (
          <button
            type="button"
            onClick={onOpenRateio}
            className="flex-1 min-h-[44px] px-3 py-2 text-xs font-semibold bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95"
            aria-label={`Rateio do lançamento #${String(index + 1).padStart(3, "0")}`}
          >
            <Split className="w-4 h-4 text-indigo-400" aria-hidden="true" />
            <span>Rateio</span>
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

      {/* Detalhes Expansíveis */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-800 space-y-3 text-xs">
          {/* Valores Fiscais e Retenções */}
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
            <span className="text-xs uppercase font-bold text-slate-400 block">
              Composição Tributária e Financeira
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 block text-xs">Valor Bruto NF:</span>
                <span className="font-mono text-xs font-bold text-emerald-400">
                  {formatCurrency(entry.valorBrutoDoc)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-xs">Líquido a Pagar:</span>
                <span className="font-mono text-xs font-bold text-slate-200">
                  {formatCurrency(entry.valorLiquidoPagar)}
                </span>
              </div>
            </div>

            {entry.retencoes && (entry.retencoes.irrf > 0 || entry.retencoes.iss > 0 || entry.retencoes.inss > 0) && (
              <div className="pt-2 border-t border-slate-800 text-xs text-slate-400 flex flex-wrap gap-2">
                {entry.retencoes.irrf > 0 && (
                  <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    IRRF: <strong className="text-slate-200 font-mono">{formatCurrency(entry.retencoes.irrf)}</strong>
                  </span>
                )}
                {entry.retencoes.iss > 0 && (
                  <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    ISS: <strong className="text-slate-200 font-mono">{formatCurrency(entry.retencoes.iss)}</strong>
                  </span>
                )}
                {entry.retencoes.inss > 0 && (
                  <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    INSS: <strong className="text-slate-200 font-mono">{formatCurrency(entry.retencoes.inss)}</strong>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Status SALIC com Toggle */}
          <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-slate-400 font-medium">Status Oficial SALIC:</span>
            {onToggleSalicStatus ? (
              <button
                type="button"
                onClick={onToggleSalicStatus}
                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:border-emerald-500 transition cursor-pointer"
                title="Clique para alternar o status SALIC"
              >
                {entry.statusSalic || "Pendente"}
              </button>
            ) : (
              <span className="text-slate-200 font-bold">{entry.statusSalic || "Pendente"}</span>
            )}
          </div>

          {/* Miniaturas de GED */}
          {(hasFiscal || hasBank) && (
            <div className="pt-1">
              <span className="text-xs uppercase font-bold text-slate-400 block mb-2">
                Documentos Anexados no Dossiê
              </span>
              <div className="flex items-center gap-3 flex-wrap">
                {hasFiscal && (
                  <div className="w-24">
                    <span className="text-xs text-slate-400 block mb-1">Nota Fiscal</span>
                    <AttachmentThumbnail
                      documentId={entry.idDocFiscal}
                      fileName={entry.anexoFiscalUrl || `NF-${entry.numeroDoc || "vinculada"}.pdf`}
                      projectId={projectId}
                      compact={true}
                      onOpenPreview={() => onOpenPreview && onOpenPreview("NF")}
                    />
                  </div>
                )}
                {hasBank && (
                  <div className="w-24">
                    <span className="text-xs text-slate-400 block mb-1">Comp. BB</span>
                    <AttachmentThumbnail
                      documentId={entry.idDocFiscal}
                      fileName={entry.anexoComprovanteUrl || `BB-${entry.idTransacaoBB || "vinculado"}.pdf`}
                      projectId={projectId}
                      compact={true}
                      onOpenPreview={() => onOpenPreview && onOpenPreview("BB")}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

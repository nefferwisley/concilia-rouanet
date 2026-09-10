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
  Folder,
  Trash2,
  FilePlus2,
} from "lucide-react";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { resolveProviderAndCompany } from "../../utils/providerHelper";
import { StatusBadge } from "./StatusBadge";
import { AttachmentThumbnail } from "../AttachmentThumbnail";
import type {
  TripartiteEntry,
  FiscalDocument,
  BankTransaction,
  BudgetRubric,
  PronacProject,
} from "../../types";
import type { DocumentPreviewData } from "./DocumentPreviewDrawer";

interface TripartiteMobileCardProps {
  entry: TripartiteEntry;
  index: number;
  /** Full project object from parent */
  project: PronacProject;
  /** All fiscal documents for lookup */
  documents: FiscalDocument[];
  /** All bank transactions for lookup */
  transactions: BankTransaction[];
  /** All rubrics for lookup */
  rubrics: BudgetRubric[];
  /** Whether a bank statement OFX/CSV has been imported */
  hasImportedBankStatement?: boolean;
  /** Open the document preview drawer with pre-filled data */
  onOpenPreview?: (data: DocumentPreviewData) => void;
  /** Open the rateio (split) modal for this entry */
  onOpenRateio?: (entry: TripartiteEntry) => void;
  /** Toggle the SALIC status to the next state */
  onToggleSalicStatus?: (entry: TripartiteEntry) => void;
  /** Open the GED file viewer for this entry */
  onOpenGed?: (entry: TripartiteEntry | null) => void;
  /** Delete this entry */
  onDelete?: (idLancamento: string) => void;
  /** Quick-create a fiscal document and link it to this entry */
  onQuickCreateDoc?: (entry: TripartiteEntry) => void;
}

export const TripartiteMobileCard: React.FC<TripartiteMobileCardProps> = ({
  entry,
  index,
  project,
  documents,
  transactions,
  rubrics,
  hasImportedBankStatement = false,
  onOpenPreview,
  onOpenRateio,
  onToggleSalicStatus,
  onOpenGed,
  onDelete,
  onQuickCreateDoc,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Derive linked fiscal document, bank transaction, and rubric from arrays
  const fiscalDocument = documents.find(
    (d) => d.id === entry.idDocFiscal || d.numeroDoc === entry.numeroDoc
  );
  const bankTransaction = transactions.find(
    (t) => t.id === entry.idTransacaoBB || t.fitid === entry.idTransacaoBB
  );
  const rubric = rubrics.find((r) => r.id === entry.idRubrica);

  const resolved = resolveProviderAndCompany(
    fiscalDocument?.fornecedorNome || entry.fornecedor || "",
    fiscalDocument?.fornecedorCnpjCpf || entry.cnpjCpf || ""
  );

  const hasFiscal = Boolean(entry.checkTripe?.fiscalDocAnexo);
  const hasBank = Boolean(entry.checkTripe?.comprovanteBancarioAnexo);
  const isTripodComplete = hasFiscal && hasBank;

  const saldoAposDebito =
    bankTransaction?.saldoAposTransacao != null &&
    Number.isFinite(Number(bankTransaction.saldoAposTransacao))
      ? formatCurrency(Number(bankTransaction.saldoAposTransacao))
      : null;

  const rubricName =
    entry.descricaoRubrica || rubric?.nomeRubrica || rubric?.nome || "Rubrica não vinculada";
  const formattedDate = formatDate(entry.dataCompensacao || entry.dataEmissao);

  /** Build a DocumentPreviewData object from entry + derived data for the drawer */
  const buildPreviewData = (): DocumentPreviewData => ({
    documentId: entry.idDocFiscal,
    fileName:
      fiscalDocument?.nomeArquivo ||
      entry.anexoFiscalUrl ||
      `NF-${entry.numeroDoc || entry.idLancamento}.pdf`,
    tipoDoc: entry.tipoDoc,
    numeroDoc: entry.numeroDoc,
    dataEmissao: entry.dataEmissao,
    favorecido: resolved.personName || resolved.companyName,
    cnpjCpf: resolved.cnpjCpf,
    valorBruto: entry.valorBrutoDoc,
    retencoes: {
      iss: entry.retencoes?.iss,
      irrf: entry.retencoes?.irrf,
      inss: entry.retencoes?.inss,
    },
    valorLiquido: entry.valorLiquidoPagar,
    rubricaNome: rubricName,
    documentoBancario: entry.idTransacaoBB,
    dataCompensacao: entry.dataCompensacao,
    observacoes: entry.observacoes,
    comprovanteBancarioUrl: entry.anexoComprovanteUrl,
    statusComprovacao: entry.statusSalic,
  });

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
          <span className="text-xs font-mono text-emerald-400 mt-0.5 block">{resolved.cnpjCpf}</span>
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

      {/* Linha de Ações */}
      <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-800/80">
        {hasFiscal && onOpenPreview ? (
          <button
            type="button"
            onClick={() => onOpenPreview(buildPreviewData())}
            className="flex-1 min-h-[44px] px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95"
            aria-label={`Ver documentos de ${resolved.personName || "lançamento"}`}
          >
            <Eye className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            <span>Ver docs</span>
          </button>
        ) : !hasFiscal && onQuickCreateDoc ? (
          <button
            type="button"
            onClick={() => onQuickCreateDoc(entry)}
            className="flex-1 min-h-[44px] px-3 py-2 text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95"
            aria-label={`Vincular documento ao lançamento #${String(index + 1).padStart(3, "0")}`}
          >
            <FilePlus2 className="w-4 h-4 text-amber-400" aria-hidden="true" />
            <span>Vincular NF</span>
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

        {onOpenRateio && (
          <button
            type="button"
            onClick={() => onOpenRateio(entry)}
            className="flex-1 min-h-[44px] px-3 py-2 text-xs font-semibold bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95"
            aria-label={`Rateio do lançamento #${String(index + 1).padStart(3, "0")}`}
          >
            <Split className="w-4 h-4 text-indigo-400" aria-hidden="true" />
            <span>Rateio</span>
          </button>
        )}

        {onOpenGed && (
          <button
            type="button"
            onClick={() => onOpenGed(entry)}
            className="min-h-[44px] px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl flex items-center justify-center gap-1 transition"
            aria-label={`GED do lançamento #${String(index + 1).padStart(3, "0")}`}
          >
            <Folder className="w-4 h-4" aria-hidden="true" />
          </button>
        )}

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="min-h-[44px] px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl flex items-center justify-center gap-1 transition"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Recolher detalhes" : "Mais detalhes do lançamento"}
        >
          <span>{isExpanded ? "Menos" : "Mais"}</span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-4 h-4" aria-hidden="true" />
          )}
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

            {entry.retencoes &&
              (entry.retencoes.irrf > 0 ||
                entry.retencoes.iss > 0 ||
                entry.retencoes.inss > 0) && (
                <div className="pt-2 border-t border-slate-800 text-xs text-slate-400 flex flex-wrap gap-2">
                  {entry.retencoes.irrf > 0 && (
                    <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      IRRF:{" "}
                      <strong className="text-slate-200 font-mono">
                        {formatCurrency(entry.retencoes.irrf)}
                      </strong>
                    </span>
                  )}
                  {entry.retencoes.iss > 0 && (
                    <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      ISS:{" "}
                      <strong className="text-slate-200 font-mono">
                        {formatCurrency(entry.retencoes.iss)}
                      </strong>
                    </span>
                  )}
                  {entry.retencoes.inss > 0 && (
                    <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      INSS:{" "}
                      <strong className="text-slate-200 font-mono">
                        {formatCurrency(entry.retencoes.inss)}
                      </strong>
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
                onClick={() => onToggleSalicStatus(entry)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:border-emerald-500 transition cursor-pointer"
                title="Clique para alternar o status SALIC"
              >
                {entry.statusSalic || "Pendente"}
              </button>
            ) : (
              <span className="text-slate-200 font-bold">{entry.statusSalic || "Pendente"}</span>
            )}
          </div>

          {/* Ações de risco */}
          {onDelete && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => onDelete(entry.idLancamento)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition"
                aria-label={`Remover lançamento #${String(index + 1).padStart(3, "0")}`}
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Remover</span>
              </button>
            </div>
          )}

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
                      projectId={project.id}
                      compact={true}
                      onOpenPreview={
                        onOpenPreview ? () => onOpenPreview(buildPreviewData()) : undefined
                      }
                    />
                  </div>
                )}
                {hasBank && (
                  <div className="w-24">
                    <span className="text-xs text-slate-400 block mb-1">Comp. BB</span>
                    <AttachmentThumbnail
                      documentId={entry.idDocFiscal}
                      fileName={
                        entry.anexoComprovanteUrl ||
                        `BB-${entry.idTransacaoBB || "vinculado"}.pdf`
                      }
                      projectId={project.id}
                      compact={true}
                      onOpenPreview={
                        onOpenPreview
                          ? () =>
                              onOpenPreview({
                                ...buildPreviewData(),
                                fileName:
                                  entry.anexoComprovanteUrl ||
                                  `BB-${entry.idTransacaoBB || "vinculado"}.pdf`,
                              })
                          : undefined
                      }
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

import React, { useEffect, useRef } from "react";
import { X, ExternalLink, FileText, Building2, Calendar, DollarSign, ShieldCheck, AlertCircle, RefreshCw } from "lucide-react";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { resolveProviderAndCompany } from "../../utils/providerHelper";

export interface DocumentPreviewData {
  documentId?: string;
  signedUrl?: string | null;
  fileName: string;
  mimeType?: string;
  tipoDoc?: string;
  numeroDoc?: string;
  dataEmissao?: string;
  favorecido?: string;
  cnpjCpf?: string;
  valorBruto?: number;
  retencoes?: {
    iss?: number;
    irrf?: number;
    inss?: number;
  };
  valorLiquido?: number;
  rubricaNome?: string;
  rubricaItem?: string;
  documentoBancario?: string;
  dataCompensacao?: string;
  observacoes?: string;
  comprovanteBancarioUrl?: string;
  statusComprovacao?: string;
}

interface DocumentPreviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: DocumentPreviewData | null;
  onRetry?: () => void;
}

export const DocumentPreviewDrawer: React.FC<DocumentPreviewDrawerProps> = ({
  isOpen,
  onClose,
  data,
  onRetry,
}) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !data) return null;

  const resolved = resolveProviderAndCompany(data.favorecido || "", data.cnpjCpf || "");
  const isPdf =
    data.fileName?.toLowerCase().endsWith(".pdf") ||
    data.mimeType?.includes("pdf") ||
    data.tipoDoc?.includes("PDF");
  const isImage =
    /\.(jpe?g|png|webp|gif)$/i.test(data.fileName || "") ||
    data.mimeType?.startsWith("image/");

  const totalRetencoes =
    (data.retencoes?.iss || 0) + (data.retencoes?.irrf || 0) + (data.retencoes?.inss || 0);
  const valorLiquido =
    data.valorLiquido !== undefined
      ? data.valorLiquido
      : (data.valorBruto || 0) - totalRetencoes;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-drawer-title"
      className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-sm flex justify-end transition-opacity duration-300 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl lg:max-w-3xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 id="preview-drawer-title" className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Dossiê & Visualização de Comprovante
              </h2>
              <p className="text-xs text-slate-400 line-clamp-1">{data.fileName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data.signedUrl && (
              <a
                href={data.signedUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 text-slate-400 hover:text-emerald-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                title="Abrir arquivo em nova aba"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
              aria-label="Fechar visualização"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6 flex-1">
          {/* Visual Preview Box */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden min-h-[320px] max-h-[500px] flex items-center justify-center relative">
            {data.signedUrl ? (
              isImage ? (
                <img
                  src={data.signedUrl}
                  alt={data.fileName}
                  className="w-full h-full object-contain max-h-[500px]"
                />
              ) : isPdf ? (
                <iframe
                  src={`${data.signedUrl}#view=FitH`}
                  title={data.fileName}
                  className="w-full h-[480px] border-0"
                />
              ) : (
                <div className="p-8 text-center space-y-3">
                  <FileText className="w-12 h-12 text-slate-500 mx-auto" />
                  <p className="text-sm text-slate-300">Documento disponível para download.</p>
                  <a
                    href={data.signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Baixar / Abrir {data.fileName}
                  </a>
                </div>
              )
            ) : (
              <div className="p-8 text-center space-y-3">
                <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-200">Arquivo indisponível</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  O binário deste documento não foi localizado ou precisa ser reimportado.
                </p>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Favorecido */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 flex items-center gap-1 font-semibold">
                <Building2 className="w-3 h-3 text-slate-400" /> Favorecido / Fornecedor
              </span>
              <p className="text-sm font-bold text-white">{resolved.personName || resolved.companyName || "Não informado"}</p>
              {resolved.companyName && resolved.companyName !== resolved.personName && (
                <p className="text-xs text-slate-400">{resolved.companyName}</p>
              )}
              {resolved.cnpjCpf && (
                <p className="text-xs font-mono text-emerald-400">{resolved.cnpjCpf}</p>
              )}
            </div>

            {/* Documento Fiscal */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 flex items-center gap-1 font-semibold">
                <FileText className="w-3 h-3 text-slate-400" /> Documento Fiscal
              </span>
              <p className="text-sm font-bold text-white">
                {data.tipoDoc || "Nota Fiscal"} {data.numeroDoc ? `nº ${data.numeroDoc}` : ""}
              </p>
              {data.dataEmissao && (
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-500" /> Emissão: {formatDate(data.dataEmissao)}
                </p>
              )}
            </div>

            {/* Valores e Retenções */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 flex items-center gap-1 font-semibold">
                <DollarSign className="w-3 h-3 text-slate-400" /> Discriminação Financeira
              </span>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Valor Bruto:</span>
                  <span className="font-mono text-slate-200">{formatCurrency(data.valorBruto || 0)}</span>
                </div>
                {totalRetencoes > 0 && (
                  <div className="flex justify-between text-amber-400 font-medium">
                    <span>Retenções na Fonte:</span>
                    <span className="font-mono">-{formatCurrency(totalRetencoes)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-slate-800 font-bold text-emerald-400">
                  <span>Valor Líquido Pago:</span>
                  <span className="font-mono">{formatCurrency(valorLiquido)}</span>
                </div>
              </div>
            </div>

            {/* Vínculo Bancário e Rubrica */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 flex items-center gap-1 font-semibold">
                <ShieldCheck className="w-3 h-3 text-slate-400" /> Vínculo Orçamentário e Extrato
              </span>
              <div className="text-xs space-y-1">
                <p className="text-slate-200">
                  <strong className="text-slate-400">Rubrica:</strong>{" "}
                  {data.rubricaNome || "Aguardando vínculo orçamentário"}
                </p>
                {data.documentoBancario && (
                  <p className="text-slate-200">
                    <strong className="text-slate-400">Doc. Bancário BB:</strong>{" "}
                    <span className="font-mono text-sky-400">{data.documentoBancario}</span>
                  </p>
                )}
                {data.dataCompensacao && (
                  <p className="text-slate-400">
                    Compensação: {formatDate(data.dataCompensacao)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {data.observacoes && (
            <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-300">
              <span className="font-semibold text-slate-400 block mb-1">Observações do Lançamento:</span>
              <p>{data.observacoes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

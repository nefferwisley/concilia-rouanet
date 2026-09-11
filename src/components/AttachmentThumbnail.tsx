import React, { useState, useEffect, useRef } from "react";
import { FileCheck, AlertCircle, RefreshCw, LogIn, FileX } from "lucide-react";
import { documentUrlService, type DocumentUrlStatus } from "../services/documentUrlService";

interface AttachmentThumbnailProps {
  documentId?: string;
  fileId?: string;
  detectedType?: string;
  fileName: string;
  fallbackUrl?: string;
  projectId?: string;
  compact?: boolean;
  onOpenPreview?: () => void;
  onReimport?: () => void;
}

export const AttachmentThumbnail: React.FC<AttachmentThumbnailProps> = ({
  documentId,
  fileId,
  detectedType,
  fileName,
  fallbackUrl,
  projectId = "1961",
  compact = false,
  onOpenPreview,
  onReimport,
}) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<DocumentUrlStatus>("LOADING");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Lazy loading com IntersectionObserver para não disparar requisições em itens fora da tela
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let mounted = true;
    const id = documentId || fileId;

    if (!id) {
      if (fallbackUrl && !fallbackUrl.startsWith("blob:")) {
        setSignedUrl(fallbackUrl);
        setStatus("SUCCESS");
      } else {
        setStatus("NOT_FOUND");
        setErrorMessage("Arquivo precisa ser reimportado.");
      }
      return;
    }

    const fetchUrl = async () => {
      setStatus("LOADING");
      setErrorMessage(null);

      const result = await documentUrlService.fetchSignedUrl(id, projectId, retryCount > 0);

      if (mounted) {
        setStatus(result.status);
        setSignedUrl(result.signedUrl);
        setErrorMessage(result.errorMessage || null);
      }
    };

    fetchUrl();
    return () => {
      mounted = false;
    };
  }, [isVisible, documentId, fileId, fallbackUrl, projectId, retryCount]);

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    const id = documentId || fileId;
    if (id) {
      documentUrlService.invalidate(id, projectId);
    }
    setRetryCount((prev) => prev + 1);
  };

  const handleReimport = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onReimport) {
      onReimport();
    } else {
      handleRetry(e);
    }
  };

  const sizeClass = compact ? "h-14 w-12 min-w-[48px]" : "w-full h-32";

  // Container antes de entrar no viewport
  if (!isVisible) {
    return (
      <div
        ref={containerRef}
        className={`${sizeClass} bg-slate-900/60 rounded-xl border border-slate-800/80 animate-pulse`}
        aria-hidden="true"
      />
    );
  }

  // 1. Estado: Carregando prévia
  if (status === "LOADING") {
    return (
      <div
        ref={containerRef}
        className={`${sizeClass} bg-slate-800/70 animate-pulse rounded-xl flex flex-col items-center justify-center p-1 text-xs text-slate-400 border border-slate-700/60 select-none`}
        aria-label={`Carregando prévia de ${fileName}`}
        title={`Carregando prévia de ${fileName}`}
        role="status"
      >
        <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin mb-1" aria-hidden="true" />
        {!compact && <span className="text-xs text-slate-300">Carregando prévia...</span>}
      </div>
    );
  }

  // 2. Estado: Sessão expirada / Não autorizado (401)
  if (status === "UNAUTHORIZED") {
    return (
      <div
        ref={containerRef}
        className={`${sizeClass} bg-slate-900 rounded-xl flex flex-col items-center justify-center text-center p-2 text-xs text-amber-300/90 border border-amber-500/40 select-none`}
        title="Sessão expirada. Faça login novamente para visualizar documentos protegidos."
        aria-label={`${fileName} — Estado: Sessão expirada`}
      >
        <LogIn className="w-4 h-4 text-amber-400 mb-1 shrink-0" aria-hidden="true" />
        <span className="text-xs font-semibold leading-tight line-clamp-1">Sessão expirada</span>
      </div>
    );
  }

  // 3. Estado: Não localizado / Reimportar arquivo (404 ou sem binário no bucket)
  if (status === "NOT_FOUND" || (!signedUrl && status !== "NETWORK_ERROR")) {
    return (
      <div
        ref={containerRef}
        className={`${sizeClass} bg-slate-900/90 rounded-xl flex flex-col items-center justify-center text-center p-1 text-xs text-slate-400 border border-slate-800 hover:border-slate-700 transition`}
        title="Arquivo físico não localizado no storage. Necessário reimportar o documento."
        aria-label={`${fileName} — Estado: Não localizado. Reimportar arquivo.`}
      >
        <FileX className="w-4 h-4 text-slate-500 mb-0.5 shrink-0" aria-hidden="true" />
        <span className="text-xs text-slate-400 line-clamp-1 leading-tight font-medium">Não localizado</span>
        <button
          type="button"
          onClick={handleReimport}
          className="mt-1 text-xs font-semibold text-amber-400 hover:text-amber-300 hover:underline min-h-[32px] px-1 flex items-center gap-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
          title="Clique para reimportar este arquivo"
        >
          Reimportar
        </button>
      </div>
    );
  }

  // 4. Erro de rede (502 / 503 / conexão) -> Permite retry com clique
  if (status === "NETWORK_ERROR" || !signedUrl) {
    return (
      <div
        ref={containerRef}
        className={`${sizeClass} bg-slate-900 rounded-xl flex flex-col items-center justify-center text-center p-2 text-xs text-slate-400 border border-rose-500/30`}
        title={errorMessage || "Erro ao carregar prévia"}
      >
        <AlertCircle className="w-4 h-4 text-rose-400 mb-0.5 shrink-0" />
        <button
          type="button"
          onClick={handleRetry}
          className="mt-1 min-h-[32px] text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded border border-slate-700 transition flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          title="Tentar carregar novamente"
        >
          <RefreshCw className="w-3 h-3" /> Tentar
        </button>
      </div>
    );
  }

  // 5. Estado: Disponível (Sucesso - Arquivo real PDF ou Imagem disponível)
  const isPdf =
    fileName.toLowerCase().endsWith(".pdf") ||
    detectedType === "PDF" ||
    detectedType === "application/pdf";
  const isImage =
    /\.(jpeg|jpg|gif|png|webp)$/i.test(fileName) || detectedType?.startsWith("image/");

  const openDocument = () => {
    if (onOpenPreview) {
      onOpenPreview();
    } else if (signedUrl) {
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    openDocument();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openDocument();
    }
  };

  if (isImage) {
    return (
      <div
        ref={containerRef}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        title={`${fileName} — Estado: Disponível (Imagem). Clique para visualizar.`}
        aria-label={`${fileName} — Estado: Disponível. Clique para abrir imagem.`}
        className={`block ${sizeClass} overflow-hidden rounded-xl border border-slate-700 hover:border-emerald-500 transition cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 relative`}
      >
        <img
          src={signedUrl}
          alt={fileName}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          onError={() => setStatus("NETWORK_ERROR")}
        />
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 to-transparent p-1 text-center opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-xs font-semibold text-emerald-300">Disponível</span>
        </div>
      </div>
    );
  }

  if (isPdf) {
    return (
      <div
        ref={containerRef}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        title={`${fileName} — Estado: Disponível (PDF). Clique para abrir no leitor.`}
        aria-label={`${fileName} — Estado: Disponível. Clique para abrir PDF.`}
        className={`block ${sizeClass} overflow-hidden rounded-xl border border-slate-700 hover:border-emerald-500 transition relative group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 bg-slate-950`}
      >
        <iframe
          src={`${signedUrl}#view=FitH`}
          title={fileName}
          className="w-full h-full pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity"
        />
        <div className="absolute inset-0 bg-slate-900/40 group-hover:bg-slate-900/10 transition flex flex-col items-center justify-center p-1">
          <FileCheck className="w-5 h-5 text-emerald-400 drop-shadow mb-0.5" aria-hidden="true" />
          <span className="text-xs font-semibold text-emerald-300 bg-slate-950/80 px-1.5 py-0.5 rounded border border-emerald-500/30">
            PDF OK
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      title={`${fileName} — Estado: Disponível. Clique para visualizar.`}
      aria-label={`${fileName} — Estado: Disponível. Clique para abrir.`}
      className={`${sizeClass} bg-slate-900 rounded-xl flex flex-col items-center justify-center p-1 text-xs text-slate-300 border border-slate-700 hover:border-emerald-500 hover:text-emerald-400 transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500`}
    >
      <FileCheck className="w-5 h-5 mb-1 text-emerald-400" aria-hidden="true" />
      <span className="px-1 text-center text-xs break-all line-clamp-2">{fileName}</span>
      <span className="text-xs font-semibold text-emerald-400 mt-0.5">Disponível</span>
    </div>
  );
};

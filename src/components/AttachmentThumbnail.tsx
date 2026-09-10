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

  const sizeClass = compact ? "h-12 w-10 min-w-[40px]" : "w-full h-32";

  // Container para IntersectionObserver
  if (!isVisible) {
    return (
      <div
        ref={containerRef}
        className={`${sizeClass} bg-slate-900/60 rounded-lg border border-slate-800/80 animate-pulse`}
      />
    );
  }

  // 1. Carregando -> Skeleton com pulsamento suave
  if (status === "LOADING") {
    return (
      <div
        ref={containerRef}
        className={`${sizeClass} bg-slate-800/70 animate-pulse rounded-lg flex items-center justify-center text-[10px] text-slate-400 border border-slate-700/60`}
        aria-label={`Carregando prévia de ${fileName}`}
        role="status"
      >
        <span className="sr-only">Carregando prévia...</span>
        <span className="text-slate-500 font-mono text-xs">...</span>
      </div>
    );
  }

  // 2. Erro 401 (Não autorizado / Sessão expirada)
  if (status === "UNAUTHORIZED") {
    return (
      <div
        ref={containerRef}
        className={`${sizeClass} bg-slate-900 rounded-lg flex flex-col items-center justify-center text-center p-1 text-[9px] text-amber-300/90 border border-amber-500/30`}
        title="Sessão expirada. Faça login novamente para visualizar documentos protegidos."
      >
        <LogIn className="w-3.5 h-3.5 text-amber-400 mb-0.5 shrink-0" />
        {!compact && <span className="line-clamp-2 leading-tight">Sessão expirada</span>}
      </div>
    );
  }

  // 3. Erro 404 ou metadado sem arquivo binário associado
  if (status === "NOT_FOUND" || (!signedUrl && status !== "NETWORK_ERROR")) {
    return (
      <div
        ref={containerRef}
        className={`${sizeClass} bg-slate-900 rounded-lg flex flex-col items-center justify-center text-center p-1 text-[9px] text-slate-400 border border-slate-800`}
        title="Arquivo precisa ser reimportado."
      >
        <FileX className="w-3.5 h-3.5 text-slate-500 mb-0.5 shrink-0" />
        {!compact && <span className="line-clamp-2 leading-tight text-slate-400">Reimportar</span>}
      </div>
    );
  }

  // 4. Erro de rede (502 / 503 / conexão) -> Permite retry com clique
  if (status === "NETWORK_ERROR" || !signedUrl) {
    return (
      <div
        ref={containerRef}
        className={`${sizeClass} bg-slate-900 rounded-lg flex flex-col items-center justify-center text-center p-1 text-[9px] text-slate-400 border border-rose-500/30`}
        title={errorMessage || "Erro ao carregar prévia"}
      >
        <AlertCircle className="w-3.5 h-3.5 text-rose-400 mb-0.5 shrink-0" />
        <button
          type="button"
          onClick={handleRetry}
          className="mt-0.5 text-[8px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-1 py-0.5 rounded border border-slate-700 transition flex items-center gap-0.5"
          title="Tentar carregar novamente"
        >
          <RefreshCw className="w-2.5 h-2.5" /> Retry
        </button>
      </div>
    );
  }

  // 5. Sucesso -> Imagem ou PDF
  const isPdf =
    fileName.toLowerCase().endsWith(".pdf") ||
    detectedType === "PDF" ||
    detectedType === "application/pdf";
  const isImage =
    /\.(jpeg|jpg|gif|png|webp)$/i.test(fileName) || detectedType?.startsWith("image/");

  const handleClick = (e: React.MouseEvent) => {
    if (onOpenPreview) {
      e.preventDefault();
      onOpenPreview();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && onOpenPreview) {
      e.preventDefault();
      onOpenPreview();
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
        aria-label={`Abrir prévia da imagem ${fileName}`}
        className={`block ${sizeClass} overflow-hidden rounded-lg border border-slate-700 hover:border-emerald-500 transition cursor-pointer group focus:outline-none focus:ring-2 focus:ring-emerald-500`}
      >
        <img
          src={signedUrl}
          alt={fileName}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          onError={() => setStatus("NETWORK_ERROR")}
        />
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
        aria-label={`Abrir prévia do PDF ${fileName}`}
        className={`block ${sizeClass} overflow-hidden rounded-lg border border-slate-700 hover:border-emerald-500 transition relative group cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500`}
      >
        <iframe
          src={`${signedUrl}#view=FitH`}
          title={fileName}
          className="w-full h-full pointer-events-none"
        />
        <div className="absolute inset-0 bg-transparent group-hover:bg-slate-900/30 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
          <FileCheck className="w-5 h-5 text-emerald-400 drop-shadow" />
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
      aria-label={`Abrir documento ${fileName}`}
      className={`${sizeClass} bg-slate-900 rounded-lg flex flex-col items-center justify-center text-xs text-slate-400 border border-slate-700 hover:border-emerald-500 hover:text-emerald-400 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500`}
    >
      <FileCheck className="w-6 h-6 mb-1 text-emerald-400" />
      <span className="px-2 text-center text-[10px] break-all line-clamp-2">{fileName}</span>
    </div>
  );
};

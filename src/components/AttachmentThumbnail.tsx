import React, { useState, useEffect } from 'react';
import { FileCheck, AlertCircle } from 'lucide-react';

interface AttachmentThumbnailProps {
  documentId?: string;
  fileId?: string;
  detectedType?: string;
  fileName: string;
  fallbackUrl?: string;
  projectId?: string;
  compact?: boolean;
}

export const AttachmentThumbnail: React.FC<AttachmentThumbnailProps> = ({
  documentId,
  fileId,
  detectedType,
  fileName,
  fallbackUrl,
  projectId = "1961",
  compact = false,
}) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    const fetchUrl = async () => {
      const id = documentId || fileId;
      if (!id) {
        setSignedUrl(fallbackUrl && !fallbackUrl.startsWith('blob:') ? fallbackUrl : null);
        setLoading(false);
        return;
      }
      try {
        const token = localStorage.getItem("rouanet_auth_token");
        const headers: any = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const configuredBaseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
        const baseUrl = configuredBaseUrl || "/api/v1";
        const res = await fetch(`${baseUrl}/documentos/${encodeURIComponent(id)}/visualizacao?projectId=${encodeURIComponent(projectId)}`, { headers });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        
        if (mounted) {
          setSignedUrl(data.signedUrl || data.signed_url || null);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching signed URL:', err);
        if (mounted) {
          setError(true);
          setLoading(false);
        }
      }
    };
    fetchUrl();
    return () => { mounted = false; };
  }, [documentId, fileId, fallbackUrl, projectId]);

  const sizeClass = compact ? "h-12 w-10" : "w-full h-32";
  if (loading) return <div className={`${sizeClass} bg-slate-800 animate-pulse rounded-lg flex items-center justify-center text-[9px] text-slate-500`}>...</div>;
  if (error || !signedUrl) return (
    <div className={`${sizeClass} bg-slate-900 rounded-lg flex flex-col items-center justify-center text-[9px] text-slate-500 border border-slate-800`} title="Arquivo ainda não foi salvo online ou a sessão expirou.">
      <AlertCircle className="w-4 h-4 mb-1 text-slate-600" />
      {!compact && <span>Prévia indisponível</span>}
    </div>
  );

  const isPdf = fileName.toLowerCase().endsWith('.pdf') || detectedType === 'PDF' || detectedType === 'application/pdf';
  const isImage = /\.(jpeg|jpg|gif|png|webp)$/i.test(fileName) || detectedType?.startsWith('image/');

  if (isImage) {
    return (
      <a href={signedUrl} target="_blank" rel="noreferrer" className={`block ${sizeClass} overflow-hidden rounded-lg border border-slate-700 hover:border-emerald-500 transition`}>
        <img src={signedUrl} alt={fileName} loading="lazy" className="w-full h-full object-cover" />
      </a>
    );
  }

  if (isPdf) {
    return (
      <a href={signedUrl} target="_blank" rel="noreferrer" className={`block ${sizeClass} overflow-hidden rounded-lg border border-slate-700 hover:border-emerald-500 transition relative group`}>
        <iframe src={signedUrl + "#view=FitH"} title={fileName} className="w-full h-full pointer-events-none" />
        <div className="absolute inset-0 bg-transparent group-hover:bg-slate-900/20 transition cursor-pointer" />
      </a>
    );
  }

  // Fallback for other files
  return (
    <a href={signedUrl} target="_blank" rel="noreferrer" className={`${sizeClass} bg-slate-900 rounded-lg flex flex-col items-center justify-center text-xs text-slate-400 border border-slate-700 hover:border-emerald-500 hover:text-emerald-400 transition`}>
      <FileCheck className="w-8 h-8 mb-2" />
      <span className="px-4 text-center break-all line-clamp-2">Abrir {fileName}</span>
    </a>
  );
};


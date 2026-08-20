import { useEffect, useState } from "react";
import type { ImportProgressState } from "./importTypes";
import { getImportStatus } from "./importApi";

export interface UseImportProgressProps {
  importacaoId?: string | null;
  accessToken?: string | null;
  pollingIntervalMs?: number;
  enabled?: boolean;
}

export function useImportProgress({
  importacaoId,
  accessToken,
  pollingIntervalMs = 3000,
  enabled = true,
}: UseImportProgressProps) {
  const [progress, setProgress] = useState<ImportProgressState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!enabled || !importacaoId || !accessToken) {
      return;
    }

    let isMounted = true;
    let timer: any = null;

    const fetchStatus = async () => {
      try {
        setIsLoading(true);
        const data = await getImportStatus(importacaoId, accessToken);
        if (isMounted) {
          setProgress(data);
          setError(null);
          if (data.status === "RECEIVING" || data.status === "PROCESSING") {
            timer = setTimeout(fetchStatus, pollingIntervalMs);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Erro ao monitorar progresso");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchStatus();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [importacaoId, accessToken, pollingIntervalMs, enabled]);

  return { progress, error, isLoading };
}

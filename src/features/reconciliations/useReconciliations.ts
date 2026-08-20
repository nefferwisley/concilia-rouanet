import { useEffect, useState } from "react";
import type { ReconciliationItem } from "./reconciliationTypes";
import { fetchReconciliations } from "./reconciliationApi";

export function useReconciliations(
  projectId?: string | null,
  accessToken?: string | null,
  filters: { status?: string; search?: string } = {},
) {
  const [items, setItems] = useState<ReconciliationItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId || !accessToken) {
      setItems([]);
      setTotalCount(0);
      return;
    }

    let isMounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchReconciliations(projectId, accessToken, filters);
        if (isMounted) {
          setItems(data.items);
          setTotalCount(data.totalCount);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Erro ao carregar lançamentos");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [projectId, accessToken, filters.status, filters.search]);

  return { items, totalCount, loading, error };
}

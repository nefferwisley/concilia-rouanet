import React, { useEffect, useState } from "react";
import { AlertCircle, AlertTriangle, Info, CheckCircle } from "lucide-react";
import type { IssueItem } from "../documents/documentApi";
import { fetchProjectIssues } from "../documents/documentApi";

export interface IssueListProps {
  projectId: string;
  accessToken: string;
  api?: {
    fetchIssues: (projectId: string, token: string) => Promise<IssueItem[]>;
  };
}

export const IssueList: React.FC<IssueListProps> = ({
  projectId,
  accessToken,
  api = { fetchIssues: fetchProjectIssues },
}) => {
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    api
      .fetchIssues(projectId, accessToken)
      .then((res) => {
        if (isMounted) {
          setIssues(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [projectId, accessToken, api]);

  const renderSeverityBadge = (severity: string) => {
    switch (severity) {
      case "BLOCKER":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-500/10 text-red-400 border border-red-500/20 font-semibold">
            <AlertCircle className="w-3 h-3" /> Bloqueante
          </span>
        );
      case "WARNING":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
            <AlertTriangle className="w-3 h-3" /> Atenção
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Info className="w-3 h-3" /> Informativo
          </span>
        );
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-slate-400 text-xs">Carregando pendências...</div>;
  }

  if (issues.length === 0) {
    return (
      <div className="p-6 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
        <CheckCircle className="w-6 h-6 text-emerald-400" />
        <span>Nenhuma pendência regulatória aberta no projeto.</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {issues.map((issue) => (
        <div
          key={issue.id}
          className="p-3 bg-slate-900/60 border border-white/10 rounded-lg flex items-start justify-between gap-3"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs text-white">[{issue.issueCode}]</span>
              {renderSeverityBadge(issue.severity)}
            </div>
            <p className="text-xs text-slate-300">{issue.description}</p>
          </div>
          <span className="text-[10px] text-slate-500 font-mono shrink-0">
            {new Date(issue.createdAt).toLocaleDateString("pt-BR")}
          </span>
        </div>
      ))}
    </div>
  );
};

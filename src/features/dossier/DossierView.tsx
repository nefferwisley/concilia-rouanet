import React, { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, FileCheck, Hash, Download } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface DossierReadinessData {
  ready: boolean;
  projectId: string;
  packageName: string;
  packageVersion: string;
  totalReconciliations: number;
  approvedReconciliations: number;
  blockers: Array<{
    issueCode: string;
    severity: string;
    description: string;
  }>;
}

export interface DossierSnapshotData {
  snapshotId: string;
  projectId: string;
  packageName: string;
  packageVersion: string;
  sha256Hash: string;
  createdAt: string;
}

export interface DossierViewProps {
  projectId: string;
  accessToken: string;
  api?: {
    fetchReadiness: (projectId: string, token: string) => Promise<DossierReadinessData>;
    generateSnapshot: (projectId: string, token: string) => Promise<DossierSnapshotData>;
  };
}

const defaultApi = {
  fetchReadiness: async (projectId: string, token: string): Promise<DossierReadinessData> => {
    const res = await fetch(`${API_URL}/api/v1/projetos/${projectId}/dossier/readiness`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Erro ao carregar prontidão do dossiê.");
    const data = await res.json();
    return {
      ready: data.ready,
      projectId: data.project_id,
      packageName: data.package_name,
      packageVersion: data.package_version,
      totalReconciliations: data.total_reconciliations,
      approvedReconciliations: data.approved_reconciliations,
      blockers: data.blockers.map((b: any) => ({
        issueCode: b.issue_code,
        severity: b.severity,
        description: b.description,
      })),
    };
  },
  generateSnapshot: async (projectId: string, token: string): Promise<DossierSnapshotData> => {
    const res = await fetch(`${API_URL}/api/v1/projetos/${projectId}/dossier/snapshots`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Erro ao gerar snapshot do dossiê.");
    const data = await res.json();
    return {
      snapshotId: data.snapshot_id,
      projectId: data.project_id,
      packageName: data.package_name,
      packageVersion: data.package_version,
      sha256Hash: data.sha256_hash,
      createdAt: data.created_at,
    };
  },
};

export const DossierView: React.FC<DossierViewProps> = ({
  projectId,
  accessToken,
  api = defaultApi,
}) => {
  const [readiness, setReadiness] = useState<DossierReadinessData | null>(null);
  const [snapshot, setSnapshot] = useState<DossierSnapshotData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);

  const load = () => {
    setLoading(true);
    api
      .fetchReadiness(projectId, accessToken)
      .then((data) => {
        setReadiness(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [projectId, accessToken]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const res = await api.generateSnapshot(projectId, accessToken);
      setSnapshot(res);
    } catch (err) {
      // erro tratado no estado
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400 text-sm">Avaliando conformidade regulatória...</div>;
  }

  if (!readiness) {
    return <div className="p-8 text-center text-slate-500 text-sm">Não foi possível carregar o status do dossiê.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Card de Status de Conformidade */}
      <div className={`p-6 rounded-xl border ${readiness.ready ? "bg-emerald-500/10 border-emerald-500/30" : "bg-slate-900/60 border-white/10"}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {readiness.ready ? (
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-8 h-8 text-amber-400" />
            )}
            <div>
              <h3 className="text-lg font-bold text-white">
                {readiness.ready ? "Projeto Conforme — Pronto para Prestação de Contas" : "Conformidade Regulatória Pendente"}
              </h3>
              <p className="text-xs text-slate-400">
                Pacote Regulatório: <span className="font-semibold text-slate-200">{readiness.packageName} (v{readiness.packageVersion})</span>
              </p>
            </div>
          </div>
          <div className="text-right font-mono text-xs text-slate-300">
            <div>Lançamentos Aprovados: {readiness.approvedReconciliations} / {readiness.totalReconciliations}</div>
          </div>
        </div>

        {/* Lista de Bloqueios se houver */}
        {!readiness.ready && readiness.blockers.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
            <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider">
              Pendências Bloqueantes ({readiness.blockers.length})
            </h4>
            <div className="space-y-1.5">
              {readiness.blockers.map((b, idx) => (
                <div key={idx} className="text-xs text-slate-300 flex items-start gap-2 bg-red-500/5 p-2 rounded border border-red-500/10">
                  <span className="font-mono font-bold text-red-400">[{b.issueCode}]</span>
                  <span>{b.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botão de Ação */}
        <div className="mt-6 flex items-center justify-end">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!readiness.ready || generating}
            className={`px-4 py-2 rounded-lg font-medium text-xs flex items-center gap-2 transition-colors ${
              readiness.ready && !generating
                ? "bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-500/20"
                : "bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed"
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>{generating ? "Congelando Dossiê..." : "Emitir Dossiê Oficial"}</span>
          </button>
        </div>
      </div>

      {/* Snapshot Gerado */}
      {snapshot && (
        <div className="p-6 rounded-xl bg-slate-900/80 border border-emerald-500/30 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <Hash className="w-5 h-5" />
            <span>Snapshot Oficial Imutável Emitido com Sucesso</span>
          </div>
          <div className="font-mono text-xs bg-slate-950 p-3 rounded border border-white/10 text-emerald-300 break-all">
            SHA-256: {snapshot.sha256Hash}
          </div>
          <div className="text-[11px] text-slate-400">
            ID do Snapshot: {snapshot.snapshotId} • Registrado em: {new Date(snapshot.createdAt).toLocaleString("pt-BR")}
          </div>
        </div>
      )}
    </div>
  );
};

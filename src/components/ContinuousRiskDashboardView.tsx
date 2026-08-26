import React from "react";
import { PronacProject, AuditAlert } from "../types";
import { AlertTriangle, Activity, CheckCircle2 } from "lucide-react";
import { formatCurrency, formatDate } from "../utils/formatters";

interface ContinuousRiskDashboardViewProps {
  project: PronacProject;
  alerts: AuditAlert[];
}

export const ContinuousRiskDashboardView: React.FC<ContinuousRiskDashboardViewProps> = ({ project, alerts }) => {
  const openAlerts = alerts.filter(a => !a.resolvido);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-rose-400" /> Painel de Risco Contínuo
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitoramento em tempo real de não conformidades (IN MinC nº 01/2023). PRONAC: {project.pronac}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <h3 className="text-xs text-slate-400 uppercase tracking-wider">Alertas Ativos</h3>
          <p className="text-3xl font-bold text-rose-400 mt-2">{openAlerts.length}</p>
        </div>
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <h3 className="text-xs text-slate-400 uppercase tracking-wider">Status Geral</h3>
          <p className="text-xl font-bold text-slate-200 mt-2">
            {openAlerts.length > 0 ? "Risco Detectado" : "Conforme"}
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-md font-bold text-slate-200 flex items-center gap-2">
            Detalhamento de Riscos
          </h2>
        </div>
        {openAlerts.length === 0 ? (
          <div className="p-6 text-center text-emerald-400 flex flex-col items-center">
            <CheckCircle2 className="w-8 h-8 mb-2" />
            <p>Nenhum alerta ativo. Execução em conformidade com as regras.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {openAlerts.map(alert => (
              <div key={alert.id} className="p-4 flex flex-col md:flex-row gap-4 justify-between items-start">
                <div>
                  <h4 className="text-sm font-bold text-rose-300">{alert.titulo}</h4>
                  <p className="text-xs text-slate-400 mt-1">{alert.descricao}</p>
                  <span className="text-[10px] text-slate-500 mt-2 block">Categoria: {alert.categoria}</span>
                </div>
                <div>
                   <span className="px-2 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] rounded uppercase">
                     Nível: {alert.gravidade}
                   </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

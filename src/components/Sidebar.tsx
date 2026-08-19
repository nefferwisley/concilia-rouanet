import React from "react";
import {
  LayoutDashboard,
  Coins,
  ArrowLeftRight,
  Receipt,
  ShieldCheck,
  FileSpreadsheet,
  Bot,
  Calculator,
  Calendar,
  Building2,
  Split,
  X,
} from "lucide-react";
import { PronacProject, AuditAlert } from "../types";
import { formatCurrency, formatDate } from "../utils/formatters";

export type ActiveTab =
  | "dashboard"
  | "reviewWorkflow"
  | "tripartite"
  | "reconciliation_core"
  | "budget"
  | "reconciliation"
  | "documents"
  | "audit"
  | "salic"
  | "advisor"
  | "simulator";

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  activeProject: PronacProject;
  alerts: AuditAlert[];
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  activeProject,
  alerts,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const unresolvedCount = alerts.filter((a) => !a.resolvido).length;

  const navItems = [
    {
      id: "dashboard" as ActiveTab,
      label: "Painel Executivo",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: "reviewWorkflow" as ActiveTab,
      label: "Esteira de Revisão (6 Etapas)",
      icon: ShieldCheck,
      badge: "Procedimento",
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    },
    {
      id: "tripartite" as ActiveTab,
      label: "Conciliação Tripartite",
      icon: Split,
      badge: "Manual MinC",
      badgeColor: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
    },
    {
      id: "reconciliation_core" as ActiveTab,
      label: "Motor & Skills (TigerBeetle / Splink)",
      icon: ShieldCheck,
      badge: "NEW",
      badgeColor: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
    },
    {
      id: "budget" as ActiveTab,
      label: "Plano de Trabalho & Rubricas",
      icon: Coins,
      badge: null,
    },
    {
      id: "reconciliation" as ActiveTab,
      label: "Extrato & Conciliação Bancária",
      icon: ArrowLeftRight,
      badge: "BB",
    },
    {
      id: "documents" as ActiveTab,
      label: "Documentos Fiscais & OCR",
      icon: Receipt,
      badge: null,
    },
    {
      id: "audit" as ActiveTab,
      label: "Auditoria IA & Regras MinC",
      icon: ShieldCheck,
      badge: unresolvedCount > 0 ? unresolvedCount : null,
      badgeColor: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
    },
    {
      id: "salic" as ActiveTab,
      label: "Relatório & Dossiê SALIC",
      icon: FileSpreadsheet,
      badge: "Export",
    },
    {
      id: "advisor" as ActiveTab,
      label: "Consultor Virtual Rouanet IA",
      icon: Bot,
      badge: "IA",
      badgeColor: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
    },
    {
      id: "simulator" as ActiveTab,
      label: "Simulador de Patrocínio",
      icon: Calculator,
      badge: "Art. 18",
    },
  ];

  const handleTabClick = (tab: ActiveTab) => {
    onSelectTab(tab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full overflow-y-auto">
      {/* Top Nav List */}
      <div className="p-3 space-y-1">
        <div className="flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          <span>Módulos do Sistema</span>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg"
              title="Fechar menu"
              aria-label="Fechar menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition min-h-[44px] ${
                isActive
                  ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-slate-950" : "text-slate-400"}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${
                    isActive
                      ? "bg-slate-950/20 text-slate-950"
                      : item.badgeColor || "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom PRONAC Info Card */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 m-2 rounded-xl">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
          <span className="font-semibold text-slate-200 flex items-center gap-1 truncate">
            <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> PRONAC {activeProject.pronac}
          </span>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
            {activeProject.artigoEnquadramento.split(" ")[0]}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-2 font-medium">
          {activeProject.nome}
        </p>

        <div className="space-y-1 text-[11px] bg-slate-900 p-2 rounded-lg border border-slate-800">
          <div className="flex justify-between text-slate-400">
            <span>Aprovado:</span>
            <span className="font-mono text-slate-200">{formatCurrency(activeProject.valorAprovado)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Captado:</span>
            <span className="font-mono text-emerald-400 font-semibold">
              {formatCurrency(activeProject.valorCaptado)}
            </span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Executado:</span>
            <span className="font-mono text-slate-300">{formatCurrency(activeProject.valorExecutado)}</span>
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" /> Fim Prestação:
          </span>
          <span className="font-semibold text-amber-400">{formatDate(activeProject.prazoLimitePrestacao)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden md:flex w-64 bg-slate-900/95 border-r border-slate-800 text-slate-300 flex-col shrink-0 min-h-[calc(100vh-4rem)]">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (visible when isMobileOpen is true) */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="relative w-4/5 max-w-xs bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

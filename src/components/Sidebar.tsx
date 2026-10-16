import React from "react";
import {
  LayoutDashboard,
  ListChecks,
  Split,
  Cpu,
  Coins,
  Landmark,
  Receipt,
  ShieldAlert,
  FileSpreadsheet,
  Bot,
  Calculator,
  HandCoins,
  Gauge,
  Calendar,
  Building2,
  X,
  type LucideIcon,
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
  | "simulator"
  | "sponsorship"
  | "risk_dashboard";

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  activeProject: PronacProject;
  alerts: AuditAlert[];
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: LucideIcon;
  badge: string | number | null;
  badgeColor?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
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

  // Items grouped in the exact same id order as before, keeping every entry.
  const navSections: NavSection[] = [
    {
      title: "Visão Geral",
      items: [
        {
          id: "dashboard",
          label: "Painel Executivo",
          icon: LayoutDashboard,
          badge: null,
        },
      ],
    },
    {
      title: "Conciliação & Auditoria",
      items: [
        {
          id: "reviewWorkflow",
          label: "Esteira de Revisão (6 Etapas)",
          icon: ListChecks,
          badge: "Procedimento",
          badgeColor: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
        },
        {
          id: "tripartite",
          label: "Conciliação Tripartite",
          icon: Split,
          badge: "Manual MinC",
          badgeColor: "border-teal-500/30 bg-teal-500/15 text-teal-300",
        },
        {
          id: "reconciliation_core",
          label: "Motor & Skills (TigerBeetle / Splink)",
          icon: Cpu,
          badge: "NEW",
          badgeColor: "border-purple-500/30 bg-purple-500/15 text-purple-300",
        },
        {
          id: "budget",
          label: "Plano de Trabalho & Rubricas",
          icon: Coins,
          badge: null,
        },
        {
          id: "reconciliation",
          label: "Extrato & Conciliação Bancária",
          icon: Landmark,
          badge: "BB",
          badgeColor: "border-sky-500/30 bg-sky-500/15 text-sky-300",
        },
        {
          id: "documents",
          label: "Documentos Fiscais & OCR",
          icon: Receipt,
          badge: null,
        },
        {
          id: "audit",
          label: "Auditoria IA & Regras MinC",
          icon: ShieldAlert,
          badge: unresolvedCount > 0 ? unresolvedCount : null,
          badgeColor: "border-amber-500/30 bg-amber-500/15 text-amber-300",
        },
      ],
    },
    {
      title: "Relatórios & IA",
      items: [
        {
          id: "salic",
          label: "Relatório & Dossiê SALIC",
          icon: FileSpreadsheet,
          badge: "Export",
          badgeColor: "border-slate-600/60 bg-slate-700/40 text-slate-300",
        },
        {
          id: "advisor",
          label: "Consultor Virtual Rouanet IA",
          icon: Bot,
          badge: "IA",
          badgeColor: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
        },
        {
          id: "simulator",
          label: "Simulador de Patrocínio",
          icon: Calculator,
          badge: "Art. 18",
          badgeColor: "border-cyan-500/30 bg-cyan-500/15 text-cyan-300",
        },
        {
          id: "sponsorship",
          label: "Módulo de Captação & Recibos",
          icon: HandCoins,
          badge: "NOVO",
          badgeColor: "border-blue-500/30 bg-blue-500/15 text-blue-300",
        },
        {
          id: "risk_dashboard",
          label: "Painel de Risco Contínuo",
          icon: Gauge,
          badge: "ALERTA",
          badgeColor: "border-red-500/30 bg-red-500/15 text-red-300",
        },
      ],
    },
  ];

  const handleTabClick = (tab: ActiveTab) => {
    onSelectTab(tab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700/60 [&::-webkit-scrollbar-thumb:hover]:bg-emerald-500/50">
      {/* Top Nav List */}
      <div className="p-3">
        <div className="flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          <span>Módulos do Sistema</span>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden text-slate-400 hover:text-white hover:bg-slate-800 p-1 rounded-lg transition-colors"
              title="Fechar menu"
              aria-label="Fechar menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <nav role="navigation" aria-label="Módulos do sistema" className="mt-1 space-y-4">
          {navSections.map((section) => (
            <div key={section.title}>
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabClick(item.id)}
                      aria-current={isActive ? "page" : undefined}
                      className={`group relative w-full flex items-center gap-2.5 pl-3.5 pr-2.5 py-2.5 rounded-xl text-left text-xs transition min-h-[44px] ${
                        isActive
                          ? "bg-emerald-500/10 text-emerald-50 font-semibold shadow-sm shadow-emerald-950/40"
                          : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                      }`}
                    >
                      {/* Active left indicator bar */}
                      {isActive && (
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-emerald-400"
                        />
                      )}
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? "text-emerald-300" : "text-slate-400 group-hover:text-slate-200"
                        }`}
                      />
                      <span className="min-w-0 flex-1 truncate" title={item.label}>
                        {item.label}
                      </span>
                      {item.badge !== null && (
                        <span
                          className={`shrink-0 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10px] font-semibold leading-4 ${
                            isActive
                              ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-100"
                              : item.badgeColor || "border-slate-700 bg-slate-800 text-slate-400"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom PRONAC Info Card */}
      <div className="p-3 border-t border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 m-2 rounded-xl">
        <div className="flex items-center justify-between gap-2 text-xs text-slate-400 mb-1.5">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5 min-w-0">
            <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate" title={`PRONAC ${activeProject.pronac}`}>
              PRONAC {activeProject.pronac}
            </span>
          </span>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
            {activeProject.artigoEnquadramento.split(" ")[0]}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-2 font-medium">
          {activeProject.nome}
        </p>

        <div className="space-y-1.5 text-[11px] bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
          <div className="flex justify-between items-baseline gap-2 text-slate-400">
            <span>Aprovado:</span>
            <span className="font-mono text-slate-200">{formatCurrency(activeProject.valorAprovado)}</span>
          </div>
          <div className="flex justify-between items-baseline gap-2 text-slate-400">
            <span>Captado:</span>
            <span className="font-mono text-emerald-400 font-semibold">
              {formatCurrency(activeProject.valorCaptado)}
            </span>
          </div>
          <div className="flex justify-between items-baseline gap-2 text-slate-400">
            <span>Executado:</span>
            <span className="font-mono text-slate-300">
              {activeProject.resumoFinanceiroValidado?.totalExecutado != null || activeProject.valorExecutado != null
                ? formatCurrency(activeProject.resumoFinanceiroValidado?.totalExecutado ?? activeProject.valorExecutado ?? 0)
                : "Não informado"}
            </span>
          </div>
          <div className="flex justify-between items-baseline gap-2 text-amber-400 pt-1.5 border-t border-slate-800/60">
            <span>Pendente:</span>
            <span className="font-mono font-semibold">
              {activeProject.resumoFinanceiroValidado?.totalAConciliar != null
                ? formatCurrency(activeProject.resumoFinanceiroValidado.totalAConciliar)
                : activeProject.resumoFinanceiroValidado?.totalExecutado != null || activeProject.valorExecutado != null
                  ? formatCurrency(
                      (activeProject.resumoFinanceiroValidado?.totalExecutado ?? activeProject.valorExecutado ?? 0) -
                        (activeProject.resumoFinanceiroValidado?.totalConciliado ?? 0)
                    )
                  : "Não informado"}
            </span>
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[10px] text-slate-400">
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
      <aside
        aria-label="Navegação lateral"
        className="hidden md:flex w-72 bg-slate-900/95 border-r border-slate-800 text-slate-300 flex-col shrink-0 min-h-[calc(100vh-4rem)]"
      >
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

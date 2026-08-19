import React, { useState, useEffect } from "react";
import {
  FileText,
  ShieldAlert,
  Download,
  PlusCircle,
  FolderUp,
  Building,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Menu,
  X,
  ChevronDown,
  Cpu,
  Server,
} from "lucide-react";
import { PronacProject, AuditAlert } from "../types";
import { formatCurrency, formatDate } from "../utils/formatters";
import { apiClient, BackendStatus } from "../services/apiClient";

interface NavbarProps {
  projects: PronacProject[];
  activeProject: PronacProject;
  onSelectProject: (proj: PronacProject) => void;
  onOpenNewProjectModal: () => void;
  onOpenDriveImportModal: () => void;
  onOpenLangChainModal?: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  onRunAiAudit: () => void;
  isAuditing: boolean;
  alerts: AuditAlert[];
  onToggleMobileMenu: () => void;
  isMobileMenuOpen: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  projects,
  activeProject,
  onSelectProject,
  onOpenNewProjectModal,
  onOpenDriveImportModal,
  onOpenLangChainModal,
  onExportExcel,
  onExportPdf,
  onRunAiAudit,
  isAuditing,
  alerts,
  onToggleMobileMenu,
  isMobileMenuOpen,
}) => {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>({ online: false });
  const unresolvedAlerts = alerts.filter((a) => !a.resolvido);
  const criticalCount = unresolvedAlerts.filter((a) => a.gravidade === "ALTA").length;

  useEffect(() => {
    let isMounted = true;
    const check = async () => {
      const status = await apiClient.checkHealth();
      if (isMounted) setBackendStatus(status);
    };
    check();
    const interval = setInterval(check, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 text-slate-100 shadow-md">
      <div className="w-full px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Left: Mobile Menu Button + Logo */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Hamburger button on mobile */}
            <button
              onClick={onToggleMobileMenu}
              className="md:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[40px] min-h-[40px] flex items-center justify-center"
              aria-label="Abrir Menu Principal"
              title="Abrir Menu Principal"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-emerald-400" />
              ) : (
                <Menu className="w-5 h-5 text-emerald-400" />
              )}
            </button>

            {/* Logo */}
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-bold shrink-0">
              <FileText className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-bold text-sm sm:text-lg tracking-tight text-white whitespace-nowrap">
                  Concilia Rouanet
                </span>
                <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap">
                  MinC • SALIC
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 hidden sm:block">
                Prestação de Contas & Auditoria Preventiva IA
              </p>
            </div>
          </div>

          {/* Center: Desktop Project Selector */}
          <div className="hidden md:flex items-center space-x-2 lg:space-x-3">
            <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-1 flex items-center">
              <span className="text-xs font-medium text-slate-400 px-2 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-emerald-400" /> PRONAC:
              </span>
              <select
                id="pronac-project-select"
                aria-label="Selecionar Projeto PRONAC"
                value={activeProject.id}
                onChange={(e) => {
                  const selected = projects.find((p) => p.id === e.target.value);
                  if (selected) onSelectProject(selected);
                }}
                className="bg-slate-900 text-white text-xs font-semibold rounded-lg px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-[200px] lg:max-w-[280px] truncate"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.pronac} - {p.nome}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onOpenNewProjectModal}
              title="Cadastrar Novo Projeto PRONAC"
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-2 rounded-xl flex items-center gap-1 transition"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden lg:inline">Novo</span>
            </button>

            <button
              onClick={onOpenDriveImportModal}
              title="Importar Projeto do Google Drive"
              className="text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-2 rounded-xl flex items-center gap-1.5 transition font-semibold"
            >
              <FolderUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden lg:inline">Importar Drive</span>
            </button>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Backend status pill */}
            <div
              className={`hidden md:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition ${
                backendStatus.online
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-slate-800/80 border-slate-700 text-slate-400"
              }`}
              title={
                backendStatus.online
                  ? "Backend FastAPI e PostgreSQL ativos (Porta 8000)"
                  : "Modo Offline (Persistência em LocalStorage Ativa)"
              }
            >
              <Server className={`w-3.5 h-3.5 ${backendStatus.online ? "text-emerald-400" : "text-slate-500"}`} />
              <span className="text-[11px] font-medium">
                {backendStatus.online ? "FastAPI Online" : "LocalStorage"}
              </span>
            </div>

            {/* Health pill - Desktop only */}
            <div
              className={`hidden xl:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
                criticalCount > 0
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              }`}
            >
              {criticalCount > 0 ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                  <span>{criticalCount} Alerta(s) MinC</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Conformidade SALIC OK</span>
                </>
              )}
            </div>

            {onOpenLangChainModal && (
              <button
                onClick={onOpenLangChainModal}
                title="Sistema LangChain de Autocorreção e Avaliação RAG"
                className="text-[11px] sm:text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold px-2.5 sm:px-3 py-2 rounded-xl flex items-center gap-1.5 transition min-h-[38px]"
              >
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">LangChain & RAG</span>
              </button>
            )}

            {/* Run AI Audit Button */}
            <button
              onClick={onRunAiAudit}
              disabled={isAuditing}
              className="text-[11px] sm:text-xs bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold px-2.5 sm:px-3 py-2 rounded-xl flex items-center gap-1 sm:gap-1.5 shadow transition disabled:opacity-50 min-h-[38px]"
              title="Executar Auditoria Preventiva MinC com IA"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAuditing ? "animate-spin" : ""}`} />
              <span className="whitespace-nowrap">{isAuditing ? "Auditando..." : "Auditoria IA"}</span>
            </button>

            {/* Quick Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsExportOpen(!isExportOpen)}
                className="text-[11px] sm:text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2 sm:px-3 py-2 rounded-xl flex items-center gap-1 transition min-h-[38px]"
                title="Exportar dados do SALIC"
              >
                <Download className="w-3.5 h-3.5 text-slate-300" />
                <span className="hidden sm:inline">Exportar</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isExportOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsExportOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                      Formatos de Exportação
                    </div>
                    <button
                      onClick={() => {
                        setIsExportOpen(false);
                        onExportExcel();
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <span className="font-semibold block">Planilha Excel</span>
                        <span className="text-[10px] text-slate-400 block">5 Abas Tripartite (.xlsx)</span>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setIsExportOpen(false);
                        onExportPdf();
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2 border-t border-slate-800"
                    >
                      <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                      <div>
                        <span className="font-semibold block">Dossiê Oficial PDF</span>
                        <span className="text-[10px] text-slate-400 block">Relatório de Conformidade</span>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Project Selector Bar (visible only on mobile screens < md) */}
        <div className="md:hidden py-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-300 min-w-0 flex-1">
            <Building className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <select
              aria-label="Selecionar Projeto PRONAC"
              value={activeProject.id}
              onChange={(e) => {
                const selected = projects.find((p) => p.id === e.target.value);
                if (selected) onSelectProject(selected);
              }}
              className="bg-slate-950 text-white text-xs font-semibold rounded-lg px-2 py-1.5 border border-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full truncate"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.pronac} - {p.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onOpenNewProjectModal}
              className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2 py-1.5 rounded-lg flex items-center gap-1"
              title="Novo Projeto PRONAC"
            >
              <PlusCircle className="w-3 h-3 text-emerald-400" />
              <span>Novo</span>
            </button>

            <button
              onClick={onOpenDriveImportModal}
              className="text-[11px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-1.5 rounded-lg flex items-center gap-1 font-semibold"
              title="Importar do Google Drive"
            >
              <FolderUp className="w-3 h-3 text-emerald-400" />
              <span>Drive</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

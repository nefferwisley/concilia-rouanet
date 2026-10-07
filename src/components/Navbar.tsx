import React, { useState } from "react";
import {
  FileText,
  ShieldAlert,
  Download,
  PlusCircle,
  FolderUp,
  Building,
  Calendar,
  Sparkles,
  AlertTriangle,
  Menu,
  X,
  ChevronDown,
  Cpu,
  Trash2,
  MoreHorizontal,
  RotateCcw,
} from "lucide-react";
import { PronacProject, AuditAlert, UserRole } from "../types";

interface NavbarProps {
  projects: PronacProject[];
  activeProject: PronacProject;
  onSelectProject: (proj: PronacProject) => void;
  onOpenNewProjectModal: () => void;
  onRestoreOriginalData: () => void;
  onDeleteActiveProject: () => void;
  canDeleteActiveProject: boolean;
  onOpenDriveImportModal: () => void;
  onOpenLangChainModal?: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  onRunAiAudit: () => void;
  isAuditing: boolean;
  alerts: AuditAlert[];
  onToggleMobileMenu: () => void;
  isMobileMenuOpen: boolean;
  rulesContext: "SALIC" | "FSA_ANCINE";
  onRulesContextChange: (context: "SALIC" | "FSA_ANCINE") => void;
  userRole: UserRole;
  onUserRoleChange: (role: UserRole) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  projects,
  activeProject,
  onSelectProject,
  onOpenNewProjectModal,
  onRestoreOriginalData,
  onDeleteActiveProject,
  canDeleteActiveProject,
  onOpenDriveImportModal,
  onOpenLangChainModal,
  onExportExcel,
  onExportPdf,
  onRunAiAudit,
  isAuditing,
  alerts,
  onToggleMobileMenu,
  isMobileMenuOpen,
  rulesContext,
  onRulesContextChange,
  userRole,
  onUserRoleChange,
}) => {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const unresolvedAlerts = alerts.filter((a) => !a.resolvido);
  const criticalCount = unresolvedAlerts.filter((a) => a.gravidade === "ALTA").length;

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 text-slate-100 shadow-md">
      <div className="w-full px-3 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-2">
          {/* Left: Mobile Menu Button + Logo */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
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

            <span className="hidden truncate text-sm font-bold tracking-tight text-white sm:inline lg:text-base">
              Concilia Rouanet
            </span>
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
              onClick={onOpenDriveImportModal}
              title="Importar Projeto do Google Drive"
              className="text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-2 rounded-xl flex items-center gap-1.5 transition font-semibold"
            >
              <FolderUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden lg:inline">Importar Drive/Pasta</span>
            </button>

          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Run AI Audit Button */}
            <button
              onClick={onRunAiAudit}
              disabled={isAuditing}
              className="text-[11px] sm:text-xs bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold px-2.5 sm:px-3 py-2 rounded-xl flex items-center gap-1 sm:gap-1.5 shadow transition disabled:opacity-50 min-h-[38px]"
              title="Executar Auditoria Preventiva MinC com IA"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAuditing ? "animate-spin" : ""}`} />
              {criticalCount > 0 && !isAuditing && <AlertTriangle className="h-3.5 w-3.5" />}
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

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMoreOpen((open) => !open)}
                aria-expanded={isMoreOpen}
                aria-label="Mais ações"
                title="Mais ações"
                className="flex min-h-[38px] items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-2 py-2 text-slate-200 transition hover:bg-slate-700 sm:px-3"
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="hidden text-xs lg:inline">Mais</span>
              </button>

              {isMoreOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsMoreOpen(false)} />
                  <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 py-1.5 shadow-2xl">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreOpen(false);
                        onOpenNewProjectModal();
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800"
                    >
                      <PlusCircle className="h-4 w-4 text-emerald-400" /> Novo projeto
                    </button>
                    {onOpenLangChainModal && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreOpen(false);
                          onOpenLangChainModal();
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800"
                      >
                        <Cpu className="h-4 w-4 text-emerald-400" /> Autocorreção e RAG
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreOpen(false);
                        onRestoreOriginalData();
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800"
                    >
                      <RotateCcw className="h-4 w-4 text-slate-400" /> Restaurar dados originais
                    </button>
                    <div className="space-y-2 border-t border-slate-800 px-3 py-3">
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Regras aplicáveis
                        <select
                          value={rulesContext}
                          onChange={(event) => onRulesContextChange(event.target.value as "SALIC" | "FSA_ANCINE")}
                          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs font-medium normal-case tracking-normal text-slate-200 outline-none focus:border-emerald-500"
                        >
                          <option value="SALIC">SALIC / PRONAC</option>
                          <option value="FSA_ANCINE">FSA / ANCINE</option>
                        </select>
                      </label>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Perfil ativo
                        <select
                          value={userRole}
                          onChange={(event) => onUserRoleChange(event.target.value as UserRole)}
                          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs font-medium normal-case tracking-normal text-slate-200 outline-none focus:border-emerald-500"
                        >
                          <option value="ADMIN">Administrador</option>
                          <option value="AUDITOR">Auditor (MinC)</option>
                          <option value="PRODUTOR">Produtor (Agente Cultural)</option>
                        </select>
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreOpen(false);
                        onDeleteActiveProject();
                      }}
                      disabled={!canDeleteActiveProject}
                      className="flex w-full items-center gap-2 border-t border-slate-800 px-3 py-2 text-left text-xs text-rose-300 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" /> Excluir projeto
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

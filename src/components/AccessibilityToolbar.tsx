import React, { useState, useEffect } from "react";
import {
  Sun,
  Moon,
  Type,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Keyboard,
  Eye,
  X,
  Volume2,
  Check,
} from "lucide-react";

interface AccessibilityToolbarProps {
  onNavigateTab?: (tab: string) => void;
}

export const AccessibilityToolbar: React.FC<AccessibilityToolbarProps> = ({ onNavigateTab }) => {
  const [highContrast, setHighContrast] = useState<boolean>(() => {
    return localStorage.getItem("concilia_rouanet_high_contrast") === "true";
  });
  const [fontScale, setFontScale] = useState<number>(() => {
    const saved = localStorage.getItem("concilia_rouanet_font_scale");
    return saved ? parseFloat(saved) : 1;
  });
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // Aplica alto contraste no HTML
  useEffect(() => {
    const root = document.documentElement;
    if (highContrast) {
      root.classList.add("high-contrast");
      localStorage.setItem("concilia_rouanet_high_contrast", "true");
    } else {
      root.classList.remove("high-contrast");
      localStorage.setItem("concilia_rouanet_high_contrast", "false");
    }
  }, [highContrast]);

  // Aplica escala de fonte no :root
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--font-scale", fontScale.toString());
    localStorage.setItem("concilia_rouanet_font_scale", fontScale.toString());
  }, [fontScale]);

  // Atalhos de teclado globais
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora se estiver digitando em input ou textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      if (e.altKey) {
        if (e.key === "c" || e.key === "C") {
          e.preventDefault();
          setHighContrast((prev) => !prev);
        } else if (e.key === "+" || e.key === "=") {
          e.preventDefault();
          setFontScale((prev) => Math.min(prev + 0.1, 1.4));
        } else if (e.key === "-") {
          e.preventDefault();
          setFontScale((prev) => Math.max(prev - 0.1, 0.85));
        } else if (e.key === "0") {
          e.preventDefault();
          setFontScale(1);
        } else if (e.key === "1" && onNavigateTab) {
          e.preventDefault();
          onNavigateTab("dashboard");
        } else if (e.key === "2" && onNavigateTab) {
          e.preventDefault();
          onNavigateTab("reviewWorkflow");
        } else if (e.key === "3" && onNavigateTab) {
          e.preventDefault();
          onNavigateTab("tripartite");
        } else if (e.key === "4" && onNavigateTab) {
          e.preventDefault();
          onNavigateTab("budget");
        } else if (e.key === "5" && onNavigateTab) {
          e.preventDefault();
          onNavigateTab("documents");
        } else if (e.key === "k" || e.key === "K") {
          e.preventDefault();
          setIsShortcutsModalOpen((prev) => !prev);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNavigateTab]);

  return (
    <>
      {/* Top Accessibility Bar (gov.br / eMAG standard) */}
      <div
        role="region"
        aria-label="Barra de Acessibilidade"
        className="bg-slate-950 border-b border-slate-800/80 px-3 sm:px-6 py-1 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2 z-50 select-none"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-300 hidden sm:inline flex items-center gap-1">
            <Eye className="w-3 h-3 text-emerald-400" /> Acessibilidade eMAG / WCAG
          </span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="text-[10px] text-slate-400">
            Atalhos: <kbd className="bg-slate-800 text-slate-300 px-1 py-0.5 rounded border border-slate-700 font-mono">Alt + 1..5</kbd> navegar
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Zoom In / Out / Reset */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setFontScale((prev) => Math.min(prev + 0.1, 1.4))}
              aria-label="Aumentar tamanho do texto (Alt + +)"
              title="Aumentar texto (Alt + +)"
              className="px-2 py-0.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
            >
              A+
            </button>
            <button
              onClick={() => setFontScale(1)}
              aria-label="Tamanho normal do texto (Alt + 0)"
              title="Texto normal (Alt + 0)"
              className="px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
            >
              A
            </button>
            <button
              onClick={() => setFontScale((prev) => Math.max(prev - 0.1, 0.85))}
              aria-label="Diminuir tamanho do texto (Alt + -)"
              title="Diminuir texto (Alt + -)"
              className="px-2 py-0.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
            >
              A-
            </button>
          </div>

          {/* High Contrast Toggle */}
          <button
            onClick={() => setHighContrast((prev) => !prev)}
            aria-pressed={highContrast}
            aria-label="Alternar modo de alto contraste (Alt + C)"
            title="Alto Contraste (Alt + C)"
            className={`px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition ${
              highContrast
                ? "bg-yellow-400 text-black border-yellow-300 font-bold"
                : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
            }`}
          >
            <Sun className="w-3 h-3" />
            <span className="hidden sm:inline">{highContrast ? "Alto Contraste: ON" : "Alto Contraste"}</span>
          </button>

          {/* Shortcuts Modal Trigger */}
          <button
            onClick={() => setIsShortcutsModalOpen(true)}
            aria-label="Ver todos os atalhos de teclado (Alt + K)"
            title="Atalhos de Teclado (Alt + K)"
            className="p-1 sm:px-2 sm:py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white transition flex items-center gap-1 text-xs"
          >
            <Keyboard className="w-3 h-3" />
            <span className="hidden md:inline">Atalhos</span>
          </button>
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      {isShortcutsModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Guia de Atalhos de Teclado"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative">
            <button
              onClick={() => setIsShortcutsModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              aria-label="Fechar modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/30">
                <Keyboard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Guia de Atalhos de Teclado</h3>
                <p className="text-xs text-slate-400">Navegue com velocidade e autonomia total sem mouse</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 space-y-2">
                <div className="text-slate-400 font-bold uppercase text-[10px] tracking-wider text-emerald-400">
                  Navegação Rápida
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-300">Painel Executivo</span>
                    <kbd className="bg-slate-800 text-emerald-400 font-mono px-1.5 py-0.5 rounded border border-slate-700">Alt + 1</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-300">Esteira (6 Etapas)</span>
                    <kbd className="bg-slate-800 text-emerald-400 font-mono px-1.5 py-0.5 rounded border border-slate-700">Alt + 2</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-300">Conciliação 3 Vias</span>
                    <kbd className="bg-slate-800 text-emerald-400 font-mono px-1.5 py-0.5 rounded border border-slate-700">Alt + 3</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-300">Plano de Trabalho</span>
                    <kbd className="bg-slate-800 text-emerald-400 font-mono px-1.5 py-0.5 rounded border border-slate-700">Alt + 4</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-300">Docs Fiscais</span>
                    <kbd className="bg-slate-800 text-emerald-400 font-mono px-1.5 py-0.5 rounded border border-slate-700">Alt + 5</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-300">Atalhos</span>
                    <kbd className="bg-slate-800 text-emerald-400 font-mono px-1.5 py-0.5 rounded border border-slate-700">Alt + K</kbd>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 space-y-2">
                <div className="text-slate-400 font-bold uppercase text-[10px] tracking-wider text-amber-400">
                  Ajustes Visuais
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-300">Alto Contraste</span>
                    <kbd className="bg-slate-800 text-amber-400 font-mono px-1.5 py-0.5 rounded border border-slate-700">Alt + C</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-300">Aumentar Fonte</span>
                    <kbd className="bg-slate-800 text-amber-400 font-mono px-1.5 py-0.5 rounded border border-slate-700">Alt + +</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-300">Diminuir Fonte</span>
                    <kbd className="bg-slate-800 text-amber-400 font-mono px-1.5 py-0.5 rounded border border-slate-700">Alt + -</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-300">Resetar Fonte</span>
                    <kbd className="bg-slate-800 text-amber-400 font-mono px-1.5 py-0.5 rounded border border-slate-700">Alt + 0</kbd>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 text-right">
              <button
                onClick={() => setIsShortcutsModalOpen(false)}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition shadow-lg"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

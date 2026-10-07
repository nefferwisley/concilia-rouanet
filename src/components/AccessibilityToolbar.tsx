import React, { useState, useEffect } from "react";
import {
  Sun,
  Keyboard,
  Eye,
  X,
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
  const [isAccessibilityOpen, setIsAccessibilityOpen] = useState(false);
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
      <div className="fixed bottom-4 right-4 z-50 select-none">
        {isAccessibilityOpen && (
          <>
            <button
              type="button"
              aria-label="Fechar opções de acessibilidade"
              className="fixed inset-0 cursor-default bg-transparent"
              onClick={() => setIsAccessibilityOpen(false)}
            />
            <div
              role="region"
              aria-label="Opções de acessibilidade"
              className="relative z-10 mb-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-slate-700 bg-slate-900 p-3 text-slate-300 shadow-2xl"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-white">Acessibilidade</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAccessibilityOpen(false)}
                  aria-label="Fechar opções de acessibilidade"
                  className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-400">Tamanho do texto</span>
                <div className="flex items-center rounded-lg border border-slate-700 bg-slate-950 p-0.5">
            <button
              onClick={() => setFontScale((prev) => Math.min(prev + 0.1, 1.4))}
              aria-label="Aumentar tamanho do texto (Alt + +)"
              title="Aumentar texto (Alt + +)"
                    className="rounded px-2 py-1 text-xs font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              A+
            </button>
            <button
              onClick={() => setFontScale(1)}
              aria-label="Tamanho normal do texto (Alt + 0)"
              title="Texto normal (Alt + 0)"
                    className="rounded px-2 py-1 text-[10px] text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              A
            </button>
            <button
              onClick={() => setFontScale((prev) => Math.max(prev - 0.1, 0.85))}
              aria-label="Diminuir tamanho do texto (Alt + -)"
              title="Diminuir texto (Alt + -)"
                    className="rounded px-2 py-1 text-xs font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              A-
            </button>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setHighContrast((prev) => !prev)}
                  aria-pressed={highContrast}
                  aria-label="Alternar modo de alto contraste (Alt + C)"
                  title="Alto Contraste (Alt + C)"
                  className={`flex min-h-10 items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition ${
                    highContrast
                      ? "border-yellow-300 bg-yellow-400 font-bold text-black"
                      : "border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <Sun className="h-3.5 w-3.5" />
                  <span>{highContrast ? "Contraste ativo" : "Alto contraste"}</span>
                </button>

                <button
                  onClick={() => {
                    setIsAccessibilityOpen(false);
                    setIsShortcutsModalOpen(true);
                  }}
                  aria-label="Ver todos os atalhos de teclado (Alt + K)"
                  title="Atalhos de Teclado (Alt + K)"
                  className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-slate-300 transition hover:bg-slate-800 hover:text-white"
                >
                  <Keyboard className="h-3.5 w-3.5" />
                  <span>Atalhos</span>
                </button>
              </div>
            </div>
          </>
        )}

        <button
          type="button"
          onClick={() => setIsAccessibilityOpen((open) => !open)}
          aria-expanded={isAccessibilityOpen}
          aria-label="Abrir opções de acessibilidade"
          title="Acessibilidade"
          className="relative z-10 ml-auto flex min-h-11 min-w-11 items-center justify-center rounded-full border border-emerald-500/40 bg-slate-900 text-emerald-400 shadow-xl transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <Eye className="h-5 w-5" />
        </button>
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

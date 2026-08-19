import React, { Component, ReactNode, ErrorInfo } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4 my-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">
              {this.props.fallbackTitle || "Ops! Ocorreu um problema ao renderizar esta seção."}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              {this.state.error?.message ||
                "Ocorreu uma instabilidade nos dados carregados. Clique abaixo para tentar recarregar a visualização."}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                if (this.props.onReset) this.props.onReset();
              }}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-xl transition"
            >
              Recarregar Visualização
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

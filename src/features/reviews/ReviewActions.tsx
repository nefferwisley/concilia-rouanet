import React, { useState } from "react";
import { Check, X, RefreshCw, AlertCircle } from "lucide-react";
import { submitReviewDecision } from "./reviewApi";

export interface ReviewActionsProps {
  reconciliationId: string;
  version: number;
  status: string;
  accessToken: string;
  onSuccess: () => void;
  api?: {
    decide: typeof submitReviewDecision;
  };
}

export const ReviewActions: React.FC<ReviewActionsProps> = ({
  reconciliationId,
  version,
  status,
  accessToken,
  onSuccess,
  api = { decide: submitReviewDecision },
}) => {
  const [reason, setReason] = useState<string>("");
  const [showReasonInput, setShowReasonInput] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<"REJECT" | "REPLACE" | "CORRECT" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleApprove = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      await api.decide(
        reconciliationId,
        {
          action: "APPROVE",
          expectedVersion: version,
          reason: "Aprovado por conferência documental humana",
        },
        accessToken,
      );
      onSuccess();
    } catch (err: any) {
      if (err.message === "CONFLICT_RELOAD_REQUIRED") {
        setErrorMessage("Este lançamento foi alterado por outro usuário. Recarregando...");
        setTimeout(onSuccess, 1500);
      } else {
        setErrorMessage(err.message || "Erro ao aprovar lançamento.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleActionWithReason = (action: "REJECT" | "REPLACE" | "CORRECT") => {
    setPendingAction(action);
    setShowReasonInput(true);
    setErrorMessage(null);
  };

  const confirmActionWithReason = async () => {
    if (!reason.trim()) {
      setErrorMessage("Por favor, informe a justificativa para esta ação.");
      return;
    }

    if (!pendingAction) return;

    try {
      setLoading(true);
      setErrorMessage(null);
      await api.decide(
        reconciliationId,
        {
          action: pendingAction,
          expectedVersion: version,
          reason: reason.trim(),
        },
        accessToken,
      );
      setShowReasonInput(false);
      setReason("");
      setPendingAction(null);
      onSuccess();
    } catch (err: any) {
      if (err.message === "CONFLICT_RELOAD_REQUIRED") {
        setErrorMessage("Este lançamento foi alterado por outro usuário. Recarregando...");
        setTimeout(onSuccess, 1500);
      } else {
        setErrorMessage(err.message || "Erro ao registrar decisão.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 pt-4 border-t border-white/10">
      {errorMessage && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {showReasonInput ? (
        <div className="space-y-2 bg-slate-800/80 p-3 rounded-lg border border-white/10">
          <label className="text-xs font-semibold text-slate-300">
            Justificativa para {pendingAction === "REJECT" ? "Rejeitar" : "Substituir / Corrigir"}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Informe a justificativa detalhada para a auditoria..."
            className="w-full p-2 bg-slate-900 border border-white/10 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            rows={2}
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowReasonInput(false);
                setReason("");
                setPendingAction(null);
              }}
              className="px-3 py-1 rounded text-xs text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmActionWithReason}
              disabled={loading}
              className="px-3 py-1 rounded text-xs font-medium bg-amber-500 text-slate-950 hover:bg-amber-400"
            >
              {loading ? "Registrando..." : "Confirmar Decisão"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleApprove}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 font-medium text-xs transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>Aprovar Vínculo</span>
          </button>
          <button
            type="button"
            onClick={() => handleActionWithReason("REJECT")}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 font-medium text-xs transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Rejeitar</span>
          </button>
          <button
            type="button"
            onClick={() => handleActionWithReason("REPLACE")}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 text-slate-300 border border-white/10 hover:bg-slate-700 font-medium text-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Substituir</span>
          </button>
        </div>
      )}
    </div>
  );
};

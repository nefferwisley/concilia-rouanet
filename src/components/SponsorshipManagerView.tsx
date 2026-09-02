import React, { useState } from "react";
import { PronacProject, Sponsor, SponsorshipContribution, PatronageReceipt } from "../types";
import { ArrowRightLeft, Users, FileText, CheckCircle2, Download, Plus, Banknote } from "lucide-react";
import { formatCurrency, formatDate } from "../utils/formatters";

interface SponsorshipManagerViewProps {
  project: PronacProject;
}

export const SponsorshipManagerView: React.FC<SponsorshipManagerViewProps> = ({ project }) => {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);

  const [contributions, setContributions] = useState<SponsorshipContribution[]>([]);

  const [receipts, setReceipts] = useState<PatronageReceipt[]>([]);

  const handleGenerateReceipt = (contributionId: string) => {
    const contribution = contributions.find(c => c.id === contributionId);
    if (!contribution) return;

    const newReceipt: PatronageReceipt = {
      id: `rec-${Date.now()}`,
      contributionId,
      numeroRecibo: `REC-${Math.floor(1000 + Math.random() * 9000)}`,
      dataEmissao: new Date().toISOString(),
      status: "EMITIDO"
    };

    setReceipts([...receipts, newReceipt]);
    alert("Recibo de Mecenato gerado com sucesso.");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" /> Captação e Fontes de Recursos
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Gerenciamento de patrocinadores, aportes e emissão de Recibos de Mecenato. PRONAC: {project.pronac}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-md font-bold text-slate-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" /> Patrocinadores
            </h2>
          </div>
          <div className="space-y-3">
            {sponsors.length === 0 ? (
              <p className="text-xs text-slate-400">Nenhum patrocinador informado para este projeto.</p>
            ) : sponsors.map(sponsor => (
              <div key={sponsor.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <p className="font-semibold text-slate-300">{sponsor.nome}</p>
                <p className="text-xs text-slate-500">{sponsor.cnpjCpf}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-md font-bold text-slate-200 flex items-center gap-2">
              <Banknote className="w-4 h-4 text-emerald-400" /> Aportes e Recibos
            </h2>
          </div>
          <div className="space-y-3">
            {contributions.length === 0 ? (
              <p className="text-xs text-slate-400">Nenhum aporte informado ou importado.</p>
            ) : contributions.map(contrib => {
              const sponsor = sponsors.find(s => s.id === contrib.sponsorId);
              const receipt = receipts.find(r => r.contributionId === contrib.id);

              return (
                <div key={contrib.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{formatCurrency(contrib.valor)}</p>
                    <p className="text-xs text-slate-400">Em {formatDate(contrib.dataAporte)} - {sponsor?.nome}</p>
                  </div>
                  <div>
                    {receipt ? (
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Recibo {receipt.numeroRecibo}
                      </span>
                    ) : (
                      <button onClick={() => handleGenerateReceipt(contrib.id)} className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg border border-slate-700">
                        Gerar Recibo
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

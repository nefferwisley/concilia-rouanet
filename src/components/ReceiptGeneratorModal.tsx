import React, { useState } from "react";
import {
  X,
  Printer,
  Download,
  Send,
  CheckCircle2,
  FileSignature,
  Building,
  User,
  Calendar,
  DollarSign,
  AlertCircle,
  FileText,
} from "lucide-react";
import { BankTransaction, BudgetRubric, PronacProject, ReceiptItem, ReceiptStatus } from "../types";
import { formatCurrency, formatDate, formatCnpjCpf } from "../utils/formatters";
import { resolveProviderAndCompany } from "../utils/providerHelper";

import { generateDigitalSignatureDispatch } from "../services/digitalSignatureService";

// Helper simples para valor por extenso em BRL
function valorPorExtensoBRL(valor: number): string {
  if (!valor || valor <= 0) return "Zero reais";
  const inteiros = Math.floor(valor);
  const centavos = Math.round((valor - inteiros) * 100);

  const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
  const especiais = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
  const dezenas = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const centenas = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

  function converterGrupo(n: number): string {
    if (n === 100) return "cem";
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;
    const partes: string[] = [];

    if (c > 0) partes.push(centenas[c]);
    if (d === 1) {
      partes.push(especiais[u]);
    } else {
      if (d > 1) partes.push(dezenas[d]);
      if (u > 0) partes.push(unidades[u]);
    }
    return partes.join(" e ");
  }

  let extenso = "";
  if (inteiros >= 1000) {
    const mil = Math.floor(inteiros / 1000);
    const resto = inteiros % 1000;
    extenso += (mil === 1 ? "mil" : `${converterGrupo(mil)} mil`);
    if (resto > 0) extenso += (resto < 100 || resto % 100 === 0 ? " e " : ", ") + converterGrupo(resto);
  } else if (inteiros > 0) {
    extenso += converterGrupo(inteiros);
  }

  extenso += inteiros === 1 ? " real" : " reais";
  if (centavos > 0) {
    extenso += ` e ${converterGrupo(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`;
  }
  return extenso.charAt(0).toUpperCase() + extenso.slice(1);
}

interface ReceiptGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction?: BankTransaction | null;
  project: PronacProject;
  rubrics: BudgetRubric[];
  onSaveReceipt: (receipt: ReceiptItem) => void;
  existingReceipt?: ReceiptItem | null;
}

export const ReceiptGeneratorModal: React.FC<ReceiptGeneratorModalProps> = ({
  isOpen,
  onClose,
  transaction,
  project,
  rubrics,
  onSaveReceipt,
  existingReceipt,
}) => {
  if (!isOpen || !transaction) return null;

  const resolved = resolveProviderAndCompany(
    transaction.favorecido || transaction.descricaoExtrato || "",
    transaction.cnpjCpfFavorecido
  );
  const txVal = Number(transaction.valor) || 0;

  const [responsavel, setResponsavel] = useState(
    existingReceipt?.responsavelAssinatura || "Júlia Bárbara Melo de Sousa"
  );
  const [funcaoServico, setFuncaoServico] = useState(
    existingReceipt?.funcaoOuServico || resolved.roleOrCategory || "Prestação de Serviços Especializados para o Projeto Audiovisual"
  );
  const [numeroRecibo, setNumeroRecibo] = useState(
    existingReceipt?.numeroRecibo || `REC-${String(transaction.numeroArquivo || transaction.id || 1).padStart(4, "0")}`
  );
  const [status, setStatus] = useState<ReceiptStatus>(
    existingReceipt?.status || "PENDENTE_EMISSAO"
  );
  const [selectedRubricId, setSelectedRubricId] = useState(
    existingReceipt?.rubricaId || transaction.matchedRubricId || rubrics[0]?.id || ""
  );
  const [telefoneFavorecido, setTelefoneFavorecido] = useState("");

  const selectedRubric = rubrics.find((r) => r.id === selectedRubricId) || rubrics[0];
  const valorExtenso = valorPorExtensoBRL(txVal);

  const handlePrint = () => {
    window.print();
  };

  const handleDispararWhatsApp = () => {
    const dispatch = generateDigitalSignatureDispatch({
      receiptId: existingReceipt?.id || `rec-${Date.now()}`,
      transacaoId: transaction.id || "",
      favorecidoNome: resolved.personName,
      favorecidoTelefone: telefoneFavorecido,
      responsavelNome: responsavel,
      valor: txVal,
      funcaoOuServico: funcaoServico,
      projetoNome: project.nome,
      pronac: project.pronac,
    });

    handleSalvar("ENVIADO_ASSINATURA");
    window.open(dispatch.whatsappDirectLink, "_blank");
  };

  const handleSalvar = (novoStatus?: ReceiptStatus) => {
    const finalStatus = novoStatus || status;
    const receipt: ReceiptItem = {
      id: existingReceipt?.id || `rec-${Date.now()}`,
      transacaoId: transaction.id || "",
      numeroRecibo,
      dataEmissao: transaction.data || transaction.dataTransacao || new Date().toISOString().split("T")[0],
      favorecidoNome: resolved.personName,
      favorecidoCpfCnpj: resolved.cnpjCpf || transaction.cnpjCpfFavorecido || "",
      funcaoOuServico: funcaoServico,
      valorBruto: txVal,
      retencaoInss: 0,
      retencaoIrrf: 0,
      retencaoIss: 0,
      valorLiquido: txVal,
      valorPorExtenso: valorExtenso,
      rubricaId: selectedRubric?.id,
      rubricaNome: selectedRubric?.nome || selectedRubric?.nomeRubrica,
      etapaProjeto: selectedRubric?.etapa,
      status: finalStatus,
      responsavelAssinatura: responsavel,
      dataEnvioAssinatura: finalStatus === "ENVIADO_ASSINATURA" ? new Date().toISOString() : existingReceipt?.dataEnvioAssinatura,
      dataRetornoAssinado: finalStatus === "ASSINADO_ANEXADO" ? new Date().toISOString() : existingReceipt?.dataRetornoAssinado,
    };

    onSaveReceipt(receipt);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Gerador de Recibo de Pagamento & Controle de Assinatura
              </h2>
              <p className="text-xs text-slate-400">
                Procedimento 5: Regularização Documental — {project.nome} (PRONAC {project.pronac})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto max-h-[70vh]">
          {/* Left: Configuration Form */}
          <div className="lg:col-span-5 space-y-4 text-xs">
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
              <h3 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" /> Parâmetros do Recibo
              </h3>

              <div>
                <label className="text-slate-400 block mb-1">Nº do Recibo</label>
                <input
                  type="text"
                  value={numeroRecibo}
                  onChange={(e) => setNumeroRecibo(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Favorecido (Pessoa Física / Prestador)</label>
                <input
                  type="text"
                  value={resolved.personName}
                  disabled
                  className="w-full bg-slate-900/60 border border-slate-800 text-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Discriminação da Função / Serviço</label>
                <textarea
                  rows={2}
                  value={funcaoServico}
                  onChange={(e) => setFuncaoServico(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Rubrica Orçamentária Aprovada</label>
                <select
                  value={selectedRubricId}
                  onChange={(e) => setSelectedRubricId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2"
                >
                  {rubrics.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.itemNumero ? `${r.itemNumero} - ` : ""}{r.nome || r.nomeRubrica || r.id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Responsável pela Coleta da Assinatura</label>
                <input
                  type="text"
                  value={responsavel}
                  onChange={(e) => setResponsavel(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">WhatsApp do Favorecido (DDD + Número)</label>
                <input
                  type="text"
                  placeholder="(11) 98765-4321"
                  value={telefoneFavorecido}
                  onChange={(e) => setTelefoneFavorecido(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Status do Fluxo de Assinatura</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ReceiptStatus)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 font-semibold text-emerald-400"
                >
                  <option value="PENDENTE_EMISSAO">🟡 Aguardando Emissão</option>
                  <option value="ENVIADO_ASSINATURA">🟣 Encaminhado p/ Assinatura (Júlia)</option>
                  <option value="ASSINADO_ANEXADO">🟢 Assinado & Regularizado</option>
                </select>
              </div>

              {/* Botão de Disparo WhatsApp */}
              <button
                type="button"
                onClick={handleDispararWhatsApp}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 transition shadow-md mt-2"
              >
                <Send className="w-4 h-4" />
                <span>Disparar Assinatura (WhatsApp / Gov.br)</span>
              </button>
            </div>
          </div>

          {/* Right: Printable Receipt Preview */}
          <div className="lg:col-span-7 bg-white text-slate-900 p-6 rounded-xl shadow border border-slate-300 font-serif leading-relaxed text-xs print:m-0 print:p-0">
            {/* Header Documento */}
            <div className="border-b-2 border-slate-900 pb-3 text-center mb-4">
              <span className="text-[10px] uppercase font-sans tracking-widest text-slate-600 block">
                Comprovante de Quitação & Prestação de Contas (Lei Rouanet / ANCINE)
              </span>
              <h1 className="text-base font-bold uppercase font-sans mt-0.5">
                RECIBO DE PRESTAÇÃO DE SERVIÇOS Nº {numeroRecibo}
              </h1>
              <div className="text-[10px] text-slate-600 font-sans mt-1">
                Projeto: <strong>{project.nome}</strong> | PRONAC / FSA: <strong>{project.pronac}</strong>
              </div>
            </div>

            {/* Valor Box */}
            <div className="flex justify-between items-center bg-slate-100 border border-slate-300 p-2.5 rounded font-sans mb-4">
              <span className="font-bold text-xs">VALOR LÍQUIDO PAGO:</span>
              <span className="text-sm font-bold font-mono text-emerald-800">{formatCurrency(txVal)}</span>
            </div>

            {/* Texto do Recibo */}
            <p className="mb-3 text-justify">
              Recebi(emos) de <strong>{project.proponente || "Circunstância Cinematográfica Ltda"}</strong>, CNPJ nº{" "}
              <strong>{project.cnpjCpf || "05.518.874/0001-41"}</strong>, a importância líquida de{" "}
              <strong>{formatCurrency(txVal)} ({valorExtenso})</strong>, referente a <strong>{funcaoServico}</strong>, 
              executado no âmbito do projeto cultural <strong>{project.nome}</strong> (PRONAC <strong>{project.pronac}</strong>), 
              alocado na rubrica orçamentária <strong>{selectedRubric?.nome || selectedRubric?.nomeRubrica || "Serviços Técnicos"}</strong>.
            </p>

            <p className="mb-4 text-justify text-[11px] text-slate-700">
              Pelo presente recibo, dou(damos) plena, geral e irrevogável quitação do valor recebido, para nada mais reclamar a qualquer título.
            </p>

            {/* Data e Local */}
            <div className="text-right my-4 font-sans text-[11px]">
              São Paulo - SP, {formatDate(transaction.data || transaction.dataTransacao || "2023-01-01")}.
            </div>

            {/* Assinaturas Duplas */}
            <div className="grid grid-cols-2 gap-6 pt-6 mt-4 border-t border-slate-300 font-sans text-center text-[10px]">
              <div>
                <div className="border-b border-slate-900 pb-1 mb-1 font-bold">
                  {resolved.personName}
                </div>
                <div className="text-slate-600">
                  CPF/CNPJ: {resolved.cnpjCpf || transaction.cnpjCpfFavorecido || "___.___.___-__"}
                </div>
                <div className="text-slate-500 italic">Prestador / Favorecido</div>
              </div>

              <div>
                <div className="border-b border-slate-900 pb-1 mb-1 font-bold">
                  {responsavel}
                </div>
                <div className="text-slate-600">Produção Executiva / Direção</div>
                <div className="text-slate-500 italic">Responsável pelo Projeto</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSalvar("ENVIADO_ASSINATURA")}
              className="text-xs bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition font-semibold"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Marcar: Enviado p/ Júlia</span>
            </button>

            <button
              onClick={() => handleSalvar("ASSINADO_ANEXADO")}
              className="text-xs bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-4 py-2 rounded-xl flex items-center gap-1.5 transition font-bold shadow-lg"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Salvar: Assinado & Regularizado</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

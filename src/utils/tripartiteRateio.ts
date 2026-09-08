import { BudgetRubric, FiscalDocument, TripartiteEntry } from "../types";

export interface ApplyTripartiteRateioInput {
  entries: TripartiteEntry[];
  documents: FiscalDocument[];
  entry: TripartiteEntry;
  destinationRubric: BudgetRubric;
  amount: number;
  justification: string;
}

export interface ApplyTripartiteRateioResult {
  entries: TripartiteEntry[];
  documents: FiscalDocument[];
  createdEntry: TripartiteEntry;
}

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function splitAmount(total: number | undefined, ratio: number): [number, number] {
  const normalized = Number(total) || 0;
  const moved = roundMoney(normalized * ratio);
  return [roundMoney(normalized - moved), moved];
}

export function applyTripartiteRateio({
  entries,
  documents,
  entry,
  destinationRubric,
  amount,
  justification,
}: ApplyTripartiteRateioInput): ApplyTripartiteRateioResult {
  const sourceAmount = Number(entry.valorDebitoBB) || Number(entry.valorBrutoDoc) || 0;
  const cleanJustification = justification.trim();

  if (!entry.idLancamento) throw new Error("O lançamento de origem não possui identificador.");
  if (!destinationRubric?.id) throw new Error("Selecione a rubrica de destino.");
  if (destinationRubric.id === entry.idRubrica) throw new Error("A rubrica de destino deve ser diferente da atual.");
  if (!Number.isFinite(amount) || amount <= 0 || amount >= sourceAmount) {
    throw new Error("Informe um valor maior que zero e menor que o valor do lançamento.");
  }
  if (!cleanJustification) throw new Error("Informe a justificativa do rateio.");

  const ratio = amount / sourceAmount;
  const [sourceGross, movedGross] = splitAmount(entry.valorBrutoDoc, ratio);
  const [sourceNet, movedNet] = splitAmount(entry.valorLiquidoPagar, ratio);
  const [sourceIrrf, movedIrrf] = splitAmount(entry.retencoes?.irrf, ratio);
  const [sourceIss, movedIss] = splitAmount(entry.retencoes?.iss, ratio);
  const [sourceInss, movedInss] = splitAmount(entry.retencoes?.inss, ratio);
  const [sourceOthers, movedOthers] = splitAmount(entry.retencoes?.outras, ratio);
  const rateioSequence = entries.filter((item) => item.rateioOrigemId === entry.idLancamento).length + 1;
  const childId = `${entry.idLancamento}-R${String(rateioSequence).padStart(2, "0")}`;

  const sourceEntry: TripartiteEntry = {
    ...entry,
    valorDebitoBB: roundMoney(sourceAmount - amount),
    valorBrutoDoc: sourceGross,
    valorLiquidoPagar: sourceNet,
    retencoes: { irrf: sourceIrrf, iss: sourceIss, inss: sourceInss, outras: sourceOthers },
    rateioAplicado: true,
    observacoes: [entry.observacoes, `Rateio ${childId}: ${cleanJustification}`].filter(Boolean).join(" | "),
  };

  const createdEntry: TripartiteEntry = {
    ...entry,
    id: `${entry.id || entry.idLancamento}-rateio-${rateioSequence}`,
    idLancamento: childId,
    idRubrica: destinationRubric.id,
    rubricaId: destinationRubric.id,
    descricaoRubrica: destinationRubric.nome || destinationRubric.nomeRubrica || "Rubrica de destino",
    nomeRubrica: destinationRubric.nome || destinationRubric.nomeRubrica || "Rubrica de destino",
    etapa: destinationRubric.etapa,
    valorDebitoBB: roundMoney(amount),
    valorBrutoDoc: movedGross,
    valorLiquidoPagar: movedNet,
    retencoes: { irrf: movedIrrf, iss: movedIss, inss: movedInss, outras: movedOthers },
    rateioOrigemId: entry.idLancamento,
    rateioParcela: rateioSequence,
    observacoes: `Rateado de ${entry.idLancamento}: ${cleanJustification}`,
  };

  const updatedEntries = entries.flatMap((item) =>
    item.idLancamento === entry.idLancamento ? [sourceEntry, createdEntry] : [item]
  );
  const updatedDocuments = documents.map((document) => {
    if (!entry.idDocFiscal || document.id !== entry.idDocFiscal) return document;
    return {
      ...document,
      splits: [
        ...(document.splits || []),
        { rubricId: destinationRubric.id, value: roundMoney(amount), justification: cleanJustification },
      ],
    };
  });

  return { entries: updatedEntries, documents: updatedDocuments, createdEntry };
}

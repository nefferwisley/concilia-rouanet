import { BankTransaction, FiscalDocument, BudgetRubric, ProbabilisticMatchPair, RecordLinkageReport } from "../../types";

/**
 * Splink & Fellegi-Sunter probabilistic record linkage engine for financial reconciliation.
 * Evaluates candidate pairs between Bank Transactions (debits) and Fiscal Documents (invoices/receipts).
 */

// Normalized Levenshtein similarity (0.0 to 1.0)
function computeStringSimilarity(strA: string, strB: string): number {
  if (!strA || !strB) return 0;
  const a = strA.toLowerCase().trim();
  const b = strB.toLowerCase().trim();
  if (a === b) return 1.0;
  if (a.includes(b) || b.includes(a)) return 0.85;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }
  const distance = matrix[b.length][a.length];
  const maxLen = Math.max(a.length, b.length);
  return Math.max(0, 1 - distance / maxLen);
}

// Clean numbers only for CNPJ / CPF matching
function cleanDigits(val?: string): string {
  return (val || "").replace(/\D/g, "");
}

export function runSplinkRecordLinkage(
  transactions: BankTransaction[],
  documents: FiscalDocument[],
  rubrics: BudgetRubric[]
): RecordLinkageReport {
  const startTime = Date.now();
  const pairs: ProbabilisticMatchPair[] = [];

  const debits = transactions.filter(
    (t) => t.tipo === "DEBITO" || t.tipo === "TARIFA" || !t.tipo || (t as any).tipoMovimento === "DEBIT"
  );

  let confirmed = 0;
  let probable = 0;
  let unmatched = 0;

  for (const tx of debits) {
    const txVal = Math.abs(tx.valor || 0);
    const txDateStr = tx.data || (tx as any).dataTransacao || "";
    const txDesc = tx.descricaoExtrato || tx.descricao || "";
    const txFav = tx.favorecido || "";
    const txCnpj = cleanDigits(tx.cnpjCpfFavorecido);
    const txFitid = tx.documentoBancario || (tx as any).fitid || "";

    let bestDoc: FiscalDocument | null = null;
    let highestScore = 0;
    let bestScores = {
      scoreAmount: 0,
      scoreDate: 0,
      scoreEntityName: 0,
      scoreDocumentNumber: 0,
      scoreTaxConsistency: 0,
    };
    let explanations: string[] = [];

    // Already linked document takes high baseline
    if (tx.matchedDocId || tx.idDocumentoFiscalVinculado) {
      const explicitDoc = documents.find(
        (d) => d.id === tx.matchedDocId || d.id === tx.idDocumentoFiscalVinculado
      );
      if (explicitDoc) {
        bestDoc = explicitDoc;
      }
    }

    for (const doc of documents) {
      const docLiq = doc.valorLiquido || doc.valorBruto || 0;
      const docBrut = doc.valorBruto || 0;
      const docDateStr = doc.dataEmissao || "";
      const docFornec = doc.fornecedorNome || "";
      const docCnpj = cleanDigits(doc.fornecedorCnpjCpf);
      const docNum = (doc.numeroDoc || "").trim();

      // 1. Amount Match Score (Weight: 40%)
      let scoreAmount = 0;
      const diffLiq = Math.abs(txVal - docLiq);
      const diffBrut = Math.abs(txVal - docBrut);

      if (diffLiq < 0.05) {
        scoreAmount = 1.0; // Perfect liquid match
      } else if (diffBrut < 0.05) {
        scoreAmount = 0.95; // Exact gross match
      } else if (diffLiq < 5.0) {
        scoreAmount = 0.70;
      } else {
        scoreAmount = Math.max(0, 1 - Math.min(diffLiq, diffBrut) / Math.max(txVal, 1));
      }

      // 2. Date Proximity Score (Weight: 20%)
      let scoreDate = 0.5;
      if (txDateStr && docDateStr) {
        const txTime = new Date(txDateStr).getTime();
        const docTime = new Date(docDateStr).getTime();
        if (!isNaN(txTime) && !isNaN(docTime)) {
          const daysDiff = Math.abs(txTime - docTime) / (1000 * 60 * 60 * 24);
          if (daysDiff <= 3) scoreDate = 1.0;
          else if (daysDiff <= 15) scoreDate = 0.85;
          else if (daysDiff <= 45) scoreDate = 0.65;
          else if (daysDiff <= 90) scoreDate = 0.40;
          else scoreDate = 0.10;
        }
      }

      // 3. Entity Name & CNPJ Score (Weight: 25%)
      let scoreEntityName = 0;
      if (txCnpj && docCnpj && txCnpj === docCnpj) {
        scoreEntityName = 1.0;
      } else {
        const sim1 = computeStringSimilarity(txFav, docFornec);
        const sim2 = computeStringSimilarity(txDesc, docFornec);
        scoreEntityName = Math.max(sim1, sim2);
      }

      // 4. Document Number / FITID Match Score (Weight: 10%)
      let scoreDocumentNumber = 0;
      if (docNum && (txDesc.includes(docNum) || txFitid.includes(docNum))) {
        scoreDocumentNumber = 1.0;
      } else {
        scoreDocumentNumber = 0.2;
      }

      // 5. Tax Withholding Consistency (Weight: 5%)
      const retTotal = (doc.retencaoIss || 0) + (doc.retencaoIrrf || 0) + (doc.retencaoInss || 0);
      const scoreTaxConsistency = retTotal > 0 && Math.abs(docBrut - retTotal - txVal) < 0.05 ? 1.0 : 0.8;

      // Fellegi-Sunter Weighted Overall Probability
      const overall =
        scoreAmount * 0.40 +
        scoreDate * 0.20 +
        scoreEntityName * 0.25 +
        scoreDocumentNumber * 0.10 +
        scoreTaxConsistency * 0.05;

      if (overall > highestScore) {
        highestScore = overall;
        bestDoc = doc;
        bestScores = {
          scoreAmount,
          scoreDate,
          scoreEntityName,
          scoreDocumentNumber,
          scoreTaxConsistency,
        };
      }
    }

    if (bestDoc && highestScore >= 0.45) {
      explanations = [];
      if (bestScores.scoreAmount >= 0.95) explanations.push("Valor compatível com precisão centesimal (1:1 ou Líquido c/ Retenção)");
      if (bestScores.scoreEntityName >= 0.70) explanations.push("Correspondência de favorecido / fornecedor idôneo");
      if (bestScores.scoreDate >= 0.80) explanations.push("Data de compensação bancária adjacente à emissão fiscal");
      if (bestScores.scoreDocumentNumber >= 0.90) explanations.push("Número de NF/RPA detectado na descrição da transação");

      let classification: "MATCH_CONFIRMED" | "PROBABLE_MATCH" | "AMBIGUOUS_MULTI_MATCH" | "UNMATCHED" = "PROBABLE_MATCH";
      if (highestScore >= 0.80) {
        classification = "MATCH_CONFIRMED";
        confirmed++;
      } else if (highestScore >= 0.60) {
        classification = "PROBABLE_MATCH";
        probable++;
      } else {
        classification = "AMBIGUOUS_MULTI_MATCH";
      }

      const matchedRubric = rubrics.find((r) => r.id === bestDoc?.rubricaId || r.id === tx.matchedRubricId);

      pairs.push({
        id: `link_${tx.id}_${bestDoc.id}`,
        transactionId: tx.id,
        fitid: txFitid,
        txDescription: txDesc,
        txDate: txDateStr,
        txAmount: txVal,
        txFavorecido: txFav || txDesc,

        candidateDocId: bestDoc.id,
        docNumber: bestDoc.numeroDoc,
        docType: bestDoc.tipo,
        docDate: bestDoc.dataEmissao,
        docGrossAmount: bestDoc.valorBruto,
        docNetAmount: bestDoc.valorLiquido,
        docFornecedor: bestDoc.fornecedorNome,
        docCnpjCpf: bestDoc.fornecedorCnpjCpf,

        rubricId: matchedRubric?.id,
        rubricName: matchedRubric?.nome,

        scoreAmount: Math.round(bestScores.scoreAmount * 100) / 100,
        scoreDate: Math.round(bestScores.scoreDate * 100) / 100,
        scoreEntityName: Math.round(bestScores.scoreEntityName * 100) / 100,
        scoreDocumentNumber: Math.round(bestScores.scoreDocumentNumber * 100) / 100,
        scoreTaxConsistency: Math.round(bestScores.scoreTaxConsistency * 100) / 100,

        overallMatchProbability: Math.round(highestScore * 100) / 100,
        matchClassification: classification,
        matchExplanation: explanations,
      });
    } else {
      unmatched++;
      pairs.push({
        id: `unlinked_${tx.id}`,
        transactionId: tx.id,
        fitid: txFitid,
        txDescription: txDesc,
        txDate: txDateStr,
        txAmount: txVal,
        txFavorecido: txFav || txDesc,

        candidateDocId: "",
        docNumber: "-",
        docType: "-",
        docDate: "-",
        docGrossAmount: 0,
        docNetAmount: 0,
        docFornecedor: "Pendente de Documento Fiscal",
        docCnpjCpf: "-",

        scoreAmount: 0,
        scoreDate: 0,
        scoreEntityName: 0,
        scoreDocumentNumber: 0,
        scoreTaxConsistency: 0,

        overallMatchProbability: 0,
        matchClassification: "UNMATCHED",
        matchExplanation: ["Nenhum documento fiscal correspondente identificado na base"],
      });
    }
  }

  const avgConf = pairs.length > 0
    ? pairs.reduce((sum, p) => sum + p.overallMatchProbability, 0) / pairs.length
    : 0;

  return {
    totalPairsEvaluated: debits.length,
    confirmedMatches: confirmed,
    probableMatches: probable,
    unmatchedRecords: unmatched,
    averageConfidence: Math.round(avgConf * 100) / 100,
    matches: pairs,
    executionTimeMs: Date.now() - startTime,
  };
}

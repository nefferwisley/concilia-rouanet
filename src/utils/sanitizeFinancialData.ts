import { BankTransaction, FiscalDocument, TripartiteEntry } from "../types";
import { resolveProviderAndCompany } from "./providerHelper";

export function sanitizeTransactions(transactions: BankTransaction[]): BankTransaction[] {
  return (transactions || []).map((tx, idx) => {
    const isInvalidCnpjCpf =
      !tx.cnpjCpfFavorecido ||
      tx.cnpjCpfFavorecido === "00.000.000/0000-00" ||
      tx.cnpjCpfFavorecido === "000.000.000-00" ||
      tx.cnpjCpfFavorecido.replace(/\D/g, "").split("").every((c) => c === "0");

    const resolved = resolveProviderAndCompany(
      tx.favorecido || tx.descricaoOriginalExtrato || tx.descricaoExtrato || "",
      tx.cnpjCpfFavorecido
    );

    const docNum = tx.documentoNumero || tx.documentoBancario || `DOC-${idx + 1}`;
    const fitid = tx.fitid || (tx.documentoBancario ? `BB-${tx.documentoBancario}` : `BB-FITID-${docNum}`);

    return {
      ...tx,
      cnpjCpfFavorecido: isInvalidCnpjCpf ? resolved.cnpjCpf : tx.cnpjCpfFavorecido,
      favorecido: tx.favorecido || resolved.personName,
      fitid,
      documentoBancario: tx.documentoBancario || docNum,
    };
  });
}

export function sanitizeDocuments(documents: FiscalDocument[]): FiscalDocument[] {
  return (documents || []).map((doc) => {
    const isInvalidCnpjCpf =
      !doc.fornecedorCnpjCpf ||
      doc.fornecedorCnpjCpf === "00.000.000/0000-00" ||
      doc.fornecedorCnpjCpf === "000.000.000-00" ||
      doc.fornecedorCnpjCpf.replace(/\D/g, "").split("").every((c) => c === "0");

    const resolved = resolveProviderAndCompany(
      doc.fornecedorNome || doc.descricaoServico || "",
      doc.fornecedorCnpjCpf
    );

    return {
      ...doc,
      fornecedorCnpjCpf: isInvalidCnpjCpf ? resolved.cnpjCpf : doc.fornecedorCnpjCpf,
      fornecedorNome: doc.fornecedorNome || resolved.personName,
    };
  });
}

export function sanitizeTripartiteEntries(entries: TripartiteEntry[]): TripartiteEntry[] {
  return (entries || []).map((entry) => {
    const isInvalidCnpjCpf =
      !entry.cnpjCpf ||
      entry.cnpjCpf === "00.000.000/0000-00" ||
      entry.cnpjCpf === "000.000.000-00" ||
      entry.cnpjCpf.replace(/\D/g, "").split("").every((c) => c === "0");

    const resolved = resolveProviderAndCompany(
      entry.fornecedor || entry.favorecidoExtrato || entry.fornecedorDocFiscal || "",
      entry.cnpjCpf
    );

    return {
      ...entry,
      cnpjCpf: isInvalidCnpjCpf ? resolved.cnpjCpf : entry.cnpjCpf,
      fornecedor: entry.fornecedor || resolved.personName,
    };
  });
}

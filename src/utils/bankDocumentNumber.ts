import project1961Ledger from "../../backend/data/lancamentos_1961_real.json";
import type { BankTransaction, FiscalDocument } from "../types";

type VerifiedLedgerEntry = {
  numero_arquivo?: number | null;
  extrato_ref?: string | null;
};

const VERIFIED_PROJECT_1961_DOCUMENTS = new Map(
  (project1961Ledger.lancamentos as VerifiedLedgerEntry[])
    .filter((entry) => entry.numero_arquivo && entry.extrato_ref?.includes("#"))
    .map((entry) => [
      String(entry.numero_arquivo),
      String(entry.extrato_ref).split("#").pop()?.trim() || "",
    ]),
);

export function formatBankDocumentNumber(value: unknown): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  return raw;
}

function isSpreadsheetControl(value: unknown): boolean {
  return /^(?:DOC[-\s]*)?\d{1,3}$/i.test(String(value || "").trim());
}

function controlNumber(transaction: BankTransaction): string {
  const raw = String(transaction.controleNumero || transaction.documentoNumero || "").trim();
  return raw.match(/\d+/)?.[0] || "";
}

export function resolveBankDocumentNumber(
  transaction: BankTransaction,
  document?: FiscalDocument,
  projectId?: string,
): string {
  const extracted = document?.documentoBancarioNumero;
  if (extracted) return formatBankDocumentNumber(extracted);

  if (transaction.documentoBancario && !isSpreadsheetControl(transaction.documentoBancario)) {
    return formatBankDocumentNumber(transaction.documentoBancario);
  }

  if (transaction.documentoNumero && !isSpreadsheetControl(transaction.documentoNumero)) {
    return formatBankDocumentNumber(transaction.documentoNumero);
  }

  const isProject1961 = projectId === "proj-1961" || String(transaction.id).includes("1961");
  if (!isProject1961) return "";
  return formatBankDocumentNumber(VERIFIED_PROJECT_1961_DOCUMENTS.get(controlNumber(transaction)));
}

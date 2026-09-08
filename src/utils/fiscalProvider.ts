import { FiscalDocument } from "../types";

const VERIFIED_LEGACY_ISSUERS: Record<string, string> = {
  // Razão social conferida na NFS-e do pacote 1961 fornecida pelo usuário.
  "11400274000194": "CIRCUNSTANCIA CINEMATOGRAFICA E PRODUCOES ARTISTICAS LTDA",
};

const normalizeTaxId = (value: unknown) => String(value || "").replace(/\D/g, "");

function isUsefulFiscalName(value: unknown): value is string {
  const name = String(value || "").trim();
  if (!name) return false;
  return !(
    /^\[?\d{2}[./-]\d{2}[./-]\d{2,4}\]?/i.test(name) ||
    /^(?:sisbb\b|sistema\s+de\s+informa[cç][õo]es\b|transfer[êe]ncias?\s+entre\s+contas\b|c[oó]digo\s+controle\b|emiss[ãa]o\s+de\s+comprovantes\b|consultas?\s+-\s+emiss[ãa]o\s+de\s+comprovantes\b|danfse\s+v\d|n[uú]mero\s+da\s+nota\b|documento\s+importado\b)/i.test(name)
  );
}

export function resolveFiscalProvider(document?: FiscalDocument): { name: string; taxId: string; identified: boolean } {
  if (!document) return { name: "Prestador não identificado na NF", taxId: "", identified: false };

  const taxId = String(document.fornecedorCnpjCpf || document.cnpjCpfEmitente || "").trim();
  const strictCandidates = [
    document.prestadorServicoNome,
    document.razaoSocialEmitente,
    document.nomeRazaoSocial,
    document.fornecedorNome,
  ];
  const extractedName = strictCandidates.find(isUsefulFiscalName);
  const verifiedLegacyName = VERIFIED_LEGACY_ISSUERS[normalizeTaxId(taxId)];
  const name = extractedName || verifiedLegacyName;

  return name
    ? { name: String(name).trim(), taxId, identified: true }
    : { name: "Prestador não identificado na NF", taxId, identified: false };
}

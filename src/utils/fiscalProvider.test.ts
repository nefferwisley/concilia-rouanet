import { describe, expect, it } from "vitest";
import { resolveFiscalProvider } from "./fiscalProvider";

describe("resolveFiscalProvider", () => {
  it("prioritizes the service provider and legal name extracted from the invoice", () => {
    expect(resolveFiscalProvider({
      fornecedorNome: "Favorecido do banco",
      razaoSocialEmitente: "RAZÃO SOCIAL DA NFS-E",
      prestadorServicoNome: "PRESTADOR DA NFS-E",
      fornecedorCnpjCpf: "12.345.678/0001-90",
    } as any).name).toBe("PRESTADOR DA NFS-E");
  });

  it("repairs the verified legacy issuer instead of showing payment metadata", () => {
    expect(resolveFiscalProvider({
      fornecedorNome: "[04.11.2022] [R$ 11.000,00]",
      fornecedorCnpjCpf: "11.400.274/0001-94",
    } as any)).toEqual({
      name: "CIRCUNSTANCIA CINEMATOGRAFICA E PRODUCOES ARTISTICAS LTDA",
      taxId: "11.400.274/0001-94",
      identified: true,
    });
  });

  it("never falls back to bank beneficiary text when no invoice is linked", () => {
    expect(resolveFiscalProvider(undefined).name).toBe("Prestador não identificado na NF");
  });
});

import { describe, expect, it } from "vitest";
import { taxAuthorityIntegrationService } from "./taxAuthorityIntegrationService";
import type { FiscalDocument } from "../types";

describe("taxAuthorityIntegrationService", () => {
  it("validates authentic NF-e with valid CNPJ and generates official SEFAZ protocol", async () => {
    const doc: FiscalDocument = {
      id: "doc-1",
      tipo: "NF-e (Mercantil)",
      numeroDoc: "12345",
      fornecedorNome: "Banco do Brasil S.A.",
      fornecedorCnpjCpf: "00.000.000/0001-91",
      cnpjEmitente: "00.000.000/0001-91", // Banco do Brasil S.A. (CNPJ válido)
      razaoSocialEmitente: "Banco do Brasil S.A.",
      dataEmissao: "2022-11-04",
      valorBruto: 1500.0,
      valorLiquido: 1500.0,
      iss: 0,
      irrf: 0,
      inss: 0,
      descricaoServico: "Taxa bancária",
      rubricaOrcamentaria: "Custas Bancárias",
      statusConciliacao: "CONCILIADO",
    };

    const res = await taxAuthorityIntegrationService.validateDocument(doc);
    expect(res.valido).toBe(true);
    expect(res.status).toBe("VALIDO");
    expect(res.protocolo).toContain("SEFAZ-");
    expect(res.fonteConsulta).toBe("PREFEITURA_NFSE");
  });

  it("rejects document when CNPJ has invalid check digits", async () => {
    const doc: FiscalDocument = {
      id: "doc-2",
      tipo: "NFS-e (Serviço)",
      numeroDoc: "54321",
      fornecedorNome: "Fornecedor Teste",
      fornecedorCnpjCpf: "11.222.333/0001-00",
      cnpjEmitente: "11.222.333/0001-00", // CNPJ com DV incorreto
      dataEmissao: "2022-11-04",
      valorBruto: 2000.0,
      valorLiquido: 2000.0,
      iss: 0,
      irrf: 0,
      inss: 0,
      descricaoServico: "Serviço",
      rubricaOrcamentaria: "Produção",
      statusConciliacao: "PENDENTE",
    };

    const res = await taxAuthorityIntegrationService.validateDocument(doc);
    expect(res.valido).toBe(false);
    expect(res.status).toBe("INVALIDO");
    expect(res.codigoStatus).toBe("CNPJ_INVALIDO");
  });

  it("validates RPA with proper internal compliance check", async () => {
    const doc: FiscalDocument = {
      id: "doc-3",
      tipo: "RPA (Autônomo)",
      numeroDoc: "001",
      fornecedorNome: "Prestador Autônomo",
      fornecedorCnpjCpf: "123.456.789-09",
      cpfEmitente: "123.456.789-09", // CPF válido matematicamente
      dataEmissao: "2022-11-04",
      valorBruto: 3000.0,
      valorLiquido: 2700.0,
      iss: 150,
      irrf: 150,
      inss: 0,
      descricaoServico: "Serviço autônomo",
      rubricaOrcamentaria: "Equipe",
      statusConciliacao: "PENDENTE",
    };

    const res = await taxAuthorityIntegrationService.validateDocument(doc);
    expect(res.valido).toBe(true);
    expect(res.fonteConsulta).toBe("CONFORMIDADE_INTERNA");
  });
});

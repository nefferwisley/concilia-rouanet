import { FiscalDocument } from "../types";

/**
 * Serviço simulado de integração com a Receita Federal / SEFAZ / Prefeituras
 * Em produção real, este serviço consumiria as APIs do portal nacional da NFe
 * usando o certificado digital e-CNPJ da produtora.
 */

export interface SefazValidationResult {
  valido: boolean;
  status: "VALIDO" | "INVALIDO" | "PENDENTE";
  mensagem: string;
  dataConsulta: string;
}

export const taxAuthorityIntegrationService = {
  async validateDocument(document: FiscalDocument): Promise<SefazValidationResult> {
    // Simular delay de rede (0.5s a 1.5s)
    await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));

    const numDoc = document.numeroDoc || "";
    const isRpa = document.tipo === "RPA (Autônomo)" || document.tipo === "Recibo de Cachê" || document.tipo === "Recibo de Diária / Verba de Alimentação";

    // Recibos e RPAs não possuem chave de acesso na Sefaz, validação é manual
    if (isRpa) {
      return {
        valido: true,
        status: "VALIDO",
        mensagem: "Documento não eletrônico. Assinatura e CPF validados por conformidade interna.",
        dataConsulta: new Date().toISOString(),
      };
    }

    // Mock: Documentos cujo número contenha "000" ou terminem em "99" são marcados como inválidos.
    if (numDoc.includes("000") || numDoc.endsWith("99")) {
      return {
        valido: false,
        status: "INVALIDO",
        mensagem: "Rejeição Sefaz: Chave de acesso inexistente ou cancelada pelo emitente.",
        dataConsulta: new Date().toISOString(),
      };
    }

    return {
      valido: true,
      status: "VALIDO",
      mensagem: "Autorizado o uso da NF-e / NFS-e. Digest Value validado com sucesso.",
      dataConsulta: new Date().toISOString(),
    };
  },
};

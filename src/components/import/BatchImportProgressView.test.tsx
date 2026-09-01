import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  BatchImportProgressView,
  formatFileSize,
} from "./BatchImportProgressView";
import type { BatchSummaryState } from "../../contracts/batchImport";

const mockSummary: BatchSummaryState = {
  importacao_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  projeto_id: "proj-1961",
  status_geral: "processando",
  total_arquivos: 4,
  concluidos: 2,
  erros: 1,
  processando: 1,
  aguardando: 0,
  revisao_pendente: 0,
  progresso_pct: 50,
  detalhe_status: {
    DONE: 2,
    EXTRACTING: 1,
    FAILED: 1,
  },
  arquivos: [
    {
      id: "f1",
      nome: "001 - NF 1020 - Produtora.pdf",
      caminho: "comprovantes/001 - NF 1020 - Produtora.pdf",
      tamanho_bytes: 1048576,
      sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      status: "DONE",
      erro: null,
    },
    {
      id: "f2",
      nome: "002 - Recibo 55 - Diretor.pdf",
      caminho: "comprovantes/002 - Recibo 55 - Diretor.pdf",
      tamanho_bytes: 524288,
      sha256: "f4c8996fb92427ae41e4649b934ca495991b7852b855e3b0c44298fc1c149afb",
      status: "DONE",
      erro: null,
    },
    {
      id: "f3",
      nome: "003 - Boleto - Locacao.pdf",
      caminho: "comprovantes/003 - Boleto - Locacao.pdf",
      tamanho_bytes: 204800,
      sha256: "a495991b7852b855e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934c",
      status: "EXTRACTING",
      erro: null,
    },
    {
      id: "f4",
      nome: "004 - Imagem Danificada.png",
      caminho: "comprovantes/004 - Imagem Danificada.png",
      tamanho_bytes: 10240,
      sha256: "b855e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852",
      status: "FAILED",
      erro: "Falha na leitura OCR após múltiplas tentativas",
    },
  ],
};

describe("BatchImportProgressView", () => {
  it("formats file sizes accurately", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(1048576)).toBe("1.0 MB");
  });

  it("renders summary statistics and progress percentage", () => {
    const html = renderToStaticMarkup(
      <BatchImportProgressView summary={mockSummary} onRetryFailed={() => {}} />
    );

    expect(html).toContain("50% Concluído");
    expect(html).toContain("4 arquivos registrados");
    expect(html).toContain("001 - NF 1020 - Produtora.pdf");
    expect(html).toContain("004 - Imagem Danificada.png");
    expect(html).toContain("Reprocessar Falhas (1)");
  });

  it("renders file status badges and errors", () => {
    const html = renderToStaticMarkup(<BatchImportProgressView summary={mockSummary} />);

    expect(html).toContain("Concluído");
    expect(html).toContain("Extraindo OCR");
    expect(html).toContain("Falhou");
    expect(html).toContain("Falha na leitura OCR após múltiplas tentativas");
  });
});

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StructuredImportPanel } from "./StructuredImportPanel";

describe("prévia estruturada no site", () => {
  it("informa destino, limites e exige prévia antes de confirmar", () => {
    const html = renderToStaticMarkup(<StructuredImportPanel projectId="p1" pronac="1961" />);
    expect(html).toContain("PRONAC 1961");
    expect(html).toContain("não grava dados nem chama IA");
    expect(html).toContain("não valida PDFs ou pastas");
    expect(html).toContain("Validar sem gravar");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Confirmar importação/);
    expect(html).not.toContain("Planilha revisada salva");
  });
});

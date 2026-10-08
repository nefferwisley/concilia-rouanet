import { describe, expect, it } from "vitest";
import { canConfirmInput, type StructuredInput, type ValidatedInput } from "./importValidation";

const input: StructuredInput = { projectId: "p1", format: "xlsx", file: new File(["synthetic"], "planilha.xlsx") };
const preview: ValidatedInput = { input, report: { projeto_id: "p1", linhas_validas: 1 } };

describe("aprovação de importação estruturada", () => {
  it("exige prévia antes de confirmar", () => expect(canConfirmInput(null, input)).toBe(false));
  it("permite exatamente o destino e arquivo aprovados", () => expect(canConfirmInput(preview, input)).toBe(true));
  it("invalida ao trocar projeto", () => expect(canConfirmInput(preview, { ...input, projectId: "p2" })).toBe(false));
  it("bloqueia relatório de outro projeto", () => expect(canConfirmInput({ ...preview, report: { ...preview.report, projeto_id: "p2" } }, input)).toBe(false));
  it("invalida outro File com o mesmo nome", () => expect(canConfirmInput(preview, { ...input, file: new File(["synthetic"], "planilha.xlsx") })).toBe(false));
  it("invalida ao trocar formato", () => expect(canConfirmInput(preview, { ...input, format: "json" })).toBe(false));
  it("invalida ao trocar YAML", () => expect(canConfirmInput(preview, { ...input, config: new File(["config"], "config.yaml") })).toBe(false));
  it("bloqueia linhas inválidas e arquivo vazio", () => {
    expect(canConfirmInput({ ...preview, report: { ...preview.report, apto_para_importar: false } }, input)).toBe(false);
    expect(canConfirmInput({ ...preview, report: { ...preview.report, linhas_validas: 0 } }, input)).toBe(false);
  });
});

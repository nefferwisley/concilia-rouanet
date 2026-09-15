import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import * as xlsx from "xlsx";
import { applyCorrectionsToStaging, evaluateProject, inventorySource, type SourceInventory, type WorkspaceData } from "./project-data-evaluator";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })));
});

describe("project data evaluator", () => {
  it("detects an XLSX workbook even when it is named .csv and separates credits from debits", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "rouanet-evaluator-"));
    temporaryDirectories.push(directory);
    const rows = [
      ["PRONAC - Projeto Teste (CONTA 1)"],
      [],
      ["CONTROLE", "ENTRADA", "VALOR", "PAGAMENTO", "DATA", "VALOR", "SALDO", "ITEM/RUBRICA"],
      [null, "Patrocinador", 1000, null, new Date("2024-01-01T00:00:00Z"), null, 1000, null],
      ["1", null, null, "Fornecedor", new Date("2024-01-02T00:00:00Z"), 250, 750, "Produção"],
      ["TOTAL", null, null, "TOTAL GERAL", null, 250, 750, null],
    ];
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(rows), "Página1");
    xlsx.writeFile(workbook, path.join(directory, "controle.csv"), { bookType: "xlsx" });
    await fs.writeFile(path.join(directory, "evidencia.pdf"), "pdf");

    const inventory = await inventorySource("proj-test", directory);
    expect(inventory.movements).toHaveLength(2);
    expect(inventory.movements.map((item) => item.type)).toEqual(["CREDITO", "DEBITO"]);
    expect(inventory.pdfCount).toBe(1);
  });

  it("prepares additions but never automatically deletes unmatched system movements", () => {
    const source: SourceInventory = {
      projectId: "proj-test", sourceDirectory: "source", workbookPath: "source.xlsx", workbookSha256: "hash",
      workbookSheet: "Página1", title: "Projeto", pronac: null, fileCount: 1, pdfCount: 0,
      movements: [
        { type: "DEBITO", date: "2024-01-02", amount: 250, party: "Fornecedor", control: "1", balance: 750, rubricName: "Produção", rubricCode: "", sourceSheet: "Página1", sourceRow: 5, sourceRef: "source.xlsx" },
      ], incompleteRows: [],
    };
    const workspace: WorkspaceData = {
      projects: [{ id: "proj-test" }],
      transactions: { "proj-test": [{ id: "extra", tipo: "DEBITO", dataTransacao: "2024-01-03", valor: 10 }] },
    };
    const evaluation = evaluateProject(source, workspace);
    expect(evaluation.deterministicCorrections).toHaveLength(1);
    expect(evaluation.quarantine.some((item) => item.ruleId === "SYSTEM_MOVEMENT_NOT_IN_SOURCE")).toBe(true);
    const staged = applyCorrectionsToStaging(workspace, [evaluation]);
    expect(staged.transactions["proj-test"]).toHaveLength(2);
    expect(staged.transactions["proj-test"].some((item) => item.id === "extra")).toBe(true);
  });

  it("updates fields in staging when the ordered source and system sequence is deterministic", () => {
    const source = {
      projectId: "proj-test", sourceDirectory: "source", workbookPath: "source.xlsx", workbookSha256: "hash",
      workbookSheet: "Página1", title: "Projeto", pronac: null, fileCount: 1, pdfCount: 0, incompleteRows: [],
      movements: [
        { type: "DEBITO", date: "2022-01-05", amount: 300, party: "Fornecedor", control: "7", balance: 700, rubricName: "Produção", rubricCode: "", sourceSheet: "Página1", sourceRow: 6, sourceRef: "source.xlsx" },
      ],
    } satisfies SourceInventory;
    const workspace: WorkspaceData = {
      projects: [{ id: "proj-test" }],
      transactions: { "proj-test": [{ id: "tx-1", tipo: "DEBITO", data: "2024-01-01", valor: 300, favorecido: "Fornecedor", documentoBancario: "" }] },
    };
    const evaluation = evaluateProject(source, workspace);
    expect(evaluation.deterministicCorrections).toHaveLength(1);
    expect(evaluation.deterministicCorrections[0].action).toBe("UPDATE_TRANSACTION_FIELDS");
    const staged = applyCorrectionsToStaging(workspace, [evaluation]);
    expect(staged.transactions["proj-test"][0]).toMatchObject({ data: "2022-01-05", documentoBancario: "7" });
  });

  it("quarantines a source project that does not exist in the target workspace", () => {
    const source = {
      projectId: "proj-new", sourceDirectory: "source", workbookPath: "source.xlsx", workbookSha256: "hash",
      workbookSheet: "Página1", title: "Projeto novo", pronac: "23.8125", fileCount: 1, pdfCount: 0, movements: [], incompleteRows: [],
    } satisfies SourceInventory;
    const evaluation = evaluateProject(source, { projects: [], transactions: {} });
    expect(evaluation.systemMetrics).toBeNull();
    expect(evaluation.quarantine[0].ruleId).toBe("PROJECT_NOT_FOUND");
    expect(evaluation.deterministicCorrections).toHaveLength(0);
  });
});

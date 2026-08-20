import { describe, expect, it } from "vitest";
import { buildManifest } from "./buildManifest";

describe("buildManifest", () => {
  it("keeps relative paths and stable hashes", async () => {
    const file = new File(["abc"], "nota.pdf", { type: "application/pdf" });
    Object.defineProperty(file, "webkitRelativePath", {
      value: "Projeto/1. Pagamentos/nota.pdf",
    });

    const [item] = await buildManifest([file]);

    expect(item.relativePath).toBe("Projeto/1. Pagamentos/nota.pdf");
    expect(item.originalName).toBe("nota.pdf");
    expect(item.browserMime).toBe("application/pdf");
    expect(item.sizeBytes).toBe(3);
    expect(item.sha256).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("normalizes backslashes to forward slashes", async () => {
    const file = new File(["test"], "extrato.ofx", { type: "text/plain" });
    Object.defineProperty(file, "webkitRelativePath", {
      value: "Projeto\\Extratos\\extrato.ofx",
    });

    const [item] = await buildManifest([file]);

    expect(item.relativePath).toBe("Projeto/Extratos/extrato.ofx");
  });

  it("falls back to file.name when webkitRelativePath is empty", async () => {
    const file = new File(["123"], "documento.pdf", { type: "application/pdf" });
    const [item] = await buildManifest([file]);

    expect(item.relativePath).toBe("documento.pdf");
    expect(item.originalName).toBe("documento.pdf");
  });

  it("rejects path traversal segments (..)", async () => {
    const file = new File(["malicious"], "doc.pdf", { type: "application/pdf" });
    Object.defineProperty(file, "webkitRelativePath", {
      value: "Projeto/../secret/doc.pdf",
    });

    await expect(buildManifest([file])).rejects.toThrow(/caminho inválido/i);
  });

  it("rejects duplicate relative paths in the same batch", async () => {
    const file1 = new File(["a"], "doc.pdf", { type: "application/pdf" });
    const file2 = new File(["b"], "doc.pdf", { type: "application/pdf" });
    Object.defineProperty(file1, "webkitRelativePath", { value: "Folder/doc.pdf" });
    Object.defineProperty(file2, "webkitRelativePath", { value: "Folder/doc.pdf" });

    await expect(buildManifest([file1, file2])).rejects.toThrow(/duplicado/i);
  });
});

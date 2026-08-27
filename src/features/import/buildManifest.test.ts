import { describe, expect, it } from "vitest";
import { buildManifest } from "./buildManifest";

describe("buildManifest", () => {
  it("keeps relative paths and stable hashes", async () => {
    const file = new File(["abc"], "nota.pdf", { type: "application/pdf" });
    Object.defineProperty(file, "webkitRelativePath", { value: "Projeto/1. Pagamentos/nota.pdf" });
    const [item] = await buildManifest([file]);
    expect(item.relativePath).toBe("Projeto/1. Pagamentos/nota.pdf");
    expect(item.sha256).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});


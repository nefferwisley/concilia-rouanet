import { describe, expect, it } from "vitest";
import { createFiscalDocumentMatcher } from "./DriveFolderImportModal";

const duplicateSources = [
  { name: "Luis Cipullo.pdf", relativePath: "Passagens Porto Alegre/Luis Cipullo.pdf" },
  { name: "Luis Cipullo.pdf", relativePath: "Passagens Rio de Janeiro/Luis Cipullo.pdf" },
] as any[];

describe("createFiscalDocumentMatcher", () => {
  it("does not collapse files with the same name from different folders", () => {
    const matcher = createFiscalDocumentMatcher([
      { id: "doc-name-only", arquivoNotaNome: "Luis Cipullo.pdf" },
    ] as any[], duplicateSources);

    expect(matcher(duplicateSources[0])).toBeUndefined();
    expect(matcher(duplicateSources[1])).toBeUndefined();
  });

  it("uses the full source path when the extracted document provides it", () => {
    const rioDocument = {
      id: "doc-rio",
      arquivoNotaNome: "Luis Cipullo.pdf",
      arquivoCaminho: "Passagens Rio de Janeiro/Luis Cipullo.pdf",
    };
    const matcher = createFiscalDocumentMatcher([rioDocument] as any[], duplicateSources);

    expect(matcher(duplicateSources[1])).toBe(rioDocument);
    expect(matcher(duplicateSources[0])).toBeUndefined();
  });
});

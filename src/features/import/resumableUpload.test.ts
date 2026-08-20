import { describe, expect, it } from "vitest";
import { uploadImportFiles, type UploadFactory, type UploadJobInput } from "./resumableUpload";

describe("uploadImportFiles", () => {
  it("reports aggregate byte progress and finishes all files", async () => {
    const file1 = new File(["12345"], "doc1.pdf", { type: "application/pdf" });
    const file2 = new File(["1234567890"], "doc2.pdf", { type: "application/pdf" });

    const jobs: UploadJobInput[] = [
      {
        fileId: "f1",
        file: file1,
        storageKey: "user/proj/hash1/doc1.pdf",
        sizeBytes: 5,
      },
      {
        fileId: "f2",
        file: file2,
        storageKey: "user/proj/hash2/doc2.pdf",
        sizeBytes: 10,
      },
    ];

    const seenPercents: number[] = [];

    const mockFactory: UploadFactory = (file, options) => ({
      start: () => {
        options.onProgress?.(file.size, file.size);
        options.onSuccess?.();
      },
      abort: () => {},
    });

    await uploadImportFiles(
      {
        importacaoId: "imp-1",
        jobs,
        supabaseUrl: "https://mock.supabase.co",
        accessToken: "mock-token",
      },
      (progress) => {
        seenPercents.push(progress.percent);
      },
      mockFactory,
    );

    expect(seenPercents.length).toBeGreaterThan(0);
    expect(seenPercents.at(-1)).toBe(100);
  });
});

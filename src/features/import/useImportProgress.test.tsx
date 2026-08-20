import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useImportProgress } from "./useImportProgress";
import * as importApi from "./importApi";

vi.mock("./importApi", () => ({
  getImportStatus: vi.fn(),
}));

describe("useImportProgress", () => {
  it("fetches initial status and polls when active", async () => {
    vi.mocked(importApi.getImportStatus).mockResolvedValue({
      importacaoId: "imp-1",
      status: "PROCESSING",
      totalFiles: 10,
      uploadedFiles: 10,
      processedFiles: 5,
      failedFiles: 0,
      declaredEntriesCount: 20,
      bankMovementsCount: 30,
      percent: 50,
    });

    const { result } = renderHook(() =>
      useImportProgress({
        importacaoId: "imp-1",
        accessToken: "test-token",
        pollingIntervalMs: 500,
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.progress).not.toBeNull();
    });

    expect(result.current.progress?.percent).toBe(50);
    expect(result.current.progress?.processedFiles).toBe(5);
    expect(result.current.progress?.declaredEntriesCount).toBe(20);
  });
});

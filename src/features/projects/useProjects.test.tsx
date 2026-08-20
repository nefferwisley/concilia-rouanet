import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useProjects } from "./useProjects";

vi.mock("./projectApi", () => ({ listProjects: vi.fn().mockResolvedValue([]) }));
vi.mock("../../hooks/useSession", () => ({
  useSession: () => ({ session: { access_token: "token" }, loading: false }),
}));

describe("useProjects", () => {
  it("keeps a fresh account empty", async () => {
    const { result } = renderHook(() => useProjects());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.projects).toEqual([]);
    expect(result.current.activeProject).toBeNull();
  });
});

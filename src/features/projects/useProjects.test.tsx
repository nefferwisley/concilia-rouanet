import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { listProjects } from "./projectApi";
import type { OnlineProject } from "./projectTypes";
import { useProjects } from "./useProjects";

vi.mock("./projectApi", () => ({ listProjects: vi.fn().mockResolvedValue([]) }));
const sessionState = vi.hoisted(() => ({
  value: { session: { access_token: "token" }, loading: false },
}));
vi.mock("../../hooks/useSession", () => ({
  useSession: () => sessionState.value,
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}

describe("useProjects", () => {
  it("keeps a fresh account empty", async () => {
    const { result } = renderHook(() => useProjects());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.projects).toEqual([]);
    expect(result.current.activeProject).toBeNull();
  });

  it("keeps projects from the latest session when an earlier request resolves late", async () => {
    const requestA = deferred<OnlineProject[]>();
    const requestB = deferred<OnlineProject[]>();
    sessionState.value = { session: { access_token: "token-a" }, loading: false };
    vi.mocked(listProjects).mockImplementation((token) => (token === "token-a" ? requestA.promise : requestB.promise));

    const { result, rerender } = renderHook(() => useProjects());

    await waitFor(() => expect(listProjects).toHaveBeenCalledWith("token-a"));

    sessionState.value = { session: { access_token: "token-b" }, loading: false };
    rerender();

    await waitFor(() => expect(listProjects).toHaveBeenCalledWith("token-b"));

    await act(async () => {
      requestB.resolve([
        {
          id: "project-b",
          identifier: "123457",
          name: "Projeto B",
          proponent: "Associação B",
          regulatoryPackage: "ROUANET",
          status: "EMPTY",
          createdAt: "2026-08-20T10:00:00+00:00",
        },
      ]);
    });

    await waitFor(() => expect(result.current.projects).toHaveLength(1));

    await act(async () => {
      requestA.resolve([
        {
          id: "project-a",
          identifier: "123456",
          name: "Projeto A",
          proponent: "Associação A",
          regulatoryPackage: "ROUANET",
          status: "EMPTY",
          createdAt: "2026-08-20T10:00:00+00:00",
        },
      ]);
    });

    expect(result.current.projects.map((project) => project.id)).toEqual(["project-b"]);
  });
});

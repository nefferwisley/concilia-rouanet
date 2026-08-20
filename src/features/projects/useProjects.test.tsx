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

  it("clears user A immediately while user B GET is pending and ignores stale A responses", async () => {
    const requestB = deferred<OnlineProject[]>();
    sessionState.value = { session: { access_token: "token-a", user: { id: "user-a" } }, loading: false } as any;
    vi.mocked(listProjects)
      .mockResolvedValueOnce([
        {
          id: "project-a",
          identifier: "123456",
          name: "Projeto A",
          proponent: "Associação A",
          regulatoryPackage: "ROUANET",
          status: "EMPTY",
          createdAt: "2026-08-20T10:00:00+00:00",
        },
      ])
      .mockImplementationOnce(() => requestB.promise);

    const { result, rerender } = renderHook(() => useProjects());

    await waitFor(() => expect(result.current.projects.map((project) => project.id)).toEqual(["project-a"]));

    sessionState.value = { session: { access_token: "token-b", user: { id: "user-b" } }, loading: false } as any;
    rerender();

    expect(result.current.projects).toEqual([]);
    expect(result.current.activeProject).toBeNull();
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

    expect(result.current.projects.map((project) => project.id)).toEqual(["project-b"]);
  });
});

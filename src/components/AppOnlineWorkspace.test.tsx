import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import App from "../App";

const projectApiMocks = vi.hoisted(() => ({
  createProject: vi.fn(),
  listProjects: vi.fn(),
}));

vi.mock("../features/projects/projectApi", () => projectApiMocks);
vi.mock("../hooks/useSession", () => ({
  useSession: () => ({ session: { access_token: "test-token" }, loading: false }),
}));
vi.mock("../services/apiClient", () => ({
  apiClient: { checkHealth: vi.fn().mockResolvedValue({ online: false }) },
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
  projectApiMocks.createProject.mockReset();
  projectApiMocks.listProjects.mockReset();
});

it("creates the complete project, reloads the API list, and persists the returned selection", async () => {
  const createdProject = {
    id: "project-created",
    identifier: "246810",
    name: "Mostra Cultural Online",
    proponent: "Associação Cultural Viva",
    regulatoryPackage: "FSA_ANCINE" as const,
    status: "EMPTY" as const,
    createdAt: "2026-08-20T12:00:00.000Z",
  };
  projectApiMocks.listProjects.mockResolvedValueOnce([]).mockResolvedValue([createdProject]);
  projectApiMocks.createProject.mockResolvedValue(createdProject);

  render(<App />);
  fireEvent.click(await screen.findByRole("button", { name: /criar primeiro projeto/i }));
  fireEvent.change(screen.getByPlaceholderText("Ex: 243910"), {
    target: { value: " 246810 " },
  });
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "FSA_ANCINE" },
  });
  fireEvent.change(screen.getByPlaceholderText(/turnê sinfônica/i), {
    target: { value: " Mostra Cultural Online " },
  });
  fireEvent.change(screen.getByPlaceholderText(/associação cultural viva/i), {
    target: { value: " Associação Cultural Viva " },
  });
  fireEvent.click(screen.getByRole("button", { name: /criar e abrir projeto/i }));

  await waitFor(() =>
    expect(projectApiMocks.createProject).toHaveBeenCalledWith("test-token", {
      identifier: "246810",
      name: "Mostra Cultural Online",
      proponent: "Associação Cultural Viva",
      regulatoryPackage: "FSA_ANCINE",
    }),
  );
  await waitFor(() => expect(projectApiMocks.listProjects).toHaveBeenCalledTimes(2));
  await waitFor(() =>
    expect(localStorage.getItem("concilia_rouanet_active_project_id")).toBe("project-created"),
  );
  expect(projectApiMocks.createProject.mock.invocationCallOrder[0]).toBeLessThan(
    projectApiMocks.listProjects.mock.invocationCallOrder[1],
  );
  expect(screen.getAllByText("Mostra Cultural Online").length).toBeGreaterThan(0);
});

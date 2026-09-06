export const OFFICIAL_PROJECT_1961_ID = "proj-1961";
export const OFFICIAL_PROJECT_1961_DATA_VERSION = "validated-ledger-2026-09-06";
export const OFFICIAL_PROJECT_1961_DATA_VERSION_KEY =
  "concilia_rouanet_project_1961_data_version";

export function mergeOfficialProject1961<T extends { id: string }>(
  savedProjects: T[],
  officialProjects: T[],
  shouldRefresh: boolean,
): T[] {
  if (!shouldRefresh) return savedProjects;
  const officialProject = officialProjects.find(
    (project) => project.id === OFFICIAL_PROJECT_1961_ID,
  );
  if (!officialProject) return savedProjects;

  const existingIndex = savedProjects.findIndex(
    (project) => project.id === OFFICIAL_PROJECT_1961_ID,
  );
  if (existingIndex < 0) return [...savedProjects, officialProject];

  return savedProjects.map((project, index) =>
    index === existingIndex ? officialProject : project,
  );
}

export function mergeOfficialProject1961Dataset<T>(
  saved: Record<string, T[]>,
  official: Record<string, T[]>,
  shouldRefresh: boolean,
): Record<string, T[]> {
  if (!shouldRefresh || !official[OFFICIAL_PROJECT_1961_ID]) return saved;
  return {
    ...saved,
    [OFFICIAL_PROJECT_1961_ID]: official[OFFICIAL_PROJECT_1961_ID],
  };
}

import { ApiError, requestApi } from "../../services/apiClient";
import type { CreateOnlineProjectInput, OnlineProject } from "./projectTypes";

type BackendProject = {
  id: string;
  pronac: string;
  nome: string;
  proponente?: string | null;
  criado_em: string;
};

type BackendProjectList = BackendProject[] | { projetos?: BackendProject[] };

function mapProject(project: BackendProject): OnlineProject {
  return {
    id: project.id,
    identifier: project.pronac,
    name: project.nome,
    proponent: project.proponente ?? "",
    regulatoryPackage: "ROUANET",
    status: "EMPTY",
    createdAt: project.criado_em,
  };
}

function unwrapProjects(response: BackendProjectList): BackendProject[] {
  return Array.isArray(response) ? response : response.projetos ?? [];
}

export async function listProjects(token: string): Promise<OnlineProject[]> {
  const response = await requestApi<BackendProjectList>("/projetos", token);
  return unwrapProjects(response).map(mapProject);
}

export async function createProject(
  token: string,
  input: CreateOnlineProjectInput,
): Promise<OnlineProject> {
  const response = await requestApi<BackendProject>("/projetos", token, {
    method: "POST",
    body: JSON.stringify({
      pronac: input.identifier,
      nome: input.name,
      proponente: input.proponent,
      controller: input.controller,
      banco_nome: input.bankName,
      agencia: input.agency,
      conta: input.account,
    }),
  });

  return mapProject(response);
}

export { ApiError };

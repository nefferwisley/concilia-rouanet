import { ApiError, requestApi } from "../../services/apiClient";
import type { CreateOnlineProjectInput, OnlineProject } from "./projectTypes";

const REGULATORY_PACKAGES = ["ROUANET", "FSA_ANCINE"] as const;
const PROJECT_STATUSES = ["EMPTY", "IMPORTING", "REVIEW", "READY"] as const;

export class ApiContractError extends ApiError {
  constructor(message: string, body: unknown) {
    super(200, message, body);
    this.name = "ApiContractError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readRequiredString(project: Record<string, unknown>, field: string): string {
  const value = project[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiContractError(`Resposta de projeto inválida: campo obrigatório \"${field}\" ausente ou inválido.`, project);
  }

  return value;
}

function readRequiredNullableString(
  project: Record<string, unknown>,
  field: string,
): string | null {
  if (!Object.prototype.hasOwnProperty.call(project, field)) {
    throw new ApiContractError(`Resposta de projeto inválida: campo obrigatório "${field}" ausente.`, project);
  }

  const value = project[field];
  if (value === null) {
    return null;
  }
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiContractError(`Resposta de projeto inválida: campo "${field}" inválido.`, project);
  }

  return value;
}

function readEnum<T extends readonly string[]>(
  project: Record<string, unknown>,
  field: string,
  allowedValues: T,
): T[number] {
  const value = readRequiredString(project, field);
  if (!allowedValues.includes(value)) {
    throw new ApiContractError(`Resposta de projeto inválida: campo \"${field}\" possui valor não suportado.`, project);
  }

  return value as T[number];
}

function mapProject(value: unknown): OnlineProject {
  if (!isRecord(value)) {
    throw new ApiContractError("Resposta de projeto inválida: item precisa ser um objeto.", value);
  }

  const createdAt = readRequiredString(value, "criado_em");
  if (Number.isNaN(Date.parse(createdAt))) {
    throw new ApiContractError("Resposta de projeto inválida: campo \"criado_em\" possui data inválida.", value);
  }

  return {
    id: readRequiredString(value, "id"),
    identifier: readRequiredString(value, "pronac"),
    name: readRequiredString(value, "nome"),
    proponent: readRequiredNullableString(value, "proponente"),
    regulatoryPackage: readEnum(value, "pacote_regulatorio", REGULATORY_PACKAGES),
    status: readEnum(value, "status_processamento", PROJECT_STATUSES),
    createdAt,
  };
}

function unwrapProjects(response: unknown): unknown[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (isRecord(response) && Array.isArray(response.projetos)) {
    return response.projetos;
  }

  throw new ApiContractError("Resposta de listagem de projetos inválida.", response);
}

export async function listProjects(token: string): Promise<OnlineProject[]> {
  const response = await requestApi<unknown>("/projetos", token);
  return unwrapProjects(response).map(mapProject);
}

export async function createProject(
  token: string,
  input: CreateOnlineProjectInput,
): Promise<OnlineProject> {
  const response = await requestApi<unknown>("/projetos", token, {
    method: "POST",
    body: JSON.stringify({
      pronac: input.identifier,
      nome: input.name,
      proponente: input.proponent,
      pacote_regulatorio: input.regulatoryPackage,
      controller: input.controller,
      banco_nome: input.bankName,
      agencia: input.agency,
      conta: input.account,
    }),
  });

  return mapProject(response);
}

export { ApiError };

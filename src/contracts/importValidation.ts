export type StructuredFormat = "xlsx" | "json";

export interface ImportValidationReport {
  projeto_id: string;
  apto_para_importar?: boolean;
  linhas_total?: number;
  linhas_validas: number;
  linhas_invalidas?: number;
  linhas_alerta?: number;
  aba?: string;
  colunas_reconhecidas?: Array<{ conceito: string; coluna: number; cabecalho: string }>;
  colunas_nao_importadas?: Array<{ coluna: number; cabecalho: string }>;
  linhas_ignoradas?: Array<{ linha: number; motivo: string }>;
  mapeamento?: Array<{ conceito: string; chave: string }>;
  campos_nao_mapeados?: string[];
  erros?: Array<{ linha: number; motivos: string[] }>;
  alertas?: Array<{ linha: number; motivos: string[] }>;
}

export interface StructuredInput {
  projectId: string;
  format: StructuredFormat;
  file: File;
  config?: File;
}

export interface ValidatedInput {
  input: StructuredInput;
  report: ImportValidationReport;
}

// Identidade dos objetos File evita reutilizar a prévia após nova seleção,
// mesmo quando o profissional envia outro arquivo com o mesmo nome/tamanho.
export function canConfirmInput(previous: ValidatedInput | null, current: StructuredInput): boolean {
  return !!previous &&
    previous.input.projectId === current.projectId &&
    previous.report.projeto_id === current.projectId &&
    previous.input.format === current.format &&
    previous.input.file === current.file &&
    previous.input.config === current.config &&
    previous.report.linhas_validas > 0 &&
    previous.report.apto_para_importar !== false;
}

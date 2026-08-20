import type {
  ImportFileResponse,
  ImportManifestResponse,
  ImportProgressState,
  PreparedImportFile,
} from "./importTypes";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function createImportManifest(
  projectId: string,
  preparedFiles: PreparedImportFile[],
  accessToken: string,
): Promise<ImportManifestResponse> {
  const payload = {
    files: preparedFiles.map((f) => ({
      relative_path: f.relativePath,
      original_name: f.originalName,
      browser_mime: f.browserMime,
      size_bytes: f.sizeBytes,
      sha256: f.sha256,
    })),
  };

  const response = await fetch(`${API_URL}/api/v1/projetos/${projectId}/importacoes/manifesto`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: "Erro ao criar manifesto" }));
    throw new Error(err.detail || "Erro ao criar manifesto de importação");
  }

  const data = await response.json();
  return {
    importacaoId: data.importacao_id,
    projetoId: data.projeto_id,
    status: data.status,
    totalFiles: data.total_files,
    files: data.files.map((file: any) => ({
      id: file.id,
      relativePath: file.relative_path,
      originalName: file.original_name,
      storageKey: file.storage_key,
      sizeBytes: file.size_bytes,
      sha256: file.sha256,
      status: file.status,
      detectedType: file.detected_type,
      errorCode: file.error_code,
      errorMessage: file.error_message,
    })),
  };
}

export async function completeFileUpload(
  importacaoId: string,
  fileId: string,
  accessToken: string,
): Promise<ImportFileResponse> {
  const response = await fetch(
    `${API_URL}/api/v1/importacoes/${importacaoId}/arquivos/${fileId}/concluir`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: "Erro ao concluir upload" }));
    throw new Error(err.detail || "Erro ao concluir upload do arquivo");
  }

  const data = await response.json();
  return {
    id: data.id,
    relativePath: data.relative_path,
    originalName: data.original_name,
    storageKey: data.storage_key,
    sizeBytes: data.size_bytes,
    sha256: data.sha256,
    status: data.status,
    detectedType: data.detected_type,
    errorCode: data.error_code,
    errorMessage: data.error_message,
  };
}

export async function getImportStatus(
  importacaoId: string,
  accessToken: string,
): Promise<ImportProgressState> {
  const response = await fetch(`${API_URL}/api/v1/importacoes/${importacaoId}/status`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: "Erro ao consultar status" }));
    throw new Error(err.detail || "Erro ao consultar status da importação");
  }

  const data = await response.json();
  const total = Number(data.total_files) || 0;
  const processed = Number(data.processed_files) || 0;
  const failed = Number(data.failed_files) || 0;
  const percent = total > 0 ? Math.round(((processed + failed) / total) * 100) : 0;

  return {
    importacaoId: data.importacao_id,
    status: data.status,
    totalFiles: total,
    uploadedFiles: Number(data.uploaded_files) || 0,
    processedFiles: processed,
    failedFiles: failed,
    declaredEntriesCount: Number(data.declared_entries_count) || 0,
    bankMovementsCount: Number(data.bank_movements_count) || 0,
    percent,
  };
}

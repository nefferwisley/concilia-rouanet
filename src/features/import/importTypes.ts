export type PreparedImportFile = {
  file: File;
  relativePath: string;
  originalName: string;
  browserMime: string;
  sizeBytes: number;
  sha256: string;
};

export type ImportManifestItemInput = {
  relativePath: string;
  originalName: string;
  browserMime: string;
  sizeBytes: number;
  sha256: string;
};

export type ImportManifestCreateInput = {
  files: ImportManifestItemInput[];
};

export type ImportFileResponse = {
  id: string;
  relativePath: string;
  originalName: string;
  storageKey: string;
  sizeBytes: number;
  sha256: string;
  status: "RECEIVING" | "UPLOADED" | "PROCESSING" | "PARSED" | "FAILED";
  detectedType?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
};

export type ImportManifestResponse = {
  importacaoId: string;
  projetoId: string;
  status: string;
  totalFiles: number;
  files: ImportFileResponse[];
};

export type ImportProgressState = {
  importacaoId: string;
  status: string;
  totalFiles: number;
  uploadedFiles: number;
  processedFiles: number;
  failedFiles: number;
  declaredEntriesCount: number;
  bankMovementsCount: number;
  percent: number;
};

import type { PreparedImportFile } from "./importTypes";

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i += 1) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

export async function computeFileSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return bufferToHex(digest);
}

export function normalizeRelativePath(file: File): string {
  const rawPath = (file.webkitRelativePath && file.webkitRelativePath.trim()) || file.name.trim();
  const normalized = rawPath.replace(/\\/g, "/").replace(/^\/+/, "");

  const segments = normalized.split("/");
  for (const segment of segments) {
    if (segment === ".." || segment === ".") {
      throw new Error(`Caminho inválido detectado no arquivo "${file.name}": não são permitidos segmentos relativos.`);
    }
  }

  if (!normalized) {
    throw new Error("Nome de arquivo não pode ser vazio.");
  }

  return normalized;
}

export async function buildManifest(files: File[]): Promise<PreparedImportFile[]> {
  const prepared: PreparedImportFile[] = [];
  const seenPaths = new Set<string>();

  for (const file of files) {
    const relativePath = normalizeRelativePath(file);
    const lowerPath = relativePath.toLowerCase();
    if (seenPaths.has(lowerPath)) {
      throw new Error(`Caminho duplicado no lote: ${relativePath}`);
    }
    seenPaths.add(lowerPath);

    const sha256 = await computeFileSha256(file);
    prepared.push({
      file,
      relativePath,
      originalName: file.name,
      browserMime: file.type || "application/octet-stream",
      sizeBytes: file.size,
      sha256,
    });
  }

  return prepared;
}

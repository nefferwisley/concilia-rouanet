export type PreparedImportFile = {
  file: File;
  relativePath: string;
  originalName: string;
  browserMime: string;
  sizeBytes: number;
  sha256: string;
};

export async function buildManifest(files: File[]): Promise<PreparedImportFile[]> {
  const result: PreparedImportFile[] = [];
  const paths = new Set<string>();

  for (const file of files) {
    const rawPath = (file as any).webkitRelativePath || file.name;
    const relativePath = rawPath.replace(/\\/g, '/');
    if (relativePath.includes('..') || !file.name) continue;
    if (paths.has(relativePath)) continue;
    paths.add(relativePath);

    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    result.push({
      file,
      relativePath,
      originalName: file.name,
      browserMime: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      sha256
    });
  }

  return result;
}


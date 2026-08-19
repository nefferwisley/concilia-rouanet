// Google Workspace & Google Drive Service using GSI on the client
// Uses GIS client token to access Google Drive API v3

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  iconLink?: string;
}

export interface DriveExtractionResult {
  project?: {
    pronac: string;
    nome: string;
    proponente: string;
    cnpjCpf: string;
    segmento: string;
    artigoEnquadramento: string;
    dataInicioVigencia: string;
    dataFimVigencia: string;
    prazoLimitePrestacao: string;
    valorAprovado: number;
    valorCaptado: number;
    valorExecutado: number;
    bancoInfo: {
      banco: string;
      agencia: string;
      contaCaptacao: string;
      contaMovimento: string;
      saldoBloqueado: number;
      saldoMovimento: number;
      rendimentoAplicacao: number;
    };
    status: string;
    resumoProjeto: string;
  };
  rubrics: any[];
  transactions: any[];
  documents: any[];
  alerts: any[];
  tripartiteEntries: any[];
  importedFilesCount: number;
  importedFiles: string[];
}

declare global {
  interface Window {
    google?: any;
    gapi?: any;
  }
}

// Request Google OAuth Access Token on the client
export async function requestGoogleDriveToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    // Check if google accounts client is available
    if (!window.google?.accounts?.oauth2) {
      // Dynamically load gsi script if not already present
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        initOAuthClient(resolve, reject);
      };
      script.onerror = () => reject(new Error("Não foi possível carregar o Google Identity Services."));
      document.head.appendChild(script);
    } else {
      initOAuthClient(resolve, reject);
    }
  });
}

function initOAuthClient(resolve: (token: string) => void, reject: (err: any) => void) {
  try {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "619880767020-mock-or-env.apps.googleusercontent.com", // dynamically injected client id
      scope: "https://www.googleapis.com/auth/drive.readonly",
      callback: (tokenResponse: any) => {
        if (tokenResponse && tokenResponse.access_token) {
          resolve(tokenResponse.access_token);
        } else if (tokenResponse.error) {
          reject(new Error(tokenResponse.error_description || tokenResponse.error));
        } else {
          reject(new Error("Autorização cancelada ou token não obtido."));
        }
      },
    });
    tokenClient.requestAccessToken({ prompt: "consent" });
  } catch (e) {
    reject(e);
  }
}

// List files inside a specific Google Drive folder (recursively traversing all subfolders)
export async function listDriveFolderFiles(
  folderId: string,
  accessToken: string,
  parentPath: string = "",
  depth: number = 0
): Promise<DriveFileItem[]> {
  if (depth > 5) return []; // Safety recursion limit

  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const fields = encodeURIComponent("files(id, name, mimeType, size, modifiedTime, iconLink)");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=200`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Falha ao acessar o Google Drive (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rawFiles: DriveFileItem[] = data.files || [];
  const result: DriveFileItem[] = [];

  for (const item of rawFiles) {
    const currentPath = parentPath ? `${parentPath}/${item.name}` : item.name;

    if (item.mimeType === "application/vnd.google-apps.folder") {
      // Recursively fetch subfolder contents
      try {
        const subFiles = await listDriveFolderFiles(item.id, accessToken, currentPath, depth + 1);
        result.push(...subFiles);
      } catch (subErr) {
        console.warn(`Aviso: Não foi possível ler a subpasta ${item.name}:`, subErr);
      }
    } else {
      // It's a file
      result.push({
        ...item,
        name: parentPath ? `[${parentPath}] ${item.name}` : item.name,
      });
    }
  }

  return result;
}

// Download file content (binary / text / exported google docs/sheets)
export async function downloadDriveFile(
  fileId: string,
  mimeType: string,
  accessToken: string
): Promise<{ textContent?: string; base64?: string; isBinary: boolean; mimeType: string }> {
  // If it's a Google Doc or Google Sheet, use export API
  let downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  let targetMimeType = mimeType;

  if (mimeType === "application/vnd.google-apps.spreadsheet") {
    downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/csv`;
    targetMimeType = "text/csv";
  } else if (mimeType === "application/vnd.google-apps.document") {
    downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
    targetMimeType = "text/plain";
  }

  const response = await fetch(downloadUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Erro ao baixar arquivo ${fileId}: ${response.statusText}`);
  }

  if (
    targetMimeType.includes("text") ||
    targetMimeType.includes("csv") ||
    targetMimeType.includes("json") ||
    targetMimeType.includes("xml")
  ) {
    const textContent = await response.text();
    return { textContent, isBinary: false, mimeType: targetMimeType };
  } else {
    // ArrayBuffer to Base64 for PDFs, Excel, Images
    const buffer = await response.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    return { base64, isBinary: true, mimeType: targetMimeType };
  }
}

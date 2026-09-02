import React, { useState, useRef } from "react";
import {
  FolderUp,
  FolderTree,
  FolderOpen,
  Key,
  FileSpreadsheet,
  FileText,
  FileArchive,
  Building,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Upload,
  Layers,
  Files,
  X,
  Plus,
  Filter,
  Zap,
} from "lucide-react";
import JSZip from "jszip";
import { PronacProject, BudgetRubric, BankTransaction, FiscalDocument, AuditAlert, TripartiteEntry } from "../types";
import { requestGoogleDriveToken } from "../services/googleDriveService";
import { runRealtimeTripartiteReconciliation } from "../utils/shadowLedger";

export interface UploadedFileItem {
  id: string;
  file?: File;
  name: string;
  relativePath: string;
  subfolder: string;
  size: number;
  mimeType: string;
  base64?: string;
  textContent?: string;
}

interface DriveFolderImportModalProps {
  isOpen: boolean;
  activeProject: PronacProject;
  currentRubrics: BudgetRubric[];
  currentTransactions: BankTransaction[];
  currentDocuments: FiscalDocument[];
  currentAlerts: AuditAlert[];
  currentTripartiteEntries: TripartiteEntry[];
  onClose: () => void;
  onImportComplete: (data: {
    project: PronacProject;
    rubrics: BudgetRubric[];
    transactions: BankTransaction[];
    documents: FiscalDocument[];
    alerts: AuditAlert[];
    tripartiteEntries: TripartiteEntry[];
  }) => void;
}

export const DriveFolderImportModal: React.FC<DriveFolderImportModalProps> = ({
  isOpen,
  activeProject,
  currentRubrics,
  currentTransactions,
  currentDocuments,
  currentAlerts,
  currentTripartiteEntries,
  onClose,
  onImportComplete,
}) => {
  const [activeTab, setActiveTab] = useState<"folder_files" | "drive_token">("folder_files");
  const [folderUrl, setFolderUrl] = useState("https://drive.google.com/drive/folders/13QvuLP5B2USqBBUyaHum7C_DhYdX387F");
  const [accessToken, setAccessToken] = useState("");
  const [status, setStatus] = useState<"idle" | "connecting" | "listing" | "processing" | "done" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [uploadedItems, setUploadedItems] = useState<UploadedFileItem[]>([]);
  const [selectedSubfolderFilter, setSelectedSubfolderFilter] = useState<string>("all");
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const extractFolderId = (url: string): string => {
    const match = url.match(/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : url.trim();
  };

  // Convert File to Base64 (lightweight)
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.includes(",") ? result.split(",")[1] : result;
        resolve(base64);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Unpack ZIP recursively
  const processZipFile = async (zipFile: File): Promise<UploadedFileItem[]> => {
    const zip = await JSZip.loadAsync(zipFile);
    const items: UploadedFileItem[] = [];

    for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
      if (zipEntry.dir) continue;
      // Skip system hidden files
      if (relativePath.includes("__MACOSX") || relativePath.includes(".DS_Store") || relativePath.startsWith(".")) {
        continue;
      }

      const parts = relativePath.split("/");
      const fileName = parts[parts.length - 1];
      const subfolder = parts.length > 1 ? parts.slice(0, -1).join(" / ") : "Raiz";

      const blob = await zipEntry.async("blob");
      const isSheetOrText =
        fileName.endsWith(".xlsx") ||
        fileName.endsWith(".xls") ||
        fileName.endsWith(".csv") ||
        fileName.endsWith(".ofx") ||
        fileName.endsWith(".xml") ||
        fileName.endsWith(".txt");

      const mimeType =
        blob.type ||
        (fileName.endsWith(".pdf")
          ? "application/pdf"
          : fileName.endsWith(".xlsx")
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : fileName.endsWith(".xls")
          ? "application/vnd.ms-excel"
          : fileName.endsWith(".csv")
          ? "text/csv"
          : fileName.endsWith(".xml")
          ? "application/xml"
          : fileName.endsWith(".ofx")
          ? "text/plain"
          : "application/octet-stream");

      let textContent: string | undefined = undefined;
      let base64: string | undefined = undefined;

      if (isSheetOrText) {
        if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
          base64 = await zipEntry.async("base64");
        } else {
          textContent = await zipEntry.async("string");
        }
      }

      items.push({
        id: `zip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: fileName,
        relativePath: relativePath,
        subfolder: subfolder,
        size: blob.size,
        mimeType: mimeType,
        base64: base64,
        textContent: textContent,
      });
    }

    return items;
  };

  // Handle standard file/folder picker selection
  const handleFileSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const rawFiles: File[] = Array.from(e.target.files);
    const newItems: UploadedFileItem[] = [];

    setStatus("connecting");
    setStatusMessage("Indexando arquivos e subpastas selecionadas...");
    setProgressPercent(20);

    try {
      for (const file of rawFiles) {
        if (file.name.endsWith(".zip")) {
          const zipItems = await processZipFile(file);
          newItems.push(...zipItems);
        } else {
          const relativePath = (file as any).webkitRelativePath || file.name;
          const parts = relativePath.split("/");
          const subfolder = parts.length > 1 ? parts.slice(0, -1).join(" / ") : "Raiz";
          newItems.push({
            id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            file,
            name: file.name,
            relativePath: relativePath,
            subfolder: subfolder,
            size: file.size,
            mimeType: file.type || "application/octet-stream",
          });
        }
      }

      setUploadedItems((prev) => [...prev, ...newItems]);
      setProgressPercent(100);
      setStatus("idle");
      setStatusMessage("");
    } catch (err: any) {
      console.error("Erro ao ler arquivos/subpastas:", err);
      setStatus("error");
      setStatusMessage(err.message || "Erro ao ler arquivos selecionados");
    } finally {
      if (e.target) e.target.value = "";
    }
  };

  // Drag and drop with recursive directory traversal (supports multi-level subfolders)
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);

    setStatus("connecting");
    setStatusMessage("Examinando árvore de diretórios e subpastas...");
    setProgressPercent(30);

    const newItems: UploadedFileItem[] = [];

    const traverseEntry = async (entry: any, currentPath: string = "") => {
      if (!entry) return;
      if (entry.isFile) {
        const file: File = await new Promise<File>((res, rej) => entry.file(res, rej));
        if (file.name.endsWith(".zip")) {
          const zipItems = await processZipFile(file);
          newItems.push(...zipItems);
        } else {
          const fullRelPath = currentPath ? `${currentPath}/${file.name}` : file.name;
          const subfolder = currentPath.replace(/\//g, " / ") || "Raiz";
          newItems.push({
            id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            file,
            name: file.name,
            relativePath: fullRelPath,
            subfolder: subfolder,
            size: file.size,
            mimeType: file.type || "application/octet-stream",
          });
        }
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        const readAllEntries = async (): Promise<any[]> => {
          let all: any[] = [];
          const read = async (): Promise<any[]> => new Promise((res) => dirReader.readEntries(res));
          let batch = await read();
          while (batch && batch.length > 0) {
            all = all.concat(batch);
            batch = await read();
          }
          return all;
        };

        const entries = await readAllEntries();
        const nextPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
        for (const child of entries) {
          await traverseEntry(child, nextPath);
        }
      }
    };

    try {
      const items = e.dataTransfer.items;
      if (items && items.length > 0) {
        const entriesToProcess = [];
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if ((item as any).webkitGetAsEntry) {
            const entry = (item as any).webkitGetAsEntry();
            if (entry) entriesToProcess.push(entry);
          }
        }
        for (const entry of entriesToProcess) {
          await traverseEntry(entry);
        }
      } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const dropFiles: File[] = Array.from(e.dataTransfer.files);
        for (const file of dropFiles) {
          if (file.name.endsWith(".zip")) {
            const zipItems = await processZipFile(file);
            newItems.push(...zipItems);
          } else {
            newItems.push({
              id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              file,
              name: file.name,
              relativePath: file.name,
              subfolder: "Raiz",
              size: file.size,
              mimeType: file.type || "application/octet-stream",
            });
          }
        }
      }

      setUploadedItems((prev) => [...prev, ...newItems]);
      setProgressPercent(100);
      setStatus("idle");
      setStatusMessage("");
    } catch (err: any) {
      console.error("Erro no drag and drop recursivo:", err);
      setStatus("error");
      setStatusMessage(err.message || "Falha ao escanear subpastas.");
    }
  };

  const handleRemoveItem = (id: string) => {
    setUploadedItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Funcao de Auto-Sync direto do Backend (Desktop Local)
  const handleAutoSyncLocal = async () => {
    setStatus("connecting");
    setStatusMessage("Sincronizando arquivos diretos da pasta 3. 1961 pelo Backend...");
    setProgressPercent(20);
    try {
      const resp = await fetch("/api/local-folder/sync", { method: "POST" });
      const data = await resp.json();
      
      if (!data.success || data.error) {
        throw new Error(data.error || "Erro desconhecido ao ler a pasta pelo backend.");
      }

      setProgressPercent(60);
      
      const newItems: UploadedFileItem[] = data.filesList.map((f: any, idx: number) => ({
        id: `local-sync-${Date.now()}-${idx}`,
        name: f.name,
        relativePath: f.relativePath,
        subfolder: "3. 1961 (Sincronização Automática)" + (f.subfolder !== "." && f.subfolder ? " / " + f.subfolder : ""),
        size: f.size,
        mimeType: f.mimeType,
        base64: f.base64,
        textContent: f.textContent
      }));

      setUploadedItems((prev) => [...prev, ...newItems]);
      setProgressPercent(100);
      setStatus("idle");
      setStatusMessage("");
    } catch (err: any) {
      console.error("Erro no auto sync:", err);
      setStatus("error");
      setStatusMessage(err.message || "Falha ao escanear a pasta via Backend.");
    }
  };

  // Distinct subfolders list for grouping / filtering
  const distinctSubfolders = Array.from(new Set(uploadedItems.map((item) => item.subfolder))).sort();

    const filteredItems =
      selectedSubfolderFilter === "all"
        ? uploadedItems
        : uploadedItems.filter((item) => item.subfolder === selectedSubfolderFilter);
        
    const handleStartExtraction = async () => {
    setStatus("processing");
    setProgressPercent(5);
    setStatusMessage(`Preparando os arquivos de ${activeProject.nome}...`);

    try {
      if (activeTab === "folder_files" && uploadedItems.length > 0) {
        const configuredApiBaseUrl = import.meta.env.VITE_API_URL?.trim();
        if (import.meta.env.PROD || !configuredApiBaseUrl) {
          const extractedTransactions: BankTransaction[] = [];
          const extractedDocuments: FiscalDocument[] = [];
          const extractedRubrics: BudgetRubric[] = [];
          const maxBatchBytes = 5 * 1024 * 1024;
          let batch: any[] = [];
          let batchBytes = 0;
          let processedFiles = 0;

          const extractBatch = async () => {
            if (batch.length === 0) return;
            setStatusMessage(`Extraindo lote de ${batch.length} arquivo(s) (${processedFiles + 1}-${processedFiles + batch.length}/${uploadedItems.length})...`);
            let response: Response;
            try {
              response = await fetch("/api/gemini/extract-project-files", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ files: batch }),
              });
            } catch {
              throw new Error(`Falha de conexão ao enviar o lote ${processedFiles + 1}-${processedFiles + batch.length}.`);
            }
            const result = await response.json().catch(() => null);
            if (!response.ok || !result?.success || !result.data) {
              throw new Error(result?.error || `Não foi possível extrair o lote ${processedFiles + 1}-${processedFiles + batch.length}.`);
            }
            extractedTransactions.push(...(result.data.transactions || []));
            extractedDocuments.push(...(result.data.documents || []));
            extractedRubrics.push(...(result.data.rubrics || []));
            processedFiles += batch.length;
            batch = [];
            batchBytes = 0;
            setProgressPercent(5 + Math.round((processedFiles / uploadedItems.length) * 90));
          };

          for (const [index, item] of uploadedItems.entries()) {
            setStatusMessage(`Lendo ${item.name} (${index + 1}/${uploadedItems.length})...`);
            const file = {
              name: item.name,
              relativePath: item.relativePath,
              subfolder: item.subfolder,
              size: item.size,
              mimeType: item.mimeType,
              base64: item.base64 || (item.file ? await fileToBase64(item.file) : undefined),
              textContent: item.textContent,
            };
            if (batch.length > 0 && batchBytes + item.size > maxBatchBytes) await extractBatch();
            batch.push(file);
            batchBytes += item.size;
            if (batch.length >= 10) await extractBatch();
          }
          await extractBatch();

          const synced = runRealtimeTripartiteReconciliation(
            extractedTransactions,
            extractedDocuments,
            extractedRubrics,
            activeProject,
          );
          setProgressPercent(100);
          setStatus("done");
          setStatusMessage(`${processedFiles} arquivos importados em ${activeProject.nome}.`);
          onImportComplete({
            project: activeProject,
            rubrics: synced.rubrics,
            transactions: synced.transactions,
            documents: synced.documents,
            alerts: synced.alerts,
            tripartiteEntries: synced.tripartiteEntries,
          });
          onClose();
          return;
        }

        const token = localStorage.getItem("rouanet_auth_token");
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
        const baseUrl = configuredApiBaseUrl;
        const normalizeId = (value: string) => value.replace(/\D/g, "");
        const activePronac = normalizeId(activeProject.pronac || "");
        if (!activePronac) throw new Error("O projeto selecionado precisa ter um PRONAC válido antes da importação.");

        const projectsResponse = await fetch(`${baseUrl}/projetos?pronac=${encodeURIComponent(activeProject.pronac)}&limit=100`, { headers });
        if (!projectsResponse.ok) throw new Error(`Não foi possível localizar o projeto (${projectsResponse.status}).`);
        const projectsPayload = await projectsResponse.json();
        const onlineProjects = projectsPayload.projetos || [];
        let onlineProject = onlineProjects.find(
          (project: any) => normalizeId(project.pronac || "") === activePronac
        );

        if (!onlineProject) {
          const createResponse = await fetch(`${baseUrl}/projetos`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
              pronac: activeProject.pronac,
              nome: activeProject.nome,
              proponente: activeProject.proponente,
              banco_nome: activeProject.bancoInfo?.banco,
              agencia: activeProject.bancoInfo?.agencia,
              conta: activeProject.bancoInfo?.contaMovimento,
            }),
          });
          if (!createResponse.ok) throw new Error(`Não foi possível cadastrar o projeto de destino (${createResponse.status}).`);
          onlineProject = await createResponse.json();
        }
        if (normalizeId(onlineProject.pronac || "") !== activePronac) {
          throw new Error("O projeto online não corresponde ao PRONAC selecionado. A importação foi cancelada.");
        }

        setProgressPercent(15);
        setStatusMessage(`Enviando ${uploadedItems.length} arquivos para ${activeProject.nome}...`);
        const zip = new JSZip();
        uploadedItems.forEach((item) => {
          const path = item.relativePath || item.name;
          if (item.file) zip.file(path, item.file);
          else if (item.base64) zip.file(path, item.base64, { base64: true });
          else if (item.textContent !== undefined) zip.file(path, item.textContent);
        });
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const formData = new FormData();
        formData.append("comprovantes", new File([zipBlob], `${activeProject.pronac}-documentos.zip`, { type: "application/zip" }));
        const importResponse = await fetch(`${baseUrl}/projetos/${onlineProject.id}/importar-pasta`, {
          method: "POST",
          headers,
          body: formData,
        });
        if (!importResponse.ok) throw new Error(`Falha ao iniciar a extração (${importResponse.status}).`);
        const { conciliacao_id: conciliacaoId } = await importResponse.json();

        let extractionStatus: any;
        for (let attempt = 0; attempt < 300; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 1200));
          const statusResponse = await fetch(`${baseUrl}/conciliacao/${conciliacaoId}`, { headers });
          if (!statusResponse.ok) throw new Error(`Falha ao acompanhar a extração (${statusResponse.status}).`);
          extractionStatus = await statusResponse.json();
          setProgressPercent(extractionStatus.progresso || 20);
          setStatusMessage(extractionStatus.etapa || "Processando arquivos...");
          if (extractionStatus.status === "erro") throw new Error(extractionStatus.erro_fatal || "Falha na extração.");
          if (extractionStatus.status === "sucesso") break;
        }
        if (extractionStatus?.status !== "sucesso") throw new Error("A extração excedeu o tempo máximo de espera.");

        const [bankResponse, rubricsResponse] = await Promise.all([
          fetch(`${baseUrl}/projetos/${onlineProject.id}/extrato/pendentes`, { headers }),
          fetch(`${baseUrl}/projetos/${onlineProject.id}/rubricas`, { headers }),
        ]);
        if (!bankResponse.ok) throw new Error(`Os arquivos foram processados, mas os lançamentos não puderam ser carregados (${bankResponse.status}).`);
        const bankPayload = await bankResponse.json();
        const rubricsPayload = rubricsResponse.ok ? await rubricsResponse.json() : { rubricas: [] };
        const bankMovements: BankTransaction[] = (bankPayload.movimentos || []).map((movement: any) => ({
          id: movement.id,
          data: movement.data,
          tipo: movement.tipo,
          valor: Math.abs(Number(movement.valor || 0)),
          descricaoExtrato: movement.historico,
          descricaoOriginalExtrato: movement.historico,
          documentoBancario: movement.documento,
          status: movement.status_conciliacao === "CONCILIADO" ? "CONCILIADO" : "PENDENTE",
          statusConciliacao: movement.status_conciliacao,
        }));
        const documentTransactions: BankTransaction[] = (bankPayload.transacoes || []).map((transaction: any) => ({
          id: transaction.id,
          data: transaction.data_pagamento,
          tipo: "DEBITO",
          valor: Math.abs(Number(transaction.valor_bruto || 0)),
          descricaoExtrato: transaction.fornecedor || transaction.razao_social || transaction.prestador || "Pagamento importado",
          descricaoOriginalExtrato: transaction.fornecedor || transaction.razao_social || transaction.prestador,
          documentoBancario: transaction.documento,
          favorecido: transaction.fornecedor || transaction.razao_social || transaction.prestador,
          matchedRubricId: transaction.rubrica_codigo,
          status: transaction.status === "CONCILIADO" ? "CONCILIADO" : "PENDENTE",
          statusConciliacao: transaction.status,
        }));
        const importedTransactions = bankMovements.length > 0 ? bankMovements : documentTransactions;
        const importedRubrics: BudgetRubric[] = (rubricsPayload.rubricas || []).map((rubric: any) => ({
          id: rubric.id,
          itemNumero: rubric.codigo,
          nome: rubric.descricao,
          nomeRubrica: rubric.descricao,
          descricaoDetalhada: rubric.descricao_completa,
          valorAprovado: Number(rubric.valor_orcado || 0),
          valorTotalAprovado: Number(rubric.valor_orcado || 0),
          valorExecutado: 0,
          etapa: "Orçamento do projeto",
        }));
        const transactions = importedTransactions.length > 0 ? importedTransactions : currentTransactions;
        const rubrics = importedRubrics.length > 0 ? importedRubrics : currentRubrics;

        setProgressPercent(100);
        setStatus("done");
        setStatusMessage(`${transactions.length} movimentações carregadas em ${activeProject.nome}.`);
        onImportComplete({
          project: activeProject,
          rubrics,
          transactions,
          documents: currentDocuments,
          alerts: currentAlerts,
          tripartiteEntries: currentTripartiteEntries,
        });
        onClose();
        return;
      }

      // Google Drive Direct Token Flow (with recursive subfolder listing)
      const folderId = extractFolderId(folderUrl);
      let token = accessToken.trim();

      if (!token) {
        throw new Error(
          "Para ler diretamente via link do Drive, autentique com o Google ou selecione/arraste os arquivos/pasta na aba 'Selecionar Pasta / Arquivos'."
        );
      }

      setStatus("listing");
      setProgressPercent(40);
      setStatusMessage("Listando recursivamente todas as pastas e subpastas no Google Drive...");

      const { listDriveFolderFiles } = await import("../services/googleDriveService");
      const files = await listDriveFolderFiles(folderId, token);

      if (files.length === 0) {
        throw new Error("Nenhum arquivo encontrado na pasta especificada do Google Drive.");
      }

      setStatus("processing");
      setProgressPercent(80);
      setStatusMessage(`Lendo e cruzando dados de ${files.length} arquivos (incluindo subpastas)...`);

      const processResp = await fetch("/api/gemini/extract-drive-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderId,
          accessToken: token,
          filesList: files,
        }),
      });

      const result = await processResp.json();

      if (!result.success || !result.data || !result.data.project) {
        throw new Error(result.error || "Não foi possível extrair os dados da pasta.");
      }

      setProgressPercent(100);
      setStatus("done");
      setStatusMessage(`Extração e sincronização Shadow Ledger concluídas com sucesso! ${result.data.importedFilesCount || files.length} arquivos processados.`);

      const synced = runRealtimeTripartiteReconciliation(
        result.data.transactions || [],
        result.data.documents || [],
        result.data.rubrics || [],
        activeProject
      );

      setTimeout(() => {
        onImportComplete({
          project: activeProject,
          rubrics: synced.rubrics,
          transactions: synced.transactions,
          documents: synced.documents,
          alerts: synced.alerts,
          tripartiteEntries: synced.tripartiteEntries,
        });
        onClose();
      }, 700);
    } catch (err: any) {
      console.error("Erro na extração:", err);
      setStatus("error");
      const rawMsg = err.message || "";
      if (rawMsg.includes("503") || rawMsg.includes("high demand") || rawMsg.includes("UNAVAILABLE")) {
        setStatusMessage(
          "Servidores com alta demanda. Aguarde alguns instantes e tente processar a pasta novamente."
        );
      } else {
        setStatusMessage(rawMsg || "Ocorreu um erro ao extrair os arquivos da pasta.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl p-4 sm:p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 flex-wrap">
                Importar Pasta e Subpastas
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Ultra Rápido (1-3s)
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Lê pastas principais e subpastas (Comprovantes, Notas, Extratos, Planilhas e Relatórios)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("folder_files")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === "folder_files"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" /> Selecionar Pastas / ZIP
          </button>
          <button
            onClick={() => setActiveTab("drive_token")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === "drive_token"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" /> Google Drive Link + Token
          </button>
        </div>

        {activeTab === "folder_files" ? (
          <div className="space-y-4">
            {/* Dropzone with multi-mode selection: Folder with subfolders, ZIP, Files */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOver(true);
              }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-5 sm:p-6 text-center transition ${
                isDraggingOver
                  ? "border-emerald-400 bg-emerald-950/40 scale-[1.01]"
                  : "border-slate-700 bg-slate-950/60 hover:border-slate-500"
              }`}
            >
              <div className="w-12 h-12 mx-auto rounded-xl bg-slate-800 border border-slate-700 text-emerald-400 flex items-center justify-center mb-3">
                <FolderOpen className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-white">
                Arraste qualquer Pasta, Subpastas, ZIP ou Arquivos aqui
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                O motor vasculha automaticamente todos os níveis de subpastas e processa arquivos PDF, Planilhas (.xlsx), OFX, XMLs e comprovantes em 2 segundos.
              </p>

              {/* 3 Upload Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  className="px-3 py-2.5 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/40 hover:border-emerald-400 rounded-xl text-xs font-bold text-emerald-300 flex items-center justify-center gap-2 transition"
                >
                  <FolderTree className="w-4 h-4 text-emerald-400" />
                  📁 Pasta
                </button>

                <button
                  type="button"
                  onClick={() => zipInputRef.current?.click()}
                  className="px-3 py-2.5 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/40 hover:border-indigo-400 rounded-xl text-xs font-bold text-indigo-300 flex items-center justify-center gap-2 transition"
                >
                  <FileArchive className="w-4 h-4 text-indigo-400" />
                  📦 .ZIP
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-xl text-xs font-bold text-slate-200 flex items-center justify-center gap-2 transition"
                >
                  <Files className="w-4 h-4 text-slate-300" />
                  📄 Arquivos
                </button>

                <button
                  type="button"
                  onClick={handleAutoSyncLocal}
                  className="px-3 py-2.5 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/40 hover:border-amber-400 rounded-xl text-xs font-bold text-amber-300 flex items-center justify-center gap-2 transition"
                >
                  <Zap className="w-4 h-4 text-amber-400" />
                  Sync Disco C:
                </button>
              </div>
            </div>

            {/* Hidden Inputs */}
            <input
              ref={folderInputRef}
              type="file"
              multiple
              // @ts-ignore
              webkitdirectory=""
              directory=""
              onChange={handleFileSelection}
              className="hidden"
            />
            <input
              ref={zipInputRef}
              type="file"
              accept=".zip,.rar,.tar,.gz"
              onChange={handleFileSelection}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelection}
              className="hidden"
              accept=".pdf,.xlsx,.xls,.csv,.ofx,.xml,.png,.jpg,.jpeg,.txt,.zip"
            />

            {/* Uploaded Files & Subfolder Explorer Preview */}
            {uploadedItems.length > 0 && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">
                      {uploadedItems.length} arquivos carregados
                    </span>
                    <span className="text-[11px] bg-emerald-500/10 text-emerald-400 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                      {distinctSubfolders.length} subpastas
                    </span>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-emerald-400 hover:text-emerald-300 text-xs font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Mais
                    </button>
                    <button
                      onClick={() => setUploadedItems([])}
                      className="text-rose-400 hover:underline text-xs"
                    >
                      Limpar todos
                    </button>
                  </div>
                </div>

                {/* Subfolder Filter Chips */}
                {distinctSubfolders.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                    <span className="text-slate-500 flex items-center gap-1 shrink-0">
                      <Filter className="w-3 h-3" /> Subpasta:
                    </span>
                    <button
                      onClick={() => setSelectedSubfolderFilter("all")}
                      className={`px-2.5 py-1 rounded-md transition shrink-0 ${
                        selectedSubfolderFilter === "all"
                          ? "bg-emerald-500 text-slate-950 font-bold"
                          : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                      }`}
                    >
                      Todas ({uploadedItems.length})
                    </button>
                    {distinctSubfolders.map((sf, idx) => {
                      const count = uploadedItems.filter((it) => it.subfolder === sf).length;
                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedSubfolderFilter(sf)}
                          className={`px-2.5 py-1 rounded-md transition shrink-0 flex items-center gap-1 ${
                            selectedSubfolderFilter === sf
                              ? "bg-emerald-500 text-slate-950 font-bold"
                              : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                          }`}
                        >
                          <FolderTree className="w-3 h-3" />
                          {sf} ({count})
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* File List Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between gap-2 text-xs hover:border-slate-700 transition"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        {item.name.endsWith(".xlsx") || item.name.endsWith(".xls") ? (
                          <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : item.name.endsWith(".pdf") ? (
                          <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                        ) : item.name.endsWith(".zip") ? (
                          <FileArchive className="w-4 h-4 text-indigo-400 shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                        )}
                        <div className="overflow-hidden">
                          <p className="truncate text-slate-200 font-medium" title={item.name}>
                            {item.name}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate flex items-center gap-1 font-mono">
                            <span className="text-emerald-500/80">📁 {item.subfolder}</span>
                            <span>•</span>
                            <span>{(item.size / 1024).toFixed(1)} KB</span>
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveItem(item.id);
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition"
                        aria-label="Remover arquivo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Link da Pasta do Google Drive:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={folderUrl}
                  onChange={(e) => setFolderUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
                />
                <a
                  href={folderUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
                  title="Abrir pasta no navegador"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              <p className="text-[11px] text-emerald-400/90 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                O leitor varre recursivamente todas as subpastas da URL fornecida.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex justify-between items-end">
                <span>OAuth Access Token do Google Drive:</span>
                <button
                  onClick={async () => {
                    try {
                      setStatus("connecting");
                      setProgressPercent(30);
                      setStatusMessage("Solicitando acesso ao Google Drive...");
                      const token = await requestGoogleDriveToken();
                      setAccessToken(token);
                      setProgressPercent(100);
                      setStatus("idle");
                      setStatusMessage("");
                    } catch (err: any) {
                      setStatus("error");
                      setStatusMessage(err.message || "Erro ao conectar com Google");
                    }
                  }}
                  className="text-[10px] bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 px-2 py-1 rounded border border-indigo-500/30 transition flex items-center gap-1"
                >
                  <Key className="w-3 h-3" /> Login Automático
                </button>
              </label>
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Cole aqui o Bearer token do Google Workspace..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Dica: Se preferir, baixe a pasta do Drive em seu dispositivo (arquivo .ZIP) e arraste para a aba <strong>'Selecionar Pastas / ZIP'</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Informative Note */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Leitura Pura e Rigorosa de Subpastas:
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Todas as subpastas (como <em>01 - Notas Fiscais</em>, <em>02 - Comprovantes</em>, <em>03 - Extratos</em>) são mapeadas contextualmente para cruzar cada débito bancário com sua respectiva nota fiscal e rubrica.
          </p>
        </div>

        {/* Status and live progress */}
        {status !== "idle" && (
          <div
            className={`p-3.5 sm:p-4 rounded-xl border text-xs space-y-3 ${
              status === "error"
                ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                : status === "done"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-slate-800/80 border-slate-700 text-slate-200"
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                {status === "done" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : status === "error" ? (
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                ) : (
                  <Loader2 className="w-5 h-5 text-emerald-400 animate-spin shrink-0" />
                )}
                <div>
                  <p className="font-semibold text-slate-200">{statusMessage}</p>
                </div>
              </div>

            </div>

            {/* Visual Animated Progress Bar */}
            {status !== "error" && (
              <div className="space-y-1">
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-700">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>Progresso da extração</span>
                  <span>{progressPercent}%</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 sm:pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleStartExtraction}
            disabled={
              status === "connecting" ||
              status === "listing" ||
              status === "processing" ||
              (activeTab === "folder_files" && uploadedItems.length === 0)
            }
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50 transition"
          >
            {status === "connecting" || status === "listing" || status === "processing" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Extraindo ({progressPercent}%)...
              </>
            ) : (
              <>
                Extrair Dados do Projeto <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

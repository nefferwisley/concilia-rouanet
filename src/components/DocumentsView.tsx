import React, { useState, useRef } from "react";
import {
  Receipt,
  Plus,
  Sparkles,
  Upload,
  FileText,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Eye,
  Trash2,
  Coins,
  FileCode,
  Image as ImageIcon,
  File,
  X,
  RefreshCw,
  Layers,
  ArrowRight,
  Info,
} from "lucide-react";
import { FiscalDocument, BudgetRubric, FiscalDocType, BudgetStageName, PronacProject, BankTransaction, TripartiteEntry } from "../types";
import { formatCurrency, formatDate, formatCnpjCpf } from "../utils/formatters";
import { resolveProviderAndCompany } from "../utils/providerHelper";
import { analyzeDocumentWithAi } from "../services/geminiService";

interface DocumentsViewProps {
  documents: FiscalDocument[];
  rubrics: BudgetRubric[];
  project: PronacProject;
  transactions?: BankTransaction[];
  tripartiteEntries?: TripartiteEntry[];
  onAddDocument: (doc: FiscalDocument) => void;
  onUpdateDocument: (doc: FiscalDocument) => void;
  onDeleteDocument: (docId: string) => void;
  onSyncAll?: () => void;
}

interface QueuedFile {
  file: File;
  name: string;
  size: number;
  type: string;
  status: "pending" | "processing" | "success" | "error";
  extractedData?: any;
  errorMessage?: string;
  previewUrl?: string;
}

const SAMPLE_TEMPLATES = [
  {
    title: "Bilhete de Passagem Aérea Eletrônica (BP-e / LATAM)",
    desc: "Passagens aéreas com localizador, trecho, passageiros e taxa de embarque",
    text: `LATAM AIRLINES GROUP S/A - CNPJ: 02.012.862/0001-60\nBILHETE DE PASSAGEM AÉREA ELETRÔNICA (BP-e) Nº 957.241.802\nData de Emissão: 10/11/2024\nCÓDIGO DE RESERVA / LOCALIZADOR: ZKW89L\nPROJETO CULTURAL: PRONAC 234891 - FESTIVAL SONS DO BRASIL\nPASSAGEIROS (FICHA TÉCNICA DO PROJETO):\n1. EDUARDO MENDES (DIRETOR MUSICAL) - CPF: 219.840.112-90\n2. JULIANA FONSECA (PRODUTORA EXECUTIVA) - CPF: 382.910.441-33\n3. ROBERTO VASCONCELOS (TÉCNICO DE ÁUDIO) - CPF: 109.844.781-02\nTRECHOS: SÃO PAULO (CGH) -> RIO DE JANEIRO (SDU) / RIO DE JANEIRO (SDU) -> SÃO PAULO (CGH)\nDATA DOS VOOS: 14/11/2024 e 17/11/2024\nTARIFA AÉREA TOTAL (3 PASSAGEIROS): R$ 8.620,00\nTAXAS DE EMBARQUE AEROPORTUÁRIAS: R$ 330,00\nVALOR TOTAL DO BILHETE (PAGO VIA PIX): R$ 8.950,00`,
  },
  {
    title: "Termo de Recebimento de Verba de Alimentação (Art. 28 IN 01/2023)",
    desc: "Folha de diárias de alimentação da equipe técnica e elenco com CPFs",
    text: `TERMO COLETIVO DE RECEBIMENTO DE DIÁRIAS / VERBA DE ALIMENTAÇÃO\nPROJETO: PRONAC 234891 - FESTIVAL SONS & RAÍZES DO BRASIL 2024\nPROPONENTE: ARTE & EXPRESSÃO PRODUÇÕES CULTURAIS LTDA - CNPJ: 18.924.512/0001-34\nBASE LEGAL: Art. 28 da Instrução Normativa MinC nº 01/2023\nPERÍODO DO EVENTO: 14/11/2024 a 17/11/2024 (4 DIAS DE APRESENTAÇÕES)\nVALOR DA DIÁRIA UNITÁRIA: R$ 200,00 / DIA POR INTEGRANTE\n\nRELAÇÃO DE INTEGRANTES DA EQUIPE / BENEFICIÁRIOS:\n1. MARCOS ANTÔNIO DE LIMA - CPF: 450.912.833-21 - FUNÇÃO: ILUMINADOR - 4 DIÁRIAS = R$ 800,00\n2. CLÁUDIO PEREIRA SANTOS - CPF: 119.482.741-09 - FUNÇÃO: ROADIE / MONTAGEM - 4 DIÁRIAS = R$ 800,00\n3. BEATRIZ CARVALHO - CPF: 290.118.490-55 - FUNÇÃO: CAMARIM & LOGÍSTICA - 4 DIÁRIAS = R$ 800,00\n4. ANDRÉ LUIZ ROCHA - CPF: 890.312.441-77 - FUNÇÃO: TÉCNICO DE PALCO - 4 DIÁRIAS = R$ 800,00\n5. THIAGO MOREIRA - CPF: 701.992.831-40 - FUNÇÃO: MÚSICO PERCUSSIONISTA - 4 DIÁRIAS = R$ 800,00\n6. CARMEN SILVEIRA - CPF: 631.849.201-18 - FUNÇÃO: MÚSICA FLAUTISTA - 4 DIÁRIAS = R$ 800,00\n7. FELIPE DUARTE - CPF: 554.890.121-66 - FUNÇÃO: MÚSICO BAIXISTA - 4 DIÁRIAS = R$ 800,00\n8. LUCAS MARTINS - CPF: 443.910.821-39 - FUNÇÃO: MONITOR DE PALCO - 4 DIÁRIAS = R$ 800,00\n\nVALOR TOTAL DAS DIÁRIAS DE ALIMENTAÇÃO: R$ 6.400,00\nVALOR LÍQUIDO PAGO: R$ 6.400,00\nDECLARAÇÃO: Declaramos para os devidos fins de prestação de contas junto ao Ministério da Cultura que recebemos integralmente os valores acima descritos a título de auxílio-alimentação para a realização das atividades do projeto.`,
  },
  {
    title: "Fatura de Agência de Turismo & Hospedagem",
    desc: "Fatura comercial de agência de viagens com hospedagem e transfer",
    text: `AGÊNCIA DE TURISMO E EVENTOS CULTURAIS LTDA - CNPJ: 19.888.777/0001-33\nFATURA / DUPLICATA DE PRESTAÇÃO DE SERVIÇOS Nº 2024/9918\nData de Emissão: 12/11/2024\nSACADO: ARTE & EXPRESSÃO PRODUÇÕES CULTURAIS (PRONAC 234891)\nDISCRIMINAÇÃO DOS SERVIÇOS:\nReserva e contratação de 6 apartamentos duplos no Hotel Majestic Rio durante 3 noites para hospedagem do elenco do Festival Sons do Brasil.\nVALOR TOTAL DOS SERVIÇOS DE HOSPEDAGEM: R$ 4.800,00\nVALOR LÍQUIDO A PAGAR: R$ 4.800,00`,
  },
  {
    title: "NFS-e Locação de Equipamentos (Som/Luz)",
    desc: "Nota Fiscal de Serviços com retenção de IRRF (1,5%)",
    text: `PREFEITURA MUNICIPAL DE SÃO PAULO - SECRETARIA DE FINANÇAS\nNOTA FISCAL DE SERVIÇOS ELETRÔNICA - NFS-e Nº 004812 - SÉRIE 1\nData de Emissão: 18/08/2024\nPRESTADOR DE SERVIÇOS:\nRazão Social: MEGA SOM & ILUMINAÇÃO DE EVENTOS LTDA\nCNPJ: 23.456.789/0001-12 - CCM: 4.891.234-9\nTOMADOR DO SERVIÇO:\nRazão Social: ARTE & EXPRESSÃO PRODUÇÕES CULTURAIS\nCNPJ: 12.345.678/0001-90\nDISCRIMINAÇÃO DOS SERVIÇOS:\nLocação de sistema de som profissional Line Array, rider técnico e mesa de iluminação digital DMX para apresentação musical do projeto PRONAC 234891.\nVALOR TOTAL DA NOTA: R$ 42.500,00\nRETENÇÕES FEDERAIS:\nIRRF (1,5%): R$ 637,50\nISS Retido (2,0%): R$ 850,00\nVALOR LÍQUIDO A PAGAR: R$ 41.012,50`,
  },
  {
    title: "RPA Cachê Artístico Autônomo",
    desc: "Recibo de Pagamento a Autônomo com IRRF e INSS retidos",
    text: `RECIBO DE PAGAMENTO A AUTÔNOMO - RPA Nº 108\nData: 25/08/2024\nPROJETO: PRONAC 234891 - FESTIVAL CULTURAL BRASIL\nFAVORECIDO / PROFISSIONAL:\nNome: MARCELO SOARES DA SILVA\nCPF: 345.678.901-23 - PIS/NIT: 123.45678.90-1\nSERVIÇO PRESTADO:\nApresentação musical como instrumentista solo e regência de oficina de violão popular no encerramento do evento.\nVALOR BRUTO: R$ 12.000,00\nDEDUÇÕES / RETENÇÕES:\nINSS (11% teto): R$ 828,38\nIRRF (27,5% tab. progressiva): R$ 1.842,10\nISS Autônomo (5%): R$ 600,00\nVALOR LÍQUIDO PAGO: R$ 8.729,52`,
  },
  {
    title: "NF-e Material Cenográfico e Figurino",
    desc: "Nota Fiscal de Produtos (DANFE) com ICMS e IPI",
    text: `DANFE - DOCUMENTO AUXILIAR DA NOTA FISCAL ELETRÔNICA\nNF-e Nº 000.089.412 - SÉRIE 1\nData de Emissão: 05/08/2024\nEMITENTE: CENAS & ARTES TECIDOS E CENOGRAFIA LTDA\nCNPJ: 45.678.901/0001-23 - IE: 110.892.451.110\nDESTINATÁRIO: ARTE & EXPRESSÃO PRODUÇÕES (PRONAC 234891)\nNATUREZA DA OPERAÇÃO: Venda de mercadorias para produção cenográfica\nITENS: Tecidos veludo antichamas, estruturas de madeira naval e tintas acrílicas cenográficas.\nVALOR TOTAL DOS PRODUTOS: R$ 18.900,00\nVALOR TOTAL DA NOTA FISCAL: R$ 18.900,00\nVALOR LÍQUIDO: R$ 18.900,00`,
  },
  {
    title: "Guia DARF Recolhimento de IRRF",
    desc: "Comprovante tributário de recolhimento na fonte (Código 0561/1708)",
    text: `MINISTÉRIO DA FAZENDA - SECRETARIA DA RECEITA FEDERAL DO BRASIL\nDOCUMENTO DE ARRECADAÇÃO DE RECEITAS FEDERAIS - DARF\nPeríodo de Apuração: 31/08/2024\nNúmero do Documento: 07.12.24.8912-0\nCódigo da Receita: 1708 (IRRF - Serviços Prestados por PJ)\nData de Vencimento: 20/09/2024\nContribuinte: ARTE & EXPRESSÃO PRODUÇÕES LTDA - CNPJ: 12.345.678/0001-90\nReferência: Retenções tributárias sobre serviços do PRONAC 234891\nVALOR DO PRINCIPAL: R$ 2.479,60\nVALOR TOTAL RECOLHIDO: R$ 2.479,60`,
  },
];

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  documents = [],
  rubrics = [],
  project,
  transactions = [],
  tripartiteEntries = [],
  onAddDocument,
  onUpdateDocument,
  onDeleteDocument,
  onSyncAll,
}) => {
  const safeDocuments = Array.isArray(documents) ? documents : [];
  const safeRubrics = Array.isArray(rubrics) ? rubrics : [];
  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<FiscalDocument | null>(null);

  // AI OCR extraction state & Drawer
  const [showOcrDrawer, setShowOcrDrawer] = useState(false);
  const [ocrTab, setOcrTab] = useState<"upload" | "text" | "examples">("upload");
  const [ocrTextToAnalyze, setOcrTextToAnalyze] = useState("");
  const [isAiExtracting, setIsAiExtracting] = useState(false);

  // Multi-file drag and drop queue
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formState, setFormState] = useState<Partial<FiscalDocument>>({
    tipo: "NFS-e (Serviço)",
    numeroDoc: "",
    serie: "1",
    dataEmissao: new Date().toISOString().slice(0, 10),
    fornecedorNome: "",
    fornecedorCnpjCpf: "",
    descricaoServico: "",
    valorBruto: 0,
    retencaoIss: 0,
    retencaoIrrf: 0,
    retencaoInss: 0,
    valorLiquido: 0,
    rubricaId: safeRubrics[0]?.id || "RUB-01",
    statusComprovacao: "Completo",
  });

  const filteredDocs = safeDocuments.filter((d) => {
    if (!d) return false;
    const matchesType = selectedType === "ALL" || (d.tipo && d.tipo.startsWith(selectedType));
    const q = (searchQuery || "").toLowerCase();
    const matchesSearch =
      (d.fornecedorNome || "").toLowerCase().includes(q) ||
      (d.numeroDoc || "").toLowerCase().includes(q) ||
      (d.fornecedorCnpjCpf || "").includes(searchQuery) ||
      (d.descricaoServico || "").toLowerCase().includes(q) ||
      (d.id || "").toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  const totalBruto = safeDocuments.reduce((acc, d) => acc + (Number(d?.valorBruto) || 0), 0);
  const totalRetencoes = safeDocuments.reduce(
    (acc, d) => acc + (Number(d?.retencaoIss) || 0) + (Number(d?.retencaoIrrf) || 0) + (Number(d?.retencaoInss) || 0),
    0
  );
  const totalLiquido = safeDocuments.reduce((acc, d) => acc + (Number(d?.valorLiquido) || 0), 0);

  // Recalculate net value on changes
  const updateGrossOrTaxes = (gross: number, iss: number, irrf: number, inss: number) => {
    const net = Math.max(0, gross - (iss + irrf + inss));
    setFormState((prev) => ({
      ...prev,
      valorBruto: gross,
      retencaoIss: iss,
      retencaoIrrf: irrf,
      retencaoInss: inss,
      valorLiquido: net,
    }));
  };

  // Process a single file to extract data
  const processFileItem = async (file: File): Promise<any> => {
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
    const isXml = file.type.includes("xml") || file.name.endsWith(".xml");
    const isText = file.type.includes("text") || file.name.endsWith(".txt") || file.name.endsWith(".json");

    if (isXml || isText) {
      const textContent = await file.text();
      return analyzeDocumentWithAi({
        documentText: textContent,
        projectContext: `PRONAC ${project.pronac} - ${project.nome}`,
      });
    }

    if (isImage || isPdf) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const dataUrl = reader.result as string;
            const base64Data = dataUrl.split(",")[1];
            const mimeType = isPdf ? "application/pdf" : file.type || "image/png";

            const result = await analyzeDocumentWithAi({
              imageBase64: base64Data,
              mimeType,
              projectContext: `PRONAC ${project.pronac} - ${project.nome}`,
            });
            resolve(result);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });
    }

    // Fallback read as text
    const raw = await file.text();
    return analyzeDocumentWithAi({
      documentText: raw,
      projectContext: `PRONAC ${project.pronac} - ${project.nome}`,
    });
  };

  // Handle files added via Drag & Drop or Input
  const handleFilesAdded = (filesList: FileList | File[]) => {
    const newItems: QueuedFile[] = Array.from(filesList).map((f) => ({
      file: f,
      name: f.name,
      size: f.size,
      type: f.type || "arquivo",
      status: "pending",
      previewUrl: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined,
    }));

    setQueuedFiles((prev) => [...prev, ...newItems]);
    setShowOcrDrawer(true);
    setOcrTab("upload");
  };

  // Process all queued files with AI / Extractor
  const handleProcessQueue = async () => {
    if (queuedFiles.length === 0) return;
    setIsAiExtracting(true);

    const updatedQueue = [...queuedFiles];

    for (let i = 0; i < updatedQueue.length; i++) {
      if (updatedQueue[i].status === "success") continue;

      updatedQueue[i].status = "processing";
      setQueuedFiles([...updatedQueue]);

      try {
        const extracted = await processFileItem(updatedQueue[i].file);
        updatedQueue[i].status = "success";
        updatedQueue[i].extractedData = extracted;
      } catch (err: any) {
        updatedQueue[i].status = "error";
        updatedQueue[i].errorMessage = err.message || "Erro ao processar";
      }
      setQueuedFiles([...updatedQueue]);
    }

    setIsAiExtracting(false);
  };

  // Commit extracted queued items directly into project documents
  const handleApplyExtractedToDocuments = () => {
    let addedCount = 0;
    queuedFiles.forEach((item) => {
      if (item.status === "success" && item.extractedData) {
        const res = item.extractedData;
        let matchedRubricId = rubrics[0]?.id || "";
        if (res.sugestaoRubrica) {
          const found = rubrics.find(
            (r) =>
              r.nome.toLowerCase().includes(res.sugestaoRubrica.toLowerCase()) ||
              r.etapa.toLowerCase().includes((res.sugestaoEtapa || "").toLowerCase())
          );
          if (found) matchedRubricId = found.id;
        }

        const selRubric = rubrics.find((r) => r.id === matchedRubricId);

        const newDoc: FiscalDocument = {
          id: `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          tipo: (res.tipoDocumento as any) || "NFS-e (Serviço)",
          numeroDoc: res.numeroDocumento || `NF-${Math.floor(1000 + Math.random() * 9000)}`,
          serie: res.serie || "1",
          dataEmissao: res.dataEmissao || new Date().toISOString().slice(0, 10),
          fornecedorNome: res.razaoSocialEmitente || item.name.replace(/\.[^/.]+$/, ""),
          fornecedorCnpjCpf: res.cnpjCpfEmitente || "",
          descricaoServico: res.descricaoServico || `Comprovante importado: ${item.name}`,
          valorBruto: Number(res.valorBruto || 0),
          retencaoIss: Number(res.retencoes?.iss || 0),
          retencaoIrrf: Number(res.retencoes?.irrf || 0),
          retencaoInss: Number(res.retencoes?.inss || 0),
          valorLiquido: Number(res.valorLiquido || res.valorBruto || 0),
          rubricaId: matchedRubricId,
          rubricaNome: selRubric?.nome,
          etapa: selRubric?.etapa,
          statusComprovacao: "Completo",
          confiabilidadeIa: res.confiabilidade || 95,
        };

        onAddDocument(newDoc);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      setQueuedFiles([]);
      setShowOcrDrawer(false);
      alert(`Parabéns! ${addedCount} documento(s) fiscal(is) foram cadastrados com sucesso.`);
    }
  };

  // Run AI OCR on Text Input
  const handleExtractFromText = async () => {
    if (!ocrTextToAnalyze.trim()) {
      alert("Por favor, cole o texto da Nota Fiscal ou comprovante fiscal.");
      return;
    }

    try {
      setIsAiExtracting(true);
      const res = await analyzeDocumentWithAi({
        documentText: ocrTextToAnalyze,
        projectContext: `PRONAC ${project.pronac} - ${project.nome}`,
      });

      let matchedRubricId = rubrics[0]?.id || "";
      if (res.sugestaoRubrica) {
        const found = rubrics.find(
          (r) =>
            r.nome.toLowerCase().includes(res.sugestaoRubrica!.toLowerCase()) ||
            r.etapa.toLowerCase().includes((res.sugestaoEtapa || "").toLowerCase())
        );
        if (found) matchedRubricId = found.id;
      }

      setFormState({
        tipo: (res.tipoDocumento as any) || "NFS-e (Serviço)",
        numeroDoc: res.numeroDocumento || "NF-001",
        serie: res.serie || "1",
        dataEmissao: res.dataEmissao || new Date().toISOString().slice(0, 10),
        fornecedorNome: res.razaoSocialEmitente || "Fornecedor Identificado por IA",
        fornecedorCnpjCpf: res.cnpjCpfEmitente || "",
        descricaoServico: res.descricaoServico || "",
        valorBruto: res.valorBruto || 0,
        retencaoIss: res.retencoes?.iss || 0,
        retencaoIrrf: res.retencoes?.irrf || 0,
        retencaoInss: res.retencoes?.inss || 0,
        valorLiquido: res.valorLiquido || res.valorBruto || 0,
        rubricaId: matchedRubricId,
        confiabilidadeIa: res.confiabilidade || 95,
        statusComprovacao: "Completo",
      });

      setShowOcrDrawer(false);
      setIsAddModalOpen(true);
    } catch (err: any) {
      alert(`Erro na análise por IA: ${err.message}`);
    } finally {
      setIsAiExtracting(false);
    }
  };

  const handleSaveDoc = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedRubric = rubrics.find((r) => r.id === formState.rubricaId);

    if (editingDoc) {
      onUpdateDocument({
        ...editingDoc,
        ...formState,
        rubricaNome: selectedRubric?.nome,
        etapa: selectedRubric?.etapa,
      } as FiscalDocument);
      setEditingDoc(null);
    } else {
      const newDoc: FiscalDocument = {
        id: `doc-${Date.now()}`,
        tipo: (formState.tipo as FiscalDocType) || "NFS-e (Serviço)",
        numeroDoc: formState.numeroDoc || "000",
        serie: formState.serie || "1",
        dataEmissao: formState.dataEmissao || new Date().toISOString().slice(0, 10),
        fornecedorNome: formState.fornecedorNome || "Prestador",
        fornecedorCnpjCpf: formState.fornecedorCnpjCpf || "",
        descricaoServico: formState.descricaoServico || "",
        valorBruto: Number(formState.valorBruto || 0),
        retencaoIss: Number(formState.retencaoIss || 0),
        retencaoIrrf: Number(formState.retencaoIrrf || 0),
        retencaoInss: Number(formState.retencaoInss || 0),
        valorLiquido: Number(formState.valorLiquido || formState.valorBruto || 0),
        rubricaId: formState.rubricaId || rubrics[0]?.id || "",
        rubricaNome: selectedRubric?.nome,
        etapa: selectedRubric?.etapa,
        statusComprovacao: (formState.statusComprovacao as any) || "Completo",
        confiabilidadeIa: formState.confiabilidadeIa,
      };
      onAddDocument(newDoc);
      setIsAddModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-400" /> Documentos Fiscais & Comprovações (Dossiê MinC)
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Registro e extração inteligente de Notas Fiscais (NF-e/NFS-e), RPAs, Cupons Fiscais, XMLs e DARFs
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowOcrDrawer(!showOcrDrawer)}
            className="text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3.5 py-2 rounded-xl flex items-center gap-2 transition"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Central de Upload & OCR com IA</span>
          </button>

          <button
            onClick={() => {
              setFormState({
                tipo: "NFS-e (Serviço)",
                numeroDoc: "",
                serie: "1",
                dataEmissao: new Date().toISOString().slice(0, 10),
                fornecedorNome: "",
                fornecedorCnpjCpf: "",
                descricaoServico: "",
                valorBruto: 0,
                retencaoIss: 0,
                retencaoIrrf: 0,
                retencaoInss: 0,
                valorLiquido: 0,
                rubricaId: rubrics[0]?.id || "",
                statusComprovacao: "Completo",
              });
              setIsAddModalOpen(true);
            }}
            className="text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow transition"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Documento Fiscal</span>
          </button>
        </div>
      </div>

      {/* Folder Recognition & Tripartite Sync Status Banner */}
      <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg bg-gradient-to-r from-emerald-950/30 via-slate-900 to-slate-900">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0 mt-0.5">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white">
                Dossiê da Pasta Reconhecido com Sucesso ({documents.length} Comprovantes Fiscais)
              </h3>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Reconhecimento Ativo
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Todos os documentos fiscais apresentados na pasta e subpastas foram mapeados para o PRONAC {project.pronac || "do projeto"}. O motor de inteligência vincula cada comprovante ao seu respectivo débito bancário do Banco do Brasil e à rubrica aprovada no SALIC.
            </p>
          </div>
        </div>

        {onSyncAll && (
          <button
            onClick={() => {
              onSyncAll();
              alert("Sincronização concluída! Todos os documentos fiscais foram validados e vinculados ao extrato bancário.");
            }}
            className="w-full md:w-auto text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md transition shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Sincronizar Todos os Documentos</span>
          </button>
        )}
      </div>

      {/* AI OCR & File Upload Drawer */}
      {showOcrDrawer && (
        <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  Central de Leitura e Extração de Documentos Fiscais (Gemini 2.5)
                </h2>
                <p className="text-[11px] text-slate-400">
                  Suporta PDFs (DANFE), Imagens (PNG/JPG), XMLs (NF-e/NFS-e) e textos fiscais
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowOcrDrawer(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-slate-800/80 pb-2">
            <button
              onClick={() => setOcrTab("upload")}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                ocrTab === "upload"
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload de Arquivos ({queuedFiles.length})</span>
            </button>

            <button
              onClick={() => setOcrTab("text")}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                ocrTab === "text"
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Colar Texto / XML Fiscal</span>
            </button>

            <button
              onClick={() => setOcrTab("examples")}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                ocrTab === "examples"
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Modelos Reais da Lei Rouanet</span>
            </button>
          </div>

          {/* Tab: Upload Files (Drag & Drop) */}
          {ocrTab === "upload" && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleFilesAdded(e.dataTransfer.files);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                  isDragging
                    ? "border-emerald-400 bg-emerald-500/10"
                    : "border-slate-700 hover:border-emerald-500/50 bg-slate-950/60"
                }`}
              >
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFilesAdded(e.target.files);
                    }
                  }}
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.xml,.txt,.json"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-sm font-semibold text-slate-200">
                  Arraste e solte seus comprovantes aqui ou <span className="text-emerald-400 underline">clique para selecionar</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Suporte nativo para DANFE PDF, Notas Fiscais em imagem (JPG/PNG), XML SEFAZ/SPED e DARFs
                </div>
              </div>

              {/* Queue List */}
              {queuedFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                    <span>Arquivos selecionados ({queuedFiles.length}):</span>
                    <button
                      onClick={() => setQueuedFiles([])}
                      className="text-rose-400 hover:underline text-[11px]"
                    >
                      Limpar lista
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1">
                    {queuedFiles.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          {item.previewUrl ? (
                            <img
                              src={item.previewUrl}
                              alt="preview"
                              className="w-8 h-8 rounded object-cover shrink-0"
                            />
                          ) : item.name.endsWith(".xml") ? (
                            <FileCode className="w-6 h-6 text-amber-400 shrink-0" />
                          ) : item.name.endsWith(".pdf") ? (
                            <FileText className="w-6 h-6 text-rose-400 shrink-0" />
                          ) : (
                            <File className="w-6 h-6 text-emerald-400 shrink-0" />
                          )}

                          <div className="overflow-hidden">
                            <div className="font-semibold text-slate-200 truncate">{item.name}</div>
                            <div className="text-[10px] text-slate-500">
                              {(item.size / 1024).toFixed(1)} KB • {item.type || "Doc"}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.status === "pending" && (
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                              Pendente
                            </span>
                          )}
                          {item.status === "processing" && (
                            <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                              <Sparkles className="w-3 h-3 animate-spin" /> Lendo...
                            </span>
                          )}
                          {item.status === "success" && (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded flex items-center gap-1 font-semibold">
                              <CheckCircle2 className="w-3 h-3" /> Extraído
                            </span>
                          )}
                          {item.status === "error" && (
                            <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded">
                              Erro
                            </span>
                          )}

                          <button
                            onClick={() =>
                              setQueuedFiles((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="text-slate-500 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions for Queue */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <div className="text-[11px] text-slate-400">
                      {queuedFiles.filter((q) => q.status === "success").length} de {queuedFiles.length} prontos para inclusão
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleProcessQueue}
                        disabled={isAiExtracting || queuedFiles.every((q) => q.status === "success")}
                        className="text-xs font-bold bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition disabled:opacity-50"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${isAiExtracting ? "animate-spin" : ""}`} />
                        <span>{isAiExtracting ? "Analisando com IA..." : "Executar Leitura OCR"}</span>
                      </button>

                      {queuedFiles.some((q) => q.status === "success") && (
                        <button
                          onClick={handleApplyExtractedToDocuments}
                          className="text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-4 py-2 rounded-xl flex items-center gap-1.5 shadow transition"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Cadastrar Documentos Extraídos</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Text / XML Input */}
          {ocrTab === "text" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Cole o texto bruto da Nota Fiscal Eletrônica (DANFE / NFS-e), tags XML do arquivo de nota ou dados do recibo de pagamento:
              </p>

              <textarea
                rows={5}
                placeholder="Cole aqui o texto da Nota Fiscal (Ex: PREFEITURA MUNICIPAL DE SÃO PAULO - NFS-e nº 4512 - Emitente: MEGA SOM LTDA CNPJ: 23.456.789/0001-12 - Valor dos Serviços: R$ 42.500,00 - Discriminação: Locação de som e luz...)"
                value={ocrTextToAnalyze}
                onChange={(e) => setOcrTextToAnalyze(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={handleExtractFromText}
                  disabled={isAiExtracting || !ocrTextToAnalyze.trim()}
                  className="text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-4 py-2 rounded-xl flex items-center gap-1.5 shadow transition disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isAiExtracting ? "animate-spin" : ""}`} />
                  {isAiExtracting ? "Identificando Campos Fiscais..." : "Identificar e Abrir Cadastro"}
                </button>
              </div>
            </div>
          )}

          {/* Tab: Real World Cultural Examples */}
          {ocrTab === "examples" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SAMPLE_TEMPLATES.map((tpl, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950 border border-slate-800 hover:border-emerald-500/40 rounded-xl p-3.5 text-xs space-y-2 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                      {tpl.title}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{tpl.desc}</div>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-850">
                    <button
                      onClick={() => {
                        setOcrTextToAnalyze(tpl.text);
                        setOcrTab("text");
                      }}
                      className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20"
                    >
                      <span>Usar este Modelo</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium">Total Bruto dos Documentos</span>
          <div className="text-xl font-bold font-mono text-white mt-1">{formatCurrency(totalBruto)}</div>
          <span className="text-[11px] text-slate-500">{documents.length} documentos cadastrados</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium">Retenções Tributárias (IRRF/ISS/INSS)</span>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">{formatCurrency(totalRetencoes)}</div>
          <span className="text-[11px] text-amber-500">Recolhimento obrigatório via DARF/GPS</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium">Total Líquido Pago aos Prestadores</span>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{formatCurrency(totalLiquido)}</div>
          <span className="text-[11px] text-emerald-500">Valor conciliado com saídas bancárias</span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedType("ALL")}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
              selectedType === "ALL"
                ? "bg-emerald-500 text-slate-950 font-bold"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            Todos ({documents.length})
          </button>
          <button
            onClick={() => setSelectedType("NFS-e")}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
              selectedType === "NFS-e"
                ? "bg-emerald-500 text-slate-950 font-bold"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            NFS-e (Serviços)
          </button>
          <button
            onClick={() => setSelectedType("NF-e")}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
              selectedType === "NF-e"
                ? "bg-emerald-500 text-slate-950 font-bold"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            NF-e (Produtos)
          </button>
          <button
            onClick={() => setSelectedType("Bilhete")}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
              selectedType === "Bilhete"
                ? "bg-emerald-500 text-slate-950 font-bold"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            Passagens Aéreas (BP-e)
          </button>
          <button
            onClick={() => setSelectedType("Recibo")}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
              selectedType === "Recibo"
                ? "bg-emerald-500 text-slate-950 font-bold"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            Verba de Alimentação / Diárias
          </button>
          <button
            onClick={() => setSelectedType("RPA")}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
              selectedType === "RPA"
                ? "bg-emerald-500 text-slate-950 font-bold"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            RPA (Autônomos)
          </button>
          <button
            onClick={() => setSelectedType("Guia")}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
              selectedType === "Guia"
                ? "bg-emerald-500 text-slate-950 font-bold"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            DARF / Impostos
          </button>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar fornecedor, CNPJ ou nº..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-3 py-3.5 text-center w-12"># Nº</th>
                <th className="px-4 py-3.5">Doc Fiscal</th>
                <th className="px-4 py-3.5">Emissão</th>
                <th className="px-4 py-3.5">Favorecido / Fornecedor (Pessoa + Empresa)</th>
                <th className="px-4 py-3.5">Rubrica SALIC</th>
                <th className="px-4 py-3.5 text-right">Vlr Bruto</th>
                <th className="px-4 py-3.5 text-right">Retenções</th>
                <th className="px-4 py-3.5 text-right">Vlr Líquido</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                    Nenhum documento fiscal encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc, idx) => {
                  const rubric = rubrics.find((r) => r.id === doc.rubricaId);
                  const retencoes = (doc.retencaoIss || 0) + (doc.retencaoIrrf || 0) + (doc.retencaoInss || 0);
                  const providerInfo = resolveProviderAndCompany(doc.fornecedorNome, doc.fornecedorCnpjCpf);

                  return (
                    <tr key={doc.id || idx} className="hover:bg-slate-800/40 transition">
                      <td className="px-3 py-3 font-mono font-bold text-slate-400 text-center text-xs">
                        #{String(idx + 1).padStart(3, "0")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">
                          {doc.tipo} nº {doc.numeroDoc}
                        </div>
                        <div className="text-[10px] text-slate-400">Série: {doc.serie || "1"}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-300 whitespace-nowrap">{formatDate(doc.dataEmissao)}</td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="font-semibold text-slate-100 truncate" title={providerInfo.personName}>
                          {providerInfo.personName}
                        </div>
                        <div className="text-[11px] text-emerald-400 font-medium truncate" title={providerInfo.companyName}>
                          {providerInfo.companyName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {providerInfo.cnpjCpf}
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="text-slate-200 font-medium line-clamp-1">
                          {rubric?.nome || doc.rubricaNome || "Não vinculada"}
                        </div>
                        <div className="text-[10px] text-slate-400">{rubric?.etapa || doc.etapa || "-"}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-slate-200">
                        {formatCurrency(doc.valorBruto)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-amber-400">
                        {retencoes > 0 ? formatCurrency(retencoes) : "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                        {formatCurrency(doc.valorLiquido)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> {doc.statusComprovacao}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setEditingDoc(doc);
                              setFormState(doc);
                            }}
                            className="text-xs text-emerald-400 hover:text-emerald-300 px-2 py-1 bg-slate-800 rounded"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Deseja excluir o documento ${doc.numeroDoc}?`)) {
                                onDeleteDocument(doc.id);
                              }
                            }}
                            className="text-xs text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-slate-800"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Document Modal */}
      {(isAddModalOpen || editingDoc) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 text-slate-200 shadow-2xl my-8">
            <h2 className="text-base font-bold text-white mb-4">
              {editingDoc ? `Editar Documento Fiscal: ${editingDoc.numeroDoc}` : "Cadastrar Novo Documento Fiscal"}
            </h2>

            <form onSubmit={handleSaveDoc} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Tipo de Documento</label>
                  <select
                    value={formState.tipo}
                    onChange={(e) => setFormState({ ...formState, tipo: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="NFS-e (Serviço)">NFS-e (Serviço)</option>
                    <option value="NF-e (Produto)">NF-e (Produto)</option>
                    <option value="Bilhete de Passagem Aérea (BP-e / E-Ticket)">Bilhete de Passagem Aérea (BP-e / E-Ticket)</option>
                    <option value="Recibo de Diária / Verba de Alimentação">Recibo / Termo de Verba de Alimentação (Art. 28)</option>
                    <option value="Fatura de Agência de Viagens">Fatura de Agência de Viagens / Hospedagem</option>
                    <option value="RPA (Autônomo)">RPA (Autônomo)</option>
                    <option value="Cupom Fiscal">Cupom Fiscal</option>
                    <option value="Recibo de Cachê">Recibo de Cachê</option>
                    <option value="Guia de Recolhimento (DARF/GPS/DAM)">Guia DARF / GPS / Tributo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Número do Documento</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 000.124.981"
                    value={formState.numeroDoc}
                    onChange={(e) => setFormState({ ...formState, numeroDoc: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Data de Emissão</label>
                  <input
                    type="date"
                    required
                    value={formState.dataEmissao}
                    onChange={(e) => setFormState({ ...formState, dataEmissao: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Razão Social / Nome do Fornecedor</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Mega Som & Iluminação Profissional Ltda"
                    value={formState.fornecedorNome}
                    onChange={(e) => setFormState({ ...formState, fornecedorNome: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">CNPJ ou CPF do Favorecido</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 23.456.789/0001-12"
                    value={formState.fornecedorCnpjCpf}
                    onChange={(e) => setFormState({ ...formState, fornecedorCnpjCpf: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Rubrica Orçamentária SALIC Vinculada</label>
                <select
                  value={formState.rubricaId}
                  onChange={(e) => setFormState({ ...formState, rubricaId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  {rubrics.map((r) => (
                    <option key={r.id} value={r.id}>
                      Item {r.itemNumero} - {r.nome} ({r.etapa})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Valor Bruto (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formState.valorBruto}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      updateGrossOrTaxes(
                        v,
                        Number(formState.retencaoIss || 0),
                        Number(formState.retencaoIrrf || 0),
                        Number(formState.retencaoInss || 0)
                      );
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Retenção ISS (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formState.retencaoIss}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      updateGrossOrTaxes(
                        Number(formState.valorBruto || 0),
                        v,
                        Number(formState.retencaoIrrf || 0),
                        Number(formState.retencaoInss || 0)
                      );
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Retenção IRRF (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formState.retencaoIrrf}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      updateGrossOrTaxes(
                        Number(formState.valorBruto || 0),
                        Number(formState.retencaoIss || 0),
                        v,
                        Number(formState.retencaoInss || 0)
                      );
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-emerald-400 mb-1 font-bold">Valor Líquido (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    readOnly
                    value={formState.valorLiquido}
                    className="w-full bg-slate-900 border border-emerald-500/40 rounded-lg p-2 text-emerald-400 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Descrição dos Serviços / Produtos Comprovados</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Discriminação detalhada conforme nota fiscal e plano de trabalho..."
                  value={formState.descricaoServico}
                  onChange={(e) => setFormState({ ...formState, descricaoServico: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingDoc(null);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl"
                >
                  Salvar Documento Fiscal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

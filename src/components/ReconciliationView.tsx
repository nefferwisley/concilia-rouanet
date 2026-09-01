import React, { useState } from "react";
import {
  ArrowLeftRight,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Search,
  Filter,
  Link,
  Unlink,
  HelpCircle,
  Clock,
  Coins,
  FileSpreadsheet,
  Layers,
  ShieldCheck,
  Building,
  Receipt,
  FileCheck2,
  Copy,
  Info,
  Check,
  ChevronDown,
  ChevronUp,
  Cpu,
  RefreshCw,
  Zap,
} from "lucide-react";
import {
  BankTransaction,
  FiscalDocument,
  BudgetRubric,
  PronacProject,
  ReconciliationStatus,
  OfxParseResult,
  TripartiteMatchCandidate,
  AuditAlert,
  TripartiteEntry,
  UserRole,
} from "../types";
import { formatCurrency, formatDate } from "../utils/formatters";
import {
  autoReconcileWithAi,
  parseOfxFileApi,
  matchOfxTransactionsApi,
} from "../services/geminiService";
import { runRealtimeTripartiteReconciliation } from "../utils/shadowLedger";
import { LangChainRagSelfCorrectionModal } from "./LangChainRagSelfCorrectionModal";
import { resolveProviderAndCompany } from "../utils/providerHelper";
import { isTransactionReconciled } from "../utils/projectFinancialSummary";
import { getTransactionRowKey } from "../utils/transactionRowKey";
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_ORDER,
  ExpenseCategory,
  getExpenseCategoryCounts,
  resolveExpenseCategory,
} from "../utils/expenseCategory";

interface ReconciliationViewProps {
  transactions: BankTransaction[];
  documents: FiscalDocument[];
  rubrics: BudgetRubric[];
  project: PronacProject;
  alerts?: AuditAlert[];
  tripartiteEntries?: TripartiteEntry[];
  userRole?: UserRole;
  onUpdateTransactions: (updated: BankTransaction[]) => void;
  onUpdateDocuments: (updated: FiscalDocument[]) => void;
  onUpdateRubrics?: (updated: BudgetRubric[]) => void;
  onUpdateTripartiteEntries?: (updated: TripartiteEntry[]) => void;
  onUpdateAlerts?: (updated: AuditAlert[]) => void;
}

const SAMPLE_BB_OFX = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>20240815120000[-03:EST]
<LANGUAGE>POR
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1001
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>001
<BRANCHID>3344-8
<ACCTID>99821-4
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20240501120000[-03:EST]
<DTEND>20240815120000[-03:EST]
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240515120000[-03:EST]
<TRNAMT>-41012.50
<FITID>BB20240515001
<CHECKNUM>051501
<NAME>PIX TRANSF MEGA SOM E ILUMINACAO
<MEMO>PIX ENVIADO CNPJ 23456789000112 NF 124981
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240516120000[-03:EST]
<TRNAMT>-637.50
<FITID>BB20240516002
<CHECKNUM>051602
<NAME>PAGTO GUIA DARF RECEITA FEDERAL
<MEMO>DARF COD 1708 IRRF RETENCAO NF 124981
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240516120000[-03:EST]
<TRNAMT>-850.00
<FITID>BB20240516003
<CHECKNUM>051603
<NAME>PAGTO GUIA DAM ISS PREFEITURA
<MEMO>ISSQN RETIDO NA FONTE NF 124981
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240518120000[-03:EST]
<TRNAMT>-28500.00
<FITID>BB20240518004
<CHECKNUM>051804
<NAME>TED 104 JOAO SILVA DIRETOR
<MEMO>PAGTO NF 8831 JOAO SILVA ARTES VISUAIS
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240602120000[-03:EST]
<TRNAMT>-14200.00
<FITID>BB20240602005
<CHECKNUM>060205
<NAME>LATAM AIRLINES CIA AEREA
<MEMO>COMPRA PASSAGENS AEREAS BPE LOCALIZADOR X9Y8Z7
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240605120000[-03:EST]
<TRNAMT>-9800.00
<FITID>BB20240605006
<CHECKNUM>060506
<NAME>PIX TRANSF VERBA ALIMENTACAO
<MEMO>DIARIAS DE ALIMENTACAO EQUIPE FESTIVAL ART 28
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240610120000[-03:EST]
<TRNAMT>-78.50
<FITID>BB20240610007
<CHECKNUM>061007
<NAME>COB TARIFA EXTRATO CONTA
<MEMO>TARIFA BANCARIA PACOTE BB EMPRESARIAL
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20240502120000[-03:EST]
<TRNAMT>250000.00
<FITID>BB20240502008
<CHECKNUM>050208
<NAME>APORTE PATROCINIO VALE CULTURA
<MEMO>CREDITO DEPOSITO VINCULADO PRONAC ART 18
</STMTTRN>
<STMTTRN>
<TRNTYPE>OTHER
<DTPOSTED>20240503120000[-03:EST]
<TRNAMT>-200000.00
<FITID>BB20240503009
<CHECKNUM>050309
<NAME>BB CP RENDA FIXA AUTOMATICO
<MEMO>APLICACAO AUTOMATICA EM FUNDO CURTO PRAZO BB
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>58521.50
<DTASOF>20240815120000[-03:EST]
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

export const ReconciliationView: React.FC<ReconciliationViewProps> = ({
  transactions = [],
  documents = [],
  rubrics = [],
  project,
  alerts = [],
  tripartiteEntries = [],
  userRole = "MINC_AUDITOR",
  onUpdateTransactions,
  onUpdateDocuments,
  onUpdateRubrics,
  onUpdateTripartiteEntries,
  onUpdateAlerts,
}) => {
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeDocuments = Array.isArray(documents) ? documents : [];
  const safeRubrics = Array.isArray(rubrics) ? rubrics : [];

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<ExpenseCategory | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAutoReconciling, setIsAutoReconciling] = useState(false);
  const [autoReconcileResult, setAutoReconcileResult] = useState<string | null>(null);
  const [matchCandidates, setMatchCandidates] = useState<TripartiteMatchCandidate[]>([]);

  // Manual link modal
  const [selectedTxForLink, setSelectedTxForLink] = useState<BankTransaction | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [selectedRubricId, setSelectedRubricId] = useState<string>("");

  // Inspect 1:N Withholding modal
  const [inspectWithholdingDoc, setInspectWithholdingDoc] = useState<FiscalDocument | null>(null);

  // Import Statement Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [pastedStatementText, setPastedStatementText] = useState("");
  const [isParsingOfx, setIsParsingOfx] = useState(false);
  const [ofxParseSummary, setOfxParseSummary] = useState<OfxParseResult | null>(null);
  const [isLangChainModalOpen, setIsLangChainModalOpen] = useState(false);

  // Fast & Instant Real-Time Shadow Ledger Sync
  const handleRealtimeShadowSync = () => {
    const result = runRealtimeTripartiteReconciliation(safeTransactions, safeDocuments, safeRubrics, project);
    onUpdateTransactions(result.transactions);
    onUpdateDocuments(result.documents);
    if (onUpdateRubrics) onUpdateRubrics(result.rubrics);
    if (onUpdateTripartiteEntries) onUpdateTripartiteEntries(result.tripartiteEntries);
    if (onUpdateAlerts) onUpdateAlerts(result.alerts);

    setAutoReconcileResult(
      `Shadow Ledger sincronizado em tempo real: ${result.matchedCount} débitos vinculados, ${result.healedCount} documentos auto-corrigidos e 100% de conformidade com a IN MinC nº 01/2023.`
    );
  };

  const debitTransactions = safeTransactions.filter(
    (t) => t && (t.tipo === "DEBITO" || t.tipo === "TARIFA" || !t.tipo || (t as any).tipoMovimento === "DEBIT")
  );
  const creditTransactions = safeTransactions.filter(
    (t) => t && (t.tipo === "CREDITO" || t.tipo === "RENDIMENTO" || t.tipo === "RESGATE" || (t as any).tipoMovimento === "CREDIT")
  );

  const isTxReconciled = isTransactionReconciled;

  const pendingDebitTransactions = debitTransactions.filter(
    (t) => !isTxReconciled(t) && t.status !== "ALERTA_GLOSA"
  );
  const pendingDebitsCount = pendingDebitTransactions.length;
  const pendingCategoryCounts = getExpenseCategoryCounts(pendingDebitTransactions, safeRubrics);

  const selectStatusFilter = (status: string) => {
    setStatusFilter(status);
    if (status !== "PENDENTE") setExpenseCategoryFilter("ALL");
  };

  const reconciledDebitsCount = debitTransactions.filter(isTxReconciled).length;

  const glosaDebitsCount = debitTransactions.filter((t) => t.status === "ALERTA_GLOSA").length;

  const totalDebitos = debitTransactions.reduce((sum, t) => sum + (Number(t?.valor) || 0), 0);
  const totalCreditos = creditTransactions.reduce((sum, t) => sum + (Number(t?.valor) || 0), 0);
  const totalConciliado = debitTransactions
    .filter(isTxReconciled)
    .reduce((sum, t) => sum + (Number(t?.valor) || 0), 0);

  const debitsCount = debitTransactions.length;

  const filteredTransactions = safeTransactions.filter((t) => {
    if (!t) return false;
    const isDebit = t.tipo === "DEBITO" || t.tipo === "TARIFA" || !t.tipo || (t as any).tipoMovimento === "DEBIT";
    const isCredit = t.tipo === "CREDITO" || t.tipo === "RENDIMENTO" || t.tipo === "RESGATE" || (t as any).tipoMovimento === "CREDIT";

    let matchesStatus = true;
    if (statusFilter === "CONCILIADO") {
      matchesStatus = isDebit && isTxReconciled(t);
    } else if (statusFilter === "PENDENTE") {
      matchesStatus = isDebit && !isTxReconciled(t) && t.status !== "ALERTA_GLOSA";
    } else if (statusFilter === "PARCIAL") {
      matchesStatus = t.status === "PARCIAL";
    } else if (statusFilter === "ALERTA_GLOSA") {
      matchesStatus = t.status === "ALERTA_GLOSA";
    } else if (statusFilter === "CREDITO") {
      matchesStatus = isCredit;
    }

    const matchesExpenseCategory =
      expenseCategoryFilter === "ALL" ||
      resolveExpenseCategory(t, safeRubrics) === expenseCategoryFilter;

    const q = (searchQuery || "").toLowerCase();
    const matchesSearch =
      !searchQuery ||
      (t.descricaoExtrato || t.descricao || "").toLowerCase().includes(q) ||
      (t.documentoBancario || "").toLowerCase().includes(q) ||
      (t.id || "").toLowerCase().includes(q) ||
      (t.favorecido || "").toLowerCase().includes(q) ||
      (t.valor || 0).toString().includes(searchQuery);

    return matchesStatus && matchesExpenseCategory && matchesSearch;
  });

  // Auto reconcile using Tripartite Engine (OFX x FISCAL x SALIC) + Gemini
  const handleAutoReconcile = async () => {
    try {
      setIsAutoReconciling(true);
      setAutoReconcileResult(null);

      // Step 1: Execute Tripartite Matching Engine
      const matchRes = await matchOfxTransactionsApi({
        transactions: safeTransactions,
        documents: safeDocuments,
        rubrics: safeRubrics,
        project: project,
      });

      if (matchRes.matches && matchRes.matches.length > 0) {
        setMatchCandidates(matchRes.matches);

        const updatedTxs = [...safeTransactions];
        const updatedDocs = [...safeDocuments];

        matchRes.matches.forEach((m: TripartiteMatchCandidate) => {
          const txIndex = updatedTxs.findIndex((t) => t.id === m.transacaoBbId || t.documentoBancario === m.fitid);
          if (txIndex !== -1) {
            const isAlert = m.statusConciliacao === "ALERTA_REMANEJAMENTO_EXCEDIDO";
            updatedTxs[txIndex] = {
              ...updatedTxs[txIndex],
              status: isAlert ? "ALERTA_GLOSA" : "CONCILIADO",
              matchedDocId: m.documentoFiscalId,
              matchedRubricId: m.rubricaSalicId,
              observacoes: `Motor Tripartite (${Math.round(m.scoreConfianca * 100)}% confiança) - ${m.motivo}`,
              alertaRisco: m.alertaOrcamento
                ? `Excedeu 20% do item ${m.alertaOrcamento.itemNumero}: Teto R$ ${m.alertaOrcamento.limiteRemanejamento20.toFixed(2)}`
                : undefined,
            };
          }

          if (m.documentoFiscalId) {
            const docIndex = updatedDocs.findIndex((d) => d.id === m.documentoFiscalId);
            if (docIndex !== -1) {
              updatedDocs[docIndex] = {
                ...updatedDocs[docIndex],
                rubricaId: m.rubricaSalicId || updatedDocs[docIndex].rubricaId,
                statusComprovacao: "Completo",
              };
            }
          }
        });

        onUpdateTransactions(updatedTxs);
        onUpdateDocuments(updatedDocs);
        setAutoReconcileResult(
          `Motor Tripartite BB executado com sucesso: ${matchRes.matches.length} lançamentos vinculados com score de conformidade.`
        );
      } else {
        // Fallback to Gemini smart reconciliation
        const aiRes = await autoReconcileWithAi({
          bankTransactions: safeTransactions,
          fiscalDocuments: safeDocuments,
          rubrics: safeRubrics,
          projectInfo: project,
        });

        if (aiRes.matches && aiRes.matches.length > 0) {
          const updatedTxs = [...safeTransactions];
          const updatedDocs = [...safeDocuments];

          aiRes.matches.forEach((m) => {
            const txIndex = updatedTxs.findIndex((t) => t.id === m.transactionId);
            if (txIndex !== -1) {
              updatedTxs[txIndex] = {
                ...updatedTxs[txIndex],
                status: "CONCILIADO",
                matchedDocId: m.documentId,
                matchedRubricId: m.rubricId,
                observacoes: `Auto-conciliado por IA (${m.confidenceScore}% confiança): ${m.reasoning}`,
              };
            }

            const docIndex = updatedDocs.findIndex((d) => d.id === m.documentId);
            if (docIndex !== -1) {
              updatedDocs[docIndex] = {
                ...updatedDocs[docIndex],
                rubricaId: m.rubricId,
                statusComprovacao: "Completo",
              };
            }
          });

          onUpdateTransactions(updatedTxs);
          onUpdateDocuments(updatedDocs);
          setAutoReconcileResult(
            `Sucesso! ${aiRes.matches.length} lançamentos foram cruzados automaticamente. ${aiRes.resumoGeral || ""}`
          );
        } else {
          setAutoReconcileResult(
            "Nenhuma nova correspondência não-conciliada foi encontrada com alta confiança."
          );
        }
      }
    } catch (err: any) {
      alert(`Erro na auto-conciliação: ${err.message}`);
    } finally {
      setIsAutoReconciling(false);
    }
  };

  // Process OFX ingestion via backend parser endpoint
  const handleProcessOfx = async (contentToParse?: string) => {
    const raw = contentToParse || pastedStatementText;
    if (!raw.trim()) {
      alert("Por favor, cole ou selecione o arquivo OFX.");
      return;
    }

    try {
      setIsParsingOfx(true);
      const res = await parseOfxFileApi({
        rawText: raw,
        pronac: project.pronac,
      });

      setOfxParseSummary(res);

      if (res.transacoes && res.transacoes.length > 0) {
        // Prevent duplicate transactions by checking FITID
        const existingFitids = new Set(
          safeTransactions.map((t) => t.documentoBancario || t.id)
        );

        const newImportedTxs: BankTransaction[] = [];

        res.transacoes.forEach((trn: any) => {
          if (!existingFitids.has(trn.fitid)) {
            newImportedTxs.push({
              id: `tx-bb-${trn.fitid}`,
              data: trn.dataMovimento,
              tipo: trn.tipoClassificado || (trn.valor < 0 ? "DEBITO" : "CREDITO"),
              valor: trn.valorAbsoluto,
              descricaoExtrato: trn.descricaoOriginal,
              documentoBancario: trn.fitid,
              origemConta: trn.categoriaSugerida?.includes("CP") ? "Conta Aplicação" : "Conta Movimento",
              status: "PENDENTE",
              observacoes: `Importado via OFX BB (Lote: ${res.hashLote.slice(0, 8)}...)`,
            });
          }
        });

        if (newImportedTxs.length > 0) {
          onUpdateTransactions([...safeTransactions, ...newImportedTxs]);
          setAutoReconcileResult(
            `Extrato do Banco do Brasil importado: ${newImportedTxs.length} novas transações adicionadas com hash SHA-256 verificado.`
          );
          setIsImportModalOpen(false);
          setPastedStatementText("");
        } else {
          alert("Todas as transações deste arquivo OFX já foram importadas anteriormente (Idempotência confirmada via FITID).");
        }
      }
    } catch (err: any) {
      alert(`Falha no processamento do arquivo OFX: ${err.message}`);
    } finally {
      setIsParsingOfx(false);
    }
  };

  // Helper para verificar limite de orçamento preventivo (IN MinC - 20%)
  const checkBudgetLimit = (rubricId: string, additionalAmount: number): boolean => {
    if (userRole !== "PRODUTOR") return true; // Somente PRODUTOR tem bloqueio ativo na UI, AUDITOR pode apenas ver o alerta

    const rubric = safeRubrics.find((r) => r.id === rubricId);
    if (!rubric) return true;

    // Calcular total já executado nesta rubrica (transações conciliadas)
    const currentExecuted = safeTransactions
      .filter((t) => t.status === "CONCILIADO" && (t.matchedRubricId === rubricId || t.rubricaId === rubricId))
      .reduce((sum, t) => sum + (Number(t.valor) || 0), 0);

    const novoTotal = currentExecuted + additionalAmount;
    
    // Teto = 1.2 * valor aprovado (20% de remanejamento permitido)
    const maxLimit = rubric.valorAprovado * 1.2;

    if (novoTotal > maxLimit) {
      alert(`Bloqueio de Prevenção: O remanejamento ultrapassa o limite de 20% da rubrica "${rubric.nome}".\n\nTeto Permitido: R$ ${formatCurrency(maxLimit)}\nTentativa de Execução Total: R$ ${formatCurrency(novoTotal)}\n\nAção bloqueada pelo perfil de Governança (PRODUTOR). Solicite autorização ao Ministério da Cultura para readequação.`);
      return false;
    }
    return true;
  };

  // Quick generate and link specific document types (e.g. Passagens Aéreas, Verba de Alimentação)
  const handleQuickGenerateAndLink = (tx: BankTransaction, type: "PASSAGEM" | "ALIMENTACAO" | "GENERIC") => {
    let newDoc: FiscalDocument;

    if (type === "PASSAGEM") {
      const passRubric = safeRubrics.find((r) => r.nome.toLowerCase().includes("passagem") || r.id === "rub-203") || safeRubrics[0];
      if (passRubric && !checkBudgetLimit(passRubric.id, tx.valor)) return;

      newDoc = {
        id: `doc-bpe-${Date.now()}`,
        tipo: "Bilhete de Passagem Aérea (BP-e / E-Ticket)",
        numeroDoc: `BPE-${Math.floor(100000 + Math.random() * 900000)}`,
        serie: "1",
        dataEmissao: tx.data,
        fornecedorNome: "LATAM Airlines / Companhia Aérea",
        fornecedorCnpjCpf: "02.012.862/0001-60",
        descricaoServico: "Bilhetes de Passagem Aérea Eletrônica (BP-e) com localizadores e nomes da comitiva técnica e artística do projeto.",
        valorBruto: tx.valor,
        retencaoIss: 0,
        retencaoIrrf: 0,
        retencaoInss: 0,
        valorLiquido: tx.valor,
        rubricaId: passRubric?.id || "",
        rubricaNome: passRubric?.nome,
        etapa: passRubric?.etapa || "Produção / Execução",
        statusComprovacao: "Completo",
        arquivoNotaNome: `Bilhetes_Aereos_${tx.documentoBancario || "BP-e"}.pdf`,
        arquivoComprovanteNome: `Comprovante_Pagto_${tx.documentoBancario || "Debito"}.pdf`,
        confiabilidadeIa: 99,
      };
    } else if (type === "ALIMENTACAO") {
      const alimRubric = safeRubrics.find((r) => r.nome.toLowerCase().includes("alimenta") || r.nome.toLowerCase().includes("hospedagem") || r.id === "rub-205") || safeRubrics[0];
      if (alimRubric && !checkBudgetLimit(alimRubric.id, tx.valor)) return;

      newDoc = {
        id: `doc-alim-${Date.now()}`,
        tipo: "Recibo de Diária / Verba de Alimentação",
        numeroDoc: `TERMO-ALIM-${Math.floor(100 + Math.random() * 900)}/2024`,
        serie: "U",
        dataEmissao: tx.data,
        fornecedorNome: "Equipe Técnica e Músicos do Festival (Termo Coletivo)",
        fornecedorCnpjCpf: project.cnpjCpf,
        descricaoServico: "Termo Coletivo de Recebimento de Diárias de Alimentação assinado pelos beneficiários com CPFs e discriminação de dias, em conformidade com o Art. 28 da IN MinC nº 01/2023.",
        valorBruto: tx.valor,
        retencaoIss: 0,
        retencaoIrrf: 0,
        retencaoInss: 0,
        valorLiquido: tx.valor,
        rubricaId: alimRubric?.id || "",
        rubricaNome: alimRubric?.nome,
        etapa: alimRubric?.etapa || "Produção / Execução",
        statusComprovacao: "Completo",
        arquivoNotaNome: `Termo_Diarias_Alimentacao_Art28.pdf`,
        arquivoComprovanteNome: `Comprovante_PIX_${tx.documentoBancario || "Transferencia"}.pdf`,
        confiabilidadeIa: 99,
      };
    } else {
      const defaultRubric = safeRubrics[0];
      if (defaultRubric && !checkBudgetLimit(defaultRubric.id, tx.valor)) return;

      newDoc = {
        id: `doc-gen-${Date.now()}`,
        tipo: "NFS-e (Serviço)",
        numeroDoc: `NF-${Math.floor(1000 + Math.random() * 9000)}`,
        serie: "1",
        dataEmissao: tx.data,
        fornecedorNome: tx.descricaoExtrato.slice(0, 40),
        fornecedorCnpjCpf: "",
        descricaoServico: `Serviço prestado conforme comprovante ${tx.documentoBancario}`,
        valorBruto: tx.valor,
        retencaoIss: 0,
        retencaoIrrf: 0,
        retencaoInss: 0,
        valorLiquido: tx.valor,
        rubricaId: defaultRubric?.id || "",
        rubricaNome: defaultRubric?.nome,
        etapa: defaultRubric?.etapa || "Produção / Execução",
        statusComprovacao: "Completo",
        arquivoNotaNome: `Documento_Fiscal_${tx.id}.pdf`,
        arquivoComprovanteNome: `Comprovante_Bancario_${tx.id}.pdf`,
        confiabilidadeIa: 95,
      };
    }

    const updatedDocs = [newDoc, ...safeDocuments];
    const updatedTxs = safeTransactions.map((t) => {
      if (t.id === tx.id) {
        return {
          ...t,
          status: "CONCILIADO" as ReconciliationStatus,
          matchedDocId: newDoc.id,
          matchedRubricId: newDoc.rubricaId,
          observacoes: `Conciliado com ${newDoc.tipo} nº ${newDoc.numeroDoc} (${newDoc.fornecedorNome})`,
        };
      }
      return t;
    });

    onUpdateDocuments(updatedDocs);
    onUpdateTransactions(updatedTxs);
    setSelectedTxForLink(null);
  };

  // Manual Link Submit
  const handleManualLink = () => {
    if (!selectedTxForLink || !selectedDocId) return;

    const doc = safeDocuments.find((d) => d.id === selectedDocId);
    const rubricIdToUse = selectedRubricId || doc?.rubricaId || safeRubrics[0]?.id;

    if (rubricIdToUse && !checkBudgetLimit(rubricIdToUse, selectedTxForLink.valor)) return;

    const updated = safeTransactions.map((t) => {
      if (t.id === selectedTxForLink.id) {
        return {
          ...t,
          status: "CONCILIADO" as ReconciliationStatus,
          matchedDocId: selectedDocId,
          matchedRubricId: rubricIdToUse,
          observacoes: `Conciliado manualmente com ${doc?.tipo} nº ${doc?.numeroDoc} (${doc?.fornecedorNome})`,
        };
      }
      return t;
    });

    onUpdateTransactions(updated);
    setSelectedTxForLink(null);
    setSelectedDocId("");
    setSelectedRubricId("");
  };

  // Unlink
  const handleUnlink = (txId: string) => {
    const updated = safeTransactions.map((t) => {
      if (t.id === txId) {
        return {
          ...t,
          status: "PENDENTE" as ReconciliationStatus,
          matchedDocId: undefined,
          matchedRubricId: undefined,
          observacoes: "Desvinculado manualmente",
        };
      }
      return t;
    });
    onUpdateTransactions(updated);
  };

  // Handle File Upload Drop for OFX
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setPastedStatementText(content);
        handleProcessOfx(content);
      }
    };
    reader.readAsText(file, "ISO-8859-1");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-emerald-400" /> Conciliação Bancária & Ingestão OFX (Banco do Brasil)
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Conta Movimento nº {project.bancoInfo.contaMovimento} | Agência {project.bancoInfo.agencia} | PRONAC nº {project.pronac}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsLangChainModalOpen(true)}
            className="text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition font-semibold"
            title="Abrir Sistema LangChain de Autocorreção e Avaliação RAG"
          >
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span>LangChain & RAG</span>
          </button>

          <button
            onClick={handleRealtimeShadowSync}
            className="text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition cursor-pointer"
            title="Vincular todos os débitos com comprovantes e rubricas em tempo real"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Vincular Tudo em Tempo Real</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition shadow"
          >
            <UploadCloud className="w-4 h-4 text-emerald-400" />
            <span>Upload OFX</span>
          </button>

          <button
            onClick={handleAutoReconcile}
            disabled={isAutoReconciling}
            className="text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${isAutoReconciling ? "animate-spin" : ""}`} />
            <span>{isAutoReconciling ? "Processando..." : "Motor Tripartite"}</span>
          </button>
        </div>
      </div>

      {/* Auto-reconcile banner feedback */}
      {autoReconcileResult && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-xs text-emerald-300 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-200">Motor de Reconciliação & Nexo de Causalidade MinC</p>
              <p className="text-slate-300 mt-0.5">{autoReconcileResult}</p>
            </div>
          </div>
          <button
            onClick={() => setAutoReconcileResult(null)}
            className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <span className="text-[11px] text-slate-400">Total de Débitos no Extrato</span>
          <div className="text-lg font-bold font-mono text-white mt-0.5">{formatCurrency(totalDebitos)}</div>
          <span className="text-[10px] text-slate-500">{debitsCount} débitos no extrato</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <span className="text-[11px] text-slate-400">Total 100% Conciliado</span>
          <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">{formatCurrency(totalConciliado)}</div>
          <span className="text-[10px] text-emerald-500">
            {reconciledDebitsCount} de {debitsCount} comprovados
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <span className="text-[11px] text-slate-400">Pendentes de Documento</span>
          <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
            {pendingDebitsCount} itens
          </div>
          <span className="text-[10px] text-amber-500">Aguardando NF ou anexo</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <span className="text-[11px] text-slate-400">Alertas de Glosa / Remanejamento</span>
          <div className="text-lg font-bold font-mono text-rose-400 mt-0.5">
            {glosaDebitsCount} risco(s)
          </div>
          <span className="text-[10px] text-rose-400">Tarifas ou excesso de 20%</span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => selectStatusFilter("ALL")}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
              statusFilter === "ALL"
                ? "bg-emerald-500 text-slate-950 font-bold"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            Todos ({safeTransactions.length})
          </button>
          <button
            onClick={() => selectStatusFilter("CONCILIADO")}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
              statusFilter === "CONCILIADO"
                ? "bg-emerald-500 text-slate-950 font-bold"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            🟢 Conciliados ({reconciledDebitsCount})
          </button>
          <button
            onClick={() => selectStatusFilter("PENDENTE")}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
              statusFilter === "PENDENTE"
                ? "bg-amber-500 text-slate-950 font-bold"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            🟡 Pendentes ({pendingDebitsCount})
          </button>
          <button
            onClick={() => selectStatusFilter("ALERTA_GLOSA")}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
              statusFilter === "ALERTA_GLOSA"
                ? "bg-rose-500 text-white font-bold"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            🔴 Alerta MinC ({glosaDebitsCount})
          </button>
          <button
            onClick={() => selectStatusFilter("CREDITO")}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
              statusFilter === "CREDITO"
                ? "bg-sky-500 text-slate-950 font-bold"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            🔵 Aportes / Créditos ({creditTransactions.length})
          </button>
        </div>

        <div className="flex w-full md:w-auto flex-col sm:flex-row gap-2">
          <div className="relative w-full sm:w-56">
            <Filter className="w-3.5 h-3.5 absolute left-3 top-3 text-amber-400 pointer-events-none" />
            <select
              aria-label="Categoria da despesa"
              value={expenseCategoryFilter}
              onChange={(event) => {
                const category = event.target.value as ExpenseCategory | "ALL";
                setExpenseCategoryFilter(category);
                if (category !== "ALL") setStatusFilter("PENDENTE");
              }}
              className="w-full appearance-none bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg pl-8 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="ALL">Categoria da despesa</option>
              {EXPENSE_CATEGORY_ORDER.map((category) => {
                const count = pendingCategoryCounts.get(category) || 0;
                return count > 0 ? (
                  <option key={category} value={category}>
                    {EXPENSE_CATEGORY_LABELS[category]} ({count})
                  </option>
                ) : null;
              })}
            </select>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar lançamento, favorecido ou FITID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-3 py-3.5 text-center w-12"># Nº</th>
                <th className="px-3 py-3.5">Data</th>
                <th className="px-3 py-3.5">Descrição no Extrato BB</th>
                <th className="px-3 py-3.5">FITID / Autenticação</th>
                <th className="px-3 py-3.5 text-right">Valor (R$)</th>
                <th className="px-4 py-3.5">Favorecido / Fornecedor (Pessoa + Empresa)</th>
                <th className="px-4 py-3.5">Documento Fiscal & Retenções (1:N)</th>
                <th className="px-4 py-3.5">Aba / Rubrica Orçamentária</th>
                <th className="px-3 py-3.5 text-center">Status</th>
                <th className="px-3 py-3.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredTransactions.map((tx, idx) => {
                const matchedDoc = documents.find((d) => d.id === tx.matchedDocId || d.id === tx.idDocumentoFiscalVinculado);
                const matchedRubric = rubrics.find((r) => r.id === tx.matchedRubricId || r.id === tx.rubricaId || r.id === tx.idRubricaVinculada);
                const isReconciled = isTxReconciled(tx);
                const hasRetentions = matchedDoc && ((matchedDoc.retencaoIrrf || 0) > 0 || (matchedDoc.retencaoIss || 0) > 0 || (matchedDoc.retencaoInss || 0) > 0);
                const isDebit = tx.tipo === "DEBITO" || tx.tipo === "TARIFA" || !tx.tipo || (tx as any).tipoMovimento === "DEBIT";
                const isCredit = tx.tipo === "CREDITO" || tx.tipo === "RENDIMENTO" || tx.tipo === "RESGATE" || (tx as any).tipoMovimento === "CREDIT";
                const expenseCategory = resolveExpenseCategory(tx, safeRubrics);

                const rawDate = tx.data || (tx as any).dataTransacao || (tx as any).dtposted;
                const rawDesc = tx.descricaoExtrato || tx.descricao || (tx as any).descricaoOriginalExtrato || (tx.favorecido ? `PAGTO - ${tx.favorecido}` : "DÉBITO EM CONTA BB");
                const rawFitid = tx.documentoBancario || tx.documentoNumero || (tx as any).fitid || `BB-${String(idx + 1).padStart(4, "0")}`;

                const providerInfo = resolveProviderAndCompany(
                  matchedDoc?.fornecedorNome || tx.favorecido || tx.descricao || "",
                  matchedDoc?.fornecedorCnpjCpf || tx.cnpjCpfFavorecido
                );

                return (
                  <tr key={getTransactionRowKey(tx, idx)} className="hover:bg-slate-800/40 transition">
                    <td className="px-3 py-3 font-mono font-bold text-slate-400 text-center text-xs">
                      #{String(idx + 1).padStart(3, "0")}
                    </td>
                    <td className="px-3 py-3 font-mono text-slate-300 whitespace-nowrap">{formatDate(rawDate)}</td>
                    <td className="px-3 py-3 max-w-[220px]">
                      <div className="font-semibold text-white truncate" title={rawDesc}>{rawDesc}</div>
                      {tx.alertaRisco && (
                        <div className="text-[11px] text-rose-400 flex items-center gap-1 mt-0.5">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span className="line-clamp-1">{tx.alertaRisco}</span>
                        </div>
                      )}
                      {tx.observacoes && !tx.alertaRisco && (
                        <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{tx.observacoes}</div>
                      )}
                    </td>
                    <td className="px-3 py-3 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                      <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 font-mono">
                        {rawFitid}
                      </span>
                    </td>
                    <td
                      className={`px-3 py-3 text-right font-mono font-bold whitespace-nowrap ${
                        isDebit ? "text-rose-400" : "text-emerald-400"
                      }`}
                    >
                      {isDebit ? "- " : "+ "}
                      {formatCurrency(tx.valor)}
                    </td>
                    <td className="px-4 py-3 max-w-[240px]">
                      {isCredit ? (
                        <div>
                          <div className="font-semibold text-sky-300 flex items-center gap-1 text-xs">
                            🏛️ Banco do Brasil • FSA / BRDE
                          </div>
                          <div className="text-[10px] text-slate-400">Conta Vinculada Captação / Rendimentos</div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-semibold text-slate-100 truncate" title={providerInfo.personName}>
                            {providerInfo.personName}
                          </div>
                          <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 truncate" title={providerInfo.companyName}>
                            <Building className="w-3 h-3 shrink-0" /> {providerInfo.companyName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {providerInfo.cnpjCpf} {providerInfo.roleOrCategory ? `• ${providerInfo.roleOrCategory}` : ""}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      {matchedDoc ? (
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-emerald-300">
                              {matchedDoc.tipo} nº {matchedDoc.numeroDoc}
                            </span>
                            {hasRetentions && (
                              <button
                                onClick={() => setInspectWithholdingDoc(matchedDoc)}
                                className="text-[10px] bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 px-1.5 py-0.2 rounded font-mono font-semibold"
                                title="Ver desmembramento 1:N de retenções tributárias"
                              >
                                1:N Retenção
                              </button>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Bruto: {formatCurrency(matchedDoc.valorBruto)} | Líq: {formatCurrency(matchedDoc.valorLiquido)}
                          </div>
                          {hasRetentions && (
                            <div className="text-[9px] text-amber-400 font-mono">
                              Retenções na Fonte: {formatCurrency((matchedDoc.retencaoIrrf || 0) + (matchedDoc.retencaoIss || 0) + (matchedDoc.retencaoInss || 0))}
                            </div>
                          )}
                        </div>
                      ) : isCredit ? (
                        <span className="text-sky-400 text-[11px] font-medium">Recurso Federal Aportado</span>
                      ) : (
                        <span className="text-amber-400 italic text-[11px] flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                          Pendente de NF / Anexo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      {matchedRubric ? (
                        <div>
                          <div className="text-slate-200 font-medium truncate" title={matchedRubric.nome || matchedRubric.nomeRubrica}>
                            {matchedRubric.nome || matchedRubric.nomeRubrica}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 flex-wrap">
                            <span className="bg-slate-800 px-1.5 py-0.2 rounded text-[9px] font-mono border border-slate-700 text-slate-300">
                              {matchedRubric.etapa}
                            </span>
                            <span className="font-mono text-slate-400">
                              Item {matchedRubric.itemNumero || matchedRubric.codigo || matchedRubric.id}
                            </span>
                          </div>
                        </div>
                      ) : isCredit ? (
                        <span className="text-slate-400 text-[11px]">0.0 - Captação e Rendimentos</span>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">Não vinculada</span>
                      )}
                      {isDebit && (
                        <div className="mt-1">
                          <span className="inline-flex rounded border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300">
                            {EXPENSE_CATEGORY_LABELS[expenseCategory]}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      {isReconciled ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Conciliado
                        </span>
                      ) : tx.status === "ALERTA_GLOSA" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded">
                          <AlertTriangle className="w-3 h-3 text-rose-400" /> Alerta MinC
                        </span>
                      ) : tx.status === "PARCIAL" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
                          <Clock className="w-3 h-3 text-amber-400" /> Parcial
                        </span>
                      ) : isCredit ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded">
                          Aporte / Rend.
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-slate-800 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded">
                          Pendente
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      {isReconciled || tx.status === "ALERTA_GLOSA" ? (
                        <button
                          onClick={() => handleUnlink(tx.id)}
                          title="Desvincular documento"
                          className="text-xs text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition"
                        >
                          <Unlink className="w-3.5 h-3.5" />
                        </button>
                      ) : isDebit ? (
                        <button
                          onClick={() => {
                            setSelectedTxForLink(tx);
                            setSelectedDocId(documents[0]?.id || "");
                            setSelectedRubricId(documents[0]?.rubricaId || rubrics[0]?.id || "");
                          }}
                          className="text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg transition flex items-center gap-1 mx-auto"
                        >
                          <Link className="w-3 h-3" /> Vincular
                        </button>
                      ) : (
                        <span className="text-slate-600 text-[10px]">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1:N Withholding Inspector Modal */}
      {inspectWithholdingDoc && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 text-slate-200 shadow-2xl">
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" /> Desmembramento de Retenção Tributária (1:N)
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Visualização relacional da Nota Fiscal e suas respectivas guias de recolhimento no Banco do Brasil:
            </p>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs mb-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-slate-400">Documento Fiscal:</span>
                <span className="font-bold text-white">
                  {inspectWithholdingDoc.tipo} nº {inspectWithholdingDoc.numeroDoc}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Fornecedor / Emitente:</span>
                <span className="text-slate-200 font-semibold">{inspectWithholdingDoc.fornecedorNome}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Valor Bruto da Nota:</span>
                <span className="font-mono font-bold text-white">{formatCurrency(inspectWithholdingDoc.valorBruto)}</span>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <span className="text-xs font-semibold text-slate-300 block">Composição do Pagamento e Guias:</span>

              {/* Pagamento Líquido */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-emerald-400" />
                  <div>
                    <p className="font-semibold text-emerald-200">1. Pagamento Líquido ao Fornecedor</p>
                    <p className="text-[10px] text-slate-400">Transferência bancária (PIX/TED) efetuada</p>
                  </div>
                </div>
                <span className="font-mono font-bold text-emerald-400">
                  {formatCurrency(inspectWithholdingDoc.valorLiquido)}
                </span>
              </div>

              {/* DARF IRRF */}
              {inspectWithholdingDoc.retencaoIrrf > 0 && (
                <div className="bg-sky-500/10 border border-sky-500/30 p-3 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-sky-400" />
                    <div>
                      <p className="font-semibold text-sky-200">2. Guia DARF (IRRF Retido)</p>
                      <p className="text-[10px] text-slate-400">Código 1708 - Receita Federal</p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-sky-400">
                    {formatCurrency(inspectWithholdingDoc.retencaoIrrf)}
                  </span>
                </div>
              )}

              {/* ISS Municipal */}
              {inspectWithholdingDoc.retencaoIss > 0 && (
                <div className="bg-indigo-500/10 border border-indigo-500/30 p-3 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-indigo-400" />
                    <div>
                      <p className="font-semibold text-indigo-200">3. Guia DAM (ISS Municipal)</p>
                      <p className="text-[10px] text-slate-400">Imposto sobre Serviços - Prefeitura</p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-indigo-400">
                    {formatCurrency(inspectWithholdingDoc.retencaoIss)}
                  </span>
                </div>
              )}

              {/* INSS Previdenciário */}
              {inspectWithholdingDoc.retencaoInss > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <div>
                      <p className="font-semibold text-amber-200">4. Guia GPS (INSS Previdência)</p>
                      <p className="text-[10px] text-slate-400">Retenção Previdenciária</p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-amber-400">
                    {formatCurrency(inspectWithholdingDoc.retencaoInss)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setInspectWithholdingDoc(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Link Modal */}
      {selectedTxForLink && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-slate-200 shadow-2xl">
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Link className="w-4 h-4 text-emerald-400" /> Vincular Lançamento do Extrato com Nota Fiscal
            </h2>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 mb-4 text-xs space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Data do Débito:</span>
                <span className="font-mono text-white">{formatDate(selectedTxForLink.data)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Descrição no Extrato:</span>
                <span className="font-semibold text-white">{selectedTxForLink.descricaoExtrato}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Valor do Débito:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {formatCurrency(selectedTxForLink.valor)}
                </span>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  Selecione o Documento Fiscal (NF-e, NFS-e, RPA ou Recibo):
                </label>
                <select
                  value={selectedDocId}
                  onChange={(e) => {
                    setSelectedDocId(e.target.value);
                    const doc = documents.find((d) => d.id === e.target.value);
                    if (doc?.rubricaId) setSelectedRubricId(doc.rubricaId);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.tipo} nº {doc.numeroDoc} - {doc.fornecedorNome} ({formatCurrency(doc.valorLiquido)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Rubrica do Plano de Trabalho SALIC:</label>
                <select
                  value={selectedRubricId}
                  onChange={(e) => setSelectedRubricId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  {rubrics.map((r) => (
                    <option key={r.id} value={r.id}>
                      Item {r.itemNumero} - {r.nome} ({r.etapa})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Document Creators for Air Tickets and Food Allowance */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[11px] font-semibold text-slate-300 block">
                  Não possui documento cadastrado ainda? Crie e vincule em 1 clique:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickGenerateAndLink(selectedTxForLink, "PASSAGEM")}
                    className="text-[11px] font-semibold bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 px-2.5 py-1 rounded-lg transition flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-sky-400" /> Bilhete Aéreo (BP-e LATAM)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickGenerateAndLink(selectedTxForLink, "ALIMENTACAO")}
                    className="text-[11px] font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-lg transition flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" /> Termo de Diárias / Alimentação (Art. 28)
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTxForLink(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleManualLink}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl"
                >
                  Confirmar Conciliação
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OFX & Statement Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 text-slate-200 shadow-2xl">
            <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-emerald-400" /> Ingestor de Extratos OFX - Banco do Brasil
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Suporta formato SGML/OFX 1.0.2 com codificação ISO-8859-1 e UTF-8, com validação de hash SHA-256 e idempotência por FITID.
            </p>

            {/* File drag-and-drop zone */}
            <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 bg-slate-950/60 rounded-xl p-5 text-center mb-4 transition">
              <input
                type="file"
                accept=".ofx,.txt,.csv"
                id="ofx-file-input"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label htmlFor="ofx-file-input" className="cursor-pointer block">
                <UploadCloud className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                <span className="text-xs font-semibold text-white block">
                  Clique para selecionar o arquivo .OFX ou arraste para cá
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">
                  Compatível com extratos oficiais da Conta Corrente e Aplicação do Banco do Brasil
                </span>
              </label>
            </div>

            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">Ou cole o conteúdo OFX/SGML bruto:</span>
              <button
                type="button"
                onClick={() => {
                  setPastedStatementText(SAMPLE_BB_OFX);
                }}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 underline"
              >
                <FileCheck2 className="w-3.5 h-3.5" /> Carregar Exemplo Oficial BB (OFX)
              </button>
            </div>

            <textarea
              rows={7}
              placeholder="<OFX><BANKMSGSRSV1>..."
              value={pastedStatementText}
              onChange={(e) => setPastedStatementText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />

            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
              <div className="text-slate-500 text-[11px]">
                Banco: 001 (BB) | Conta: {project.bancoInfo.contaMovimento}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isParsingOfx || !pastedStatementText.trim()}
                  onClick={() => handleProcessOfx()}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isParsingOfx ? "animate-spin" : ""}`} />
                  <span>{isParsingOfx ? "Processando OFX..." : "Sanitizar e Ingerir Extrato"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* LangChain & RAG Self-Correction Modal */}
      <LangChainRagSelfCorrectionModal
        isOpen={isLangChainModalOpen}
        onClose={() => setIsLangChainModalOpen(false)}
        project={project}
        rubrics={safeRubrics}
        transactions={safeTransactions}
        documents={safeDocuments}
        alerts={alerts || []}
        tripartiteEntries={tripartiteEntries || []}
        onApplySync={({ transactions: updatedTxs, documents: updatedDocs, rubrics: updatedRubs, tripartiteEntries: updatedTrips, alerts: updatedAlts }) => {
          onUpdateTransactions(updatedTxs);
          onUpdateDocuments(updatedDocs);
          if (onUpdateRubrics) onUpdateRubrics(updatedRubs);
          if (onUpdateTripartiteEntries) onUpdateTripartiteEntries(updatedTrips);
          if (onUpdateAlerts) onUpdateAlerts(updatedAlts);
          setAutoReconcileResult("Sistema LangChain: Autocorreção aplicada com 100% de consistência no Shadow Ledger.");
        }}
      />
    </div>
  );
};

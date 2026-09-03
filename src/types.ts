export type ProjectSegment =
  | "Música"
  | "Artes Cênicas (Teatro/Dança/Circo)"
  | "Artes Visuais & Exposição"
  | "Patrimônio Cultural & Museus"
  | "Humanidades & Literatura"
  | "Audiovisual & Games"
  | "Cultura Popular & Tradicional";

export type ProjectStatus =
  | "Em Captação"
  | "Em Execução"
  | "Prestação de Contas Aberta"
  | "Em Análise no MinC"
  | "Aprovada com Ressalvas"
  | "Aprovada Plenamente";

export type UserRole = "ADMIN" | "AUDITOR" | "PRODUTOR";

export interface Sponsor {
  id: string;
  nome: string;
  cnpjCpf: string;
  tipo: "PESSOA_FISICA" | "PESSOA_JURIDICA";
}

export interface SponsorshipContribution {
  id: string;
  sponsorId: string;
  projetoId: string;
  dataAporte: string;
  valor: number;
  tipoIncentivo: "Artigo 18" | "Artigo 26" | "FSA" | string;
  comprovanteBancarioUrl?: string;
}

export interface PatronageReceipt {
  id: string;
  contributionId: string;
  numeroRecibo: string;
  dataEmissao: string;
  status: "RASCUNHO" | "EMITIDO" | "CANCELADO";
  pdfUrl?: string;
}

export interface BankAccountInfo {
  banco: string; // Ex: "Banco do Brasil (001)"
  agencia: string;
  contaCaptacao: string; // Conta Bloqueada
  contaMovimento: string; // Conta Livre Movimento
  saldoBloqueado?: number;
  saldoMovimento?: number;
  rendimentoAplicacao?: number;
  /** True only when an OFX/CSV (or equivalent bank statement) was imported. */
  extratoBancarioImportado?: boolean;
  /** Prevents planilha-derived movements from being labelled as a bank statement. */
  fonteMovimentacao?: "EXTRATO_OFX" | "PLANILHA_CONTROLE" | string;
}

export interface ValidatedFinancialSummary {
  totalExecutado: number;
  totalConciliado: number;
  totalAConciliar: number;
  debitCount: number;
  reconciledDebitCount: number;
  pendingDebitCount: number;
  fonte: string;
}

export interface PronacProject {
  id: string;
  pronac: string; // Ex: "234891"
  nome: string; // Ex: "Festival Sons & Raízes do Brasil 2024"
  proponente: string; // Ex: "Associação Cultural Arte Viva"
  cnpjCpf: string; // Ex: "12.345.678/0001-90"
  segmento: ProjectSegment | string;
  artigoEnquadramento: "Artigo 18 (100% Renúncia)" | "Artigo 26 (Tributação Parcial)" | string;
  dataInicioVigencia: string; // "2024-01-10"
  dataFimVigencia: string; // "2024-12-31"
  prazoLimitePrestacao: string; // "2025-03-01"
  valorAprovado: number; // Ex: 450000.00
  valorCaptado: number; // Ex: 380000.00
  valorExecutado: number; // Ex: 310500.00
  bancoInfo: BankAccountInfo;
  status: ProjectStatus | string;
  resumoProjeto: string;
  resumoFinanceiroValidado?: ValidatedFinancialSummary;
  /** True only after the audit workflow has completed for the current evidence set. */
  auditoriaConcluida?: boolean;
  [key: string]: any;
}

export type BudgetStageName =
  | "Pré-Produção / Preparação"
  | "Produção / Execução"
  | "Divulgação / Comercialização"
  | "Custos Administrativos"
  | "Impostos e Recolhimentos";

export interface BudgetRubric {
  id: string;
  etapa: BudgetStageName | string;
  meta?: string; // Ex: "Meta 1 - Montagem do Espetáculo"
  metaNumero?: number;
  itemNumero?: string; // Ex: "1.1", "2.3"
  nome?: string; // Ex: "Diretor Artístico", "Locação de Sistema de Som & P.A."
  nomeRubrica?: string;
  unidade?: "Serviço" | "Mês" | "Diária" | "Cachê" | "Verba" | "Unidade" | "Hora" | string;
  unidadeMedida?: string;
  quantidade?: number;
  quantidadeAprovada?: number;
  valorUnitario?: number;
  valorUnitarioAprovado?: number;
  valorAprovado?: number;
  valorTotalAprovado?: number;
  valorExecutado: number;
  limiteRemanejamento20?: number; // Valor Aprovado * 1.20 (teto sem pedido de readequação)
  limiteRemanejamento20pct?: number;
  statusExecucao?: string;
  descricaoDetalhada?: string;
  [key: string]: any;
}

export type TransactionType = "DEBITO" | "CREDITO" | "APLICACAO" | "RESGATE" | "TARIFA";

export type ReconciliationStatus =
  | "CONCILIADO" // 100% casou com Doc Fiscal e Comprovante
  | "PARCIAL" // Falta anexo ou nota fiscal
  | "PENDENTE" // Lançamento no extrato sem nenhum documento
  | "ALERTA_GLOSA"; // Possível inconformidade com IN MinC

export interface BankTransaction {
  id: string;
  data?: string; // "2024-05-15"
  dataTransacao?: string;
  tipo: TransactionType | string;
  valor: number;
  descricaoExtrato?: string; // "PIX TRANSF FORNECEDOR 32.190.231"
  descricaoOriginalExtrato?: string;
  documentoBancario?: string; // "051501" ou "TED 8812"
  documentoNumero?: string;
  origemConta?: "Conta Movimento" | "Conta Aplicação" | string;
  contaTipo?: string;
  status?: ReconciliationStatus | string;
  statusConciliacao?: string;
  saldoAposTransacao?: number;
  favorecido?: string;
  cnpjCpfFavorecido?: string;
  matchedDocId?: string;
  matchedRubricId?: string;
  idRubricaVinculada?: string;
  idDocumentoFiscalVinculado?: string;
  observacoes?: string;
  alertaRisco?: string;
  [key: string]: any;
}

export type FiscalDocType =
  | "NF-e (Produto)"
  | "NF-e (Mercantil)"
  | "NFS-e (Serviço)"
  | "Bilhete de Passagem Aérea (BP-e / E-Ticket)"
  | "Recibo de Diária / Verba de Alimentação"
  | "Fatura de Agência de Viagens"
  | "RPA (Autônomo)"
  | "Cupom Fiscal"
  | "Recibo de Cachê"
  | "Guia de Recolhimento (DARF/GPS/DAM)";

export interface FiscalDocument {
  id: string;
  tipo: FiscalDocType;
  numeroDoc: string; // "000.124.981"
  serie?: string;
  dataEmissao: string; // "2024-05-14"
  fornecedorNome: string; // "Mega Som & Iluminação Profissional Ltda"
  fornecedorCnpjCpf: string; // "23.456.789/0001-12"
  descricaoServico: string;
  valorBruto: number;
  retencaoIss?: number;
  retencaoIrrf?: number;
  retencaoInss?: number;
  retencoes?: {
    iss?: number;
    irrf?: number;
    inss?: number;
    outras?: number;
  };
  valorLiquido?: number;
  rubricaId?: string;
  idRubrica?: string;
  idTransacao?: string;
  rubricaNome?: string;
  etapa?: BudgetStageName | string;
  statusComprovacao?: "Completo" | "Falta Comprovante Pagto" | "Falta Recibo" | "Ressalva MinC" | string;
  arquivoNotaNome?: string;
  arquivoComprovanteNome?: string;
  confiabilidadeIa?: number;
  divergenciasDetectadas?: string[];
  justificativaSalic?: string;
  validacaoSefaz?: "PENDENTE" | "VALIDO" | "INVALIDO" | "INDISPONIVEL";
  splits?: Array<{rubricId: string, value: number, justification: string}>;
  [key: string]: any;
}

export interface AuditAlert {
  id: string;
  gravidade: "ALTA" | "MEDIA" | "BAIXA" | "INFO";
  categoria:
    | "Vigência"
    | "Remanejamento"
    | "Remanejamento Orçamentário"
    | "Forma de Pagamento"
    | "Tributário"
    | "Documentação"
    | "Teto de Custo"
    | "Rendimento de Aplicação"
    | string;
  titulo: string;
  descricao: string;
  itemAfetado: string;
  baseLegal: string;
  acaoRecomendada: string;
  justificativaSugeridaSalic: string;
  resolvido?: boolean;
}

export interface ComplianceReport {
  scoreSaudePrestacao: number; // 0 - 100
  statusGeral:
    | "APROVAÇÃO COM LOUVOR"
    | "APROVAÇÃO REGULAR"
    | "APROVAÇÃO COM RESSALVAS"
    | "ALTO RISCO DE REJEIÇÃO / GLOSA";
  sumarioExecutivo: string;
  riscoEstimadoGlosa: number;
  alertas: AuditAlert[];
  recomendacoesPreEnvio: string[];
}

export interface OfxParsedTransaction {
  fitid: string; // ID único originado no extrato do BB (FITID)
  tipoMovimento: "DEBIT" | "CREDIT" | "OTHER";
  tipoClassificado: TransactionType;
  dataMovimento: string; // YYYY-MM-DD
  valor: number; // Negativo para débitos, positivo para créditos
  valorAbsoluto: number;
  descricaoOriginal: string;
  checknum?: string;
  memo?: string;
  nomeFavorecido?: string;
  hashLote: string; // Hash SHA-256 do arquivo OFX
  categoriaSugerida?:
    | "FORNECEDOR_PIX"
    | "FORNECEDOR_TED"
    | "TARIFA_BANCARIA"
    | "GUIA_DARF"
    | "GUIA_ISS"
    | "GUIA_GPS"
    | "APLICACAO_CP"
    | "RESGATE_CP"
    | "APORTE_PATROCINIO"
    | "OUTROS";
}

export interface OfxParseResult {
  bankId: string; // "001" Banco do Brasil
  acctId: string; // Conta Corrente BB
  acctType: string;
  hashLote: string;
  dataGeracao?: string;
  totalTransacoes: number;
  totalDebitos: number;
  totalCreditos: number;
  totalTarifas: number;
  totalAplicacaoResgate: number;
  transacoes: OfxParsedTransaction[];
}

export interface TripartiteMatchCandidate {
  transacaoBbId: string;
  fitid: string;
  documentoFiscalId?: string;
  rubricaSalicId?: string;
  statusConciliacao:
    | "CONCILIADO_TOTAL"
    | "CONCILIADO_RETENCAO"
    | "GUIA_TRIBUTARIA"
    | "ALERTA_REMANEJAMENTO_EXCEDIDO"
    | "AJUSTE_MANUAL";
  scoreConfianca: number; // 0.00 a 1.00
  origemConciliacao: "AUTO_MOTOR" | "SUGESTAO_IA" | "MANUAL_OPERADOR";
  motivo:
    | "VALOR_BRUTO_EXATO"
    | "VALOR_LIQUIDO_COM_RETENCAO"
    | "GUIA_TRIBUTARIA"
    | "PASSAGEM_AEREA_BPE"
    | "DIARIA_ALIMENTACAO_ART28"
    | "SEM_DOCUMENTO_COMPATIVEL"
    | "TARIFA_BB_ESTORNO";
  detalhesRetencao?: {
    valorBruto: number;
    valorLiquido: number;
    retencoes: {
      irrf: number;
      iss: number;
      inss: number;
    };
    guiasComplementares: string[];
  };
  alertaOrcamento?: {
    rubricaNome: string;
    itemNumero: string;
    valorAprovado: number;
    valorExecutadoApos: number;
    limiteRemanejamento20: number;
    excedeu20: boolean;
  };
  justificativaSalicSugerida?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ReconciliationMatchResult {
  transactionId: string;
  documentId: string;
  rubricId: string;
  confidenceScore: number;
  reasoning: string;
  alertas?: string[];
}

export type TripartiteStatus =
  | "CONCILIADO_PERFEITO"
  | "CONCILIADO LÍQUIDO/BRUTO"
  | "CONCILIADO COM RETENÇÃO"
  | "DIVERGÊNCIA DE VALOR"
  | "PENDENTE DE VÍNCULO";

export type StatusSalic =
  | "Pendente"
  | "Em Lançamento"
  | "Lançado no SALIC"
  | "Comprovado 100%";

export interface TripartiteGedAttachment {
  tipo:
    | "NOTA_FISCAL"
    | "COMPROVANTE_BANCARIO"
    | "RELATORIO_FOTOS"
    | "GUIA_DARF"
    | "GUIA_ISS"
    | "TERMO_DIARIAS"
    | "BPE_PASSAGEM"
    | "FOTO"
    | "CLIPPING"
    | "LISTA_PRESENCA"
    | "TERMO_ENTREGA";
  nomeArquivo: string;
  tamanhoFormatado: string;
  status: "VALIDADO" | "PENDENTE" | "RESSALVA";
  urlOuPrevia?: string;
  documentId?: string;
  fileId?: string;
  detectedType?: string;
}

export interface TripartiteEntry {
  id?: string;
  idLancamento?: string; // Ex: "LANC-0001"
  periodo?: string; // "2024-05", "2024-08", etc.
  idRubrica?: string;
  descricaoRubrica?: string;
  nomeRubrica?: string;
  idDocFiscal?: string;
  tipoDoc?: FiscalDocType;
  numeroDoc?: string;
  dataEmissao?: string;
  fornecedor?: string;
  cnpjCpf?: string;
  idTransacaoBB?: string;
  dataCompensacao?: string;
  valorBrutoDoc?: number;
  valorLiquidoPagar?: number;
  retencoes?: {
    irrf: number;
    iss: number;
    inss: number;
    outras: number;
  };
  valorDebitoBB?: number;
  statusTripartite?: TripartiteStatus;
  statusSalic?: StatusSalic;
  checkTripe?: {
    fiscalDocAnexo: boolean;
    comprovanteBancarioAnexo: boolean;
    relatorioExecucaoAnexo: boolean;
    rubricaValida: boolean;
  };
  gedArquivos?: TripartiteGedAttachment[];
  observacoes?: string;
  [key: string]: any;
}

export interface PeriodValidationSummary {
  periodo: string; // "2024-05" ou "Maio/2024"
  totalLancamentos: number;
  conciliadosComSucesso: number;
  pendentesDocumento: number;
  pendentesComprovanteBancario: number;
  percentualCompleto: number; // 0 - 100
  valorTotalDebitos: number;
  valorComprovado: number;
  saldoNaoComprovado: number;
  statusGeral: "100% COMPLETO" | "PARCIAL COM PENDÊNCIAS" | "CRÍTICO";
}

// ==========================================
// TIGERBEETLE / DOUBLE-ENTRY LEDGER TYPES
// ==========================================
export type LedgerAccountType =
  | "CONTA_VINCULADA_BB"
  | "CONTA_APLICACAO_POUPANCA_BB"
  | "RECURSOS_CAPTADOS_FSA"
  | "RENDIMENTOS_APLICACAO"
  | "FORNECEDORES_DESPESAS"
  | "RECEITA_FEDERAL_RETENCOES"
  | "GLOSAS_BLOQUEADAS";

export interface LedgerTransfer {
  id: string; // UUID v4
  idempotencyKey: string; // SHA-256 hash
  timestamp: string; // ISO 8601
  sourceAccount: LedgerAccountType;
  destinationAccount: LedgerAccountType;
  amount: number;
  description: string;
  txId?: string;
  docId?: string;
  fitid?: string;
  status: "POSTED" | "PENDING" | "REJECTED";
}

export interface LedgerAccountBalance {
  account: LedgerAccountType;
  name: string;
  debits: number;
  credits: number;
  balance: number;
  isDebitNormal: boolean;
}

export interface DoubleEntryBalanceReport {
  isBalanced: boolean;
  totalDebits: number;
  totalCredits: number;
  difference: number;
  accounts: LedgerAccountBalance[];
  transferCount: number;
  idempotencyCollisionsPrevented: number;
  generatedAt: string;
}

// ==========================================
// SPLINK / PROBABILISTIC RECORD LINKAGE TYPES
// ==========================================
export interface ProbabilisticMatchPair {
  id: string;
  transactionId: string;
  fitid: string;
  txDescription: string;
  txDate: string;
  txAmount: number;
  txFavorecido: string;

  candidateDocId: string;
  docNumber: string;
  docType: string;
  docDate: string;
  docGrossAmount: number;
  docNetAmount: number;
  docFornecedor: string;
  docCnpjCpf: string;

  rubricId?: string;
  rubricName?: string;

  // Matching feature scores (0.0 to 1.0)
  scoreAmount: number;
  scoreDate: number;
  scoreEntityName: number;
  scoreDocumentNumber: number;
  scoreTaxConsistency: number;

  overallMatchProbability: number; // 0.0 to 1.0 (e.g. 0.96 = 96%)
  matchClassification: "MATCH_CONFIRMED" | "PROBABLE_MATCH" | "AMBIGUOUS_MULTI_MATCH" | "UNMATCHED";
  matchExplanation: string[];
}

export interface RecordLinkageReport {
  totalPairsEvaluated: number;
  confirmedMatches: number;
  probableMatches: number;
  unmatchedRecords: number;
  averageConfidence: number;
  matches: ProbabilisticMatchPair[];
  executionTimeMs: number;
}

// ==========================================
// PANDERA / GREAT EXPECTATIONS DATA QUALITY SUITE
// ==========================================
export type ExpectationSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface DataQualityExpectation {
  id: string;
  name: string;
  description: string;
  category: "FINANCIAL_BALANCE" | "TAX_WITHHOLDING" | "SALIC_COMPLIANCE" | "IDEMPOTENCY" | "DEDUPLICATION";
  severity: ExpectationSeverity;
  passed: boolean;
  actualValue: string | number;
  expectedValue: string | number;
  anomalyCount: number;
  anomaliesDetected?: Array<{
    targetId: string;
    description: string;
    details?: any;
  }>;
}

export interface PanderaValidationReport {
  suiteName: string;
  overallPassed: boolean;
  totalExpectations: number;
  passedCount: number;
  failedCount: number;
  healthScorePct: number;
  expectations: DataQualityExpectation[];
  timestamp: string;
}

// ==========================================
// POSTGRESQL-AUDIT / IMMUTABLE ACTIVITY LOG
// ==========================================
export type AuditActionType =
  | "SYSTEM_INIT"
  | "TRANSACTION_INGESTED"
  | "DOCUMENT_INGESTED"
  | "MATCH_TRIPARTITE"
  | "UNLINK_MANUAL"
  | "TAX_RETENTION_CALCULATED"
  | "GLOSA_ALERT_TRIGGERED"
  | "BUDGET_REALLOCATION_CHECK"
  | "AI_SELF_CORRECTION"
  | "SALIC_EXPORT_GENERATED"
  | "IDEMPOTENCY_COLLISION_BLOCKED";

export interface AuditActivityLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorRole: "AI_AGENT_ENGINE" | "HUMAN_AUDITOR" | "SYSTEM_INGESTION" | "MINC_AUDITOR" | "ADMIN" | "PRODUTOR" | "AUDITOR";
  action: AuditActionType;
  entityType: "TRANSACTION" | "DOCUMENT" | "RUBRIC" | "LEDGER_TRANSFER" | "COMPLIANCE_RULE";
  entityId: string;
  description: string;
  previousState?: any;
  newState?: any;
  tamperProofHash: string; // SHA-256
}

// ==========================================
// ESTEIRA DE REVISÃO FINANCEIRA (6 ETAPAS)
// ==========================================
export type ReceiptStatus =
  | "PENDENTE_EMISSAO"
  | "ENVIADO_ASSINATURA"
  | "ASSINADO_ANEXADO"
  | "NAO_APLICAVEL";

export interface ReceiptItem {
  id: string;
  transacaoId: string;
  numeroRecibo: string;
  dataEmissao: string;
  favorecidoNome: string;
  favorecidoCpfCnpj: string;
  funcaoOuServico: string;
  valorBruto: number;
  retencaoInss: number;
  retencaoIrrf: number;
  retencaoIss: number;
  valorLiquido: number;
  valorPorExtenso: string;
  rubricaId?: string;
  rubricaNome?: string;
  etapaProjeto?: string;
  status: ReceiptStatus;
  responsavelAssinatura: string; // Ex: "Júlia Bárbara" ou "Direção de Produção"
  dataEnvioAssinatura?: string;
  dataRetornoAssinado?: string;
  arquivoAssinadoUrl?: string;
  observacoes?: string;
}

export type FinancialReviewStep = 1 | 2 | 3 | 4 | 5 | 6;

export interface FinancialReviewStepInfo {
  step: FinancialReviewStep;
  titulo: string;
  objetivo: string;
  resultadoEsperado: string;
  status: "CONCLUIDO" | "EM_PROGRESSO" | "PENDENTE";
  metricas?: {
    totalItens: number;
    conferidos: number;
    pendentes: number;
  };
}



import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import * as xlsx from "xlsx";

export type MovementType = "CREDITO" | "DEBITO";

export interface CanonicalMovement {
  type: MovementType;
  date: string;
  amount: number;
  party: string;
  control: string;
  balance: number | null;
  rubricName: string;
  rubricCode: string;
  sourceSheet: string;
  sourceRow: number;
  sourceRef: string;
}

export interface SourceInventory {
  projectId: string;
  sourceDirectory: string;
  workbookPath: string;
  workbookSha256: string;
  workbookSheet: string;
  title: string;
  pronac: string | null;
  fileCount: number;
  pdfCount: number;
  movements: CanonicalMovement[];
  incompleteRows: IncompleteSourceRow[];
}

export interface IncompleteSourceRow {
  sourceSheet: string;
  sourceRow: number;
  intendedType: MovementType;
  missingFields: Array<"date" | "amount" | "party">;
}

export interface WorkspaceData {
  projects: Array<Record<string, unknown>>;
  transactions: Record<string, Array<Record<string, unknown>>>;
  [key: string]: unknown;
}

export interface Finding {
  ruleId: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  status: "ACTIONABLE" | "QUARANTINE" | "INFORMATIONAL";
  message: string;
  evidence: Record<string, unknown>;
}

export interface AddTransactionOperation {
  operationId: string;
  action: "ADD_TRANSACTION";
  projectId: string;
  confidence: 1;
  ruleId: "SOURCE_MOVEMENT_MISSING";
  before: null;
  after: Record<string, unknown>;
  sourceRef: string;
}

export interface UpdateTransactionOperation {
  operationId: string;
  action: "UPDATE_TRANSACTION_FIELDS";
  projectId: string;
  entityId: string;
  confidence: 1;
  ruleId: "SOURCE_FIELDS_DIVERGE";
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  sourceRef: string;
}

export type CorrectionOperation = AddTransactionOperation | UpdateTransactionOperation;

export interface ProjectEvaluation {
  projectId: string;
  source: {
    directory: string;
    workbook: string;
    workbookSha256: string;
    sheet: string;
    title: string;
    pronac: string | null;
    fileCount: number;
    pdfCount: number;
    incompleteRows: number;
  };
  sourceMetrics: MovementMetrics;
  systemMetrics: MovementMetrics | null;
  findings: Finding[];
  deterministicCorrections: CorrectionOperation[];
  quarantine: Finding[];
}

export interface MovementMetrics {
  total: number;
  credits: number;
  debits: number;
  creditTotal: number;
  debitTotal: number;
}

const normalizeText = (value: unknown): string => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-zA-Z0-9]+/g, " ")
  .trim()
  .toUpperCase();

const roundMoney = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

export function parseAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.abs(roundMoney(value));
  const input = String(value ?? "").trim();
  if (!input || !/\d/.test(input)) return null;
  let clean = input.replace(/[^\d,.-]/g, "");
  const comma = clean.lastIndexOf(",");
  const dot = clean.lastIndexOf(".");
  if (comma >= 0 && dot >= 0) {
    const decimal = comma > dot ? "," : ".";
    const thousands = decimal === "," ? /\./g : /,/g;
    clean = clean.replace(thousands, "").replace(decimal, ".");
  } else if (comma >= 0) {
    clean = /,\d{2}$/.test(clean) ? clean.replace(/\./g, "").replace(",", ".") : clean.replace(/,/g, "");
  } else if (dot >= 0 && !/\.\d{2}$/.test(clean)) {
    clean = clean.replace(/\./g, "");
  }
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? Math.abs(roundMoney(parsed)) : null;
}

export function parseDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const parts = xlsx.SSF.parse_date_code(value);
    if (!parts) return null;
    return `${parts.y.toString().padStart(4, "0")}-${parts.m.toString().padStart(2, "0")}-${parts.d.toString().padStart(2, "0")}`;
  }
  const input = String(value ?? "").trim();
  let match = input.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  match = input.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (!match) return null;
  let first = Number(match[1]);
  let second = Number(match[2]);
  const year = Number(match[3]) < 100 ? 2000 + Number(match[3]) : Number(match[3]);
  // A planilha brasileira usa DD/MM; quando o segundo componente não pode ser
  // mês, o arquivo veio no formato americano MM/DD (caso real do Seu Ruivaldo).
  const day = second > 12 ? second : first;
  const month = second > 12 ? first : second;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

const isIgnoredPath = (filePath: string): boolean => {
  const normalized = filePath.replace(/\\/g, "/");
  const base = path.basename(filePath);
  return normalized.includes("/__MACOSX/") || base.startsWith("._") || base === ".DS_Store";
};

async function walk(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  }));
  return nested.flat();
}

function headerIndex(headers: string[], aliases: string[]): number {
  return headers.findIndex((header) => aliases.some((alias) => header === alias || header.includes(alias)));
}

function parseSheet(sheetName: string, sheet: xlsx.WorkSheet, sourceRef: string): { movements: CanonicalMovement[]; incompleteRows: IncompleteSourceRow[] } {
  const rows = xlsx.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null });
  let headerRow = -1;
  let columns: { control: number; creditParty: number; creditValue: number; debitParty: number; date: number; debitValue: number; balance: number; rubricName: number; rubricCode: number } | null = null;

  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 20); rowIndex += 1) {
    const headers = rows[rowIndex].map(normalizeText);
    const control = headerIndex(headers, ["CONTROLE"]);
    const date = headerIndex(headers, ["DATA", "DATA PAGAMENTO"]);
    const creditParty = headerIndex(headers, ["ENTRADA", "CREDITO"]);
    const debitParty = headerIndex(headers, ["PAGAMENTO", "SAIDA", "FORNECEDOR PESSOA FISICA", "FORNECEDOR", "PRESTADOR"]);
    const balance = headerIndex(headers, ["SALDO"]);
    if (control < 0 || date < 0 || debitParty < 0 || balance < 0) continue;

    const valueColumns = headers.map((header, index) => header.includes("VALOR") ? index : -1).filter((index) => index >= 0);
    const creditValue = valueColumns.find((index) => index > creditParty && index < debitParty) ?? -1;
    const debitValue = valueColumns.find((index) => index > date) ?? valueColumns.find((index) => index > debitParty) ?? -1;
    if (debitValue < 0) continue;

    const rubricColumns = headers.map((header, index) => header.includes("RUBRICA") || header.includes("ITEM") ? index : -1).filter((index) => index >= 0);
    headerRow = rowIndex;
    columns = {
      control,
      creditParty,
      creditValue,
      debitParty,
      date,
      debitValue,
      balance,
      rubricName: rubricColumns[0] ?? -1,
      rubricCode: rubricColumns[1] ?? -1,
    };
    break;
  }

  if (!columns) return { movements: [], incompleteRows: [] };
  const output: CanonicalMovement[] = [];
  const incompleteRows: IncompleteSourceRow[] = [];
  for (let rowIndex = headerRow + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const date = parseDate(row[columns.date]);
    const creditParty = columns.creditParty >= 0 ? String(row[columns.creditParty] ?? "").trim() : "";
    const debitParty = String(row[columns.debitParty] ?? "").trim();
    const creditAmount = columns.creditValue >= 0 ? parseAmount(row[columns.creditValue]) : null;
    const debitAmount = parseAmount(row[columns.debitValue]);
    const normalizedRow = normalizeText([creditParty, debitParty, row[columns.control], row[columns.rubricName]].join(" "));
    if (/\b(TOTAL|SUBTOTAL|SOMA|PAGAMENTOS REALIZADOS)\b/.test(normalizedRow)) continue;

    const control = String(row[columns.control] ?? "").trim();
    let type: MovementType | null = null;
    let amount: number | null = null;
    let party = "";
    if (control && debitAmount && debitAmount > 0) {
      type = "DEBITO";
      amount = debitAmount;
      party = debitParty;
    } else if (creditParty && creditAmount && creditAmount > 0) {
      type = "CREDITO";
      amount = creditAmount;
      party = creditParty;
    } else if (debitParty && debitAmount && debitAmount > 0) {
      type = "DEBITO";
      amount = debitAmount;
      party = debitParty;
    } else if (control || debitParty) {
      type = "DEBITO";
    } else if (creditParty) {
      type = "CREDITO";
    }
    if (!type) continue;
    const missingFields: IncompleteSourceRow["missingFields"] = [];
    if (!date) missingFields.push("date");
    if (amount === null || amount <= 0) missingFields.push("amount");
    if (!party) missingFields.push("party");
    if (missingFields.length) {
      incompleteRows.push({ sourceSheet: sheetName, sourceRow: rowIndex + 1, intendedType: type, missingFields });
      continue;
    }
    output.push({
      type,
      date: date!,
      amount: amount!,
      party,
      control,
      balance: parseAmount(row[columns.balance]),
      rubricName: columns.rubricName >= 0 ? String(row[columns.rubricName] ?? "").trim() : "",
      rubricCode: columns.rubricCode >= 0 ? String(row[columns.rubricCode] ?? "").trim() : "",
      sourceSheet: sheetName,
      sourceRow: rowIndex + 1,
      sourceRef,
    });
  }
  return { movements: output, incompleteRows };
}

function workbookTitle(workbook: xlsx.WorkBook): string {
  for (const sheetName of workbook.SheetNames) {
    const rows = xlsx.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, raw: false, defval: null });
    for (const row of rows.slice(0, 8)) {
      const title = row.map((cell) => String(cell ?? "").trim()).find(Boolean);
      if (title) return title;
    }
  }
  return "Projeto sem título identificado";
}

function extractPronac(title: string): string | null {
  const match = title.match(/PRONAC[^0-9]*(\d{2}[.\-]?\d{3,5})/i);
  return match?.[1] ?? null;
}

async function loadWorkbookCandidate(filePath: string): Promise<{ workbook: xlsx.WorkBook; movements: CanonicalMovement[]; incompleteRows: IncompleteSourceRow[]; sheet: string } | null> {
  const buffer = await fs.readFile(filePath);
  try {
    const workbook = xlsx.read(buffer, { type: "buffer", cellDates: true });
    const candidates = workbook.SheetNames.map((sheetName) => ({
      sheetName,
      ...parseSheet(sheetName, workbook.Sheets[sheetName], filePath),
    })).filter((candidate) => candidate.movements.length > 0 || candidate.incompleteRows.length > 0)
      .sort((a, b) => (b.movements.length + b.incompleteRows.length) - (a.movements.length + a.incompleteRows.length));
    if (!candidates.length) return null;
    return { workbook, movements: candidates[0].movements, incompleteRows: candidates[0].incompleteRows, sheet: candidates[0].sheetName };
  } catch {
    return null;
  }
}

export async function inventorySource(projectId: string, sourceDirectory: string): Promise<SourceInventory> {
  const absoluteDirectory = path.resolve(sourceDirectory);
  const allFiles = (await walk(absoluteDirectory)).filter((filePath) => !isIgnoredPath(filePath));
  const candidates = allFiles.filter((filePath) => /\.(xlsx|xls|csv|zip)$/i.test(filePath)).sort((a, b) => {
    const score = (value: string) => /concil/i.test(value) ? 0 : /planilha/i.test(value) ? 1 : /\.xlsx$/i.test(value) ? 2 : /\.csv$/i.test(value) ? 3 : 4;
    return score(a) - score(b) || a.localeCompare(b);
  });

  for (const workbookPath of candidates) {
    const parsed = await loadWorkbookCandidate(workbookPath);
    if (!parsed) continue;
    const content = await fs.readFile(workbookPath);
    const title = workbookTitle(parsed.workbook);
    return {
      projectId,
      sourceDirectory: absoluteDirectory,
      workbookPath,
      workbookSha256: crypto.createHash("sha256").update(content).digest("hex"),
      workbookSheet: parsed.sheet,
      title,
      pronac: extractPronac(title),
      fileCount: allFiles.length,
      pdfCount: allFiles.filter((filePath) => /\.pdf$/i.test(filePath)).length,
      movements: parsed.movements,
      incompleteRows: parsed.incompleteRows,
    };
  }
  throw new Error(`Nenhuma planilha de conciliação válida encontrada em ${absoluteDirectory}`);
}

export function movementMetrics(movements: Array<{ type: MovementType; amount: number }>): MovementMetrics {
  const credits = movements.filter((movement) => movement.type === "CREDITO");
  const debits = movements.filter((movement) => movement.type === "DEBITO");
  return {
    total: movements.length,
    credits: credits.length,
    debits: debits.length,
    creditTotal: roundMoney(credits.reduce((sum, movement) => sum + movement.amount, 0)),
    debitTotal: roundMoney(debits.reduce((sum, movement) => sum + movement.amount, 0)),
  };
}

function systemMovement(transaction: Record<string, unknown>): CanonicalMovement | null {
  const rawType = normalizeText(transaction.tipo);
  if (rawType !== "CREDITO" && rawType !== "DEBITO") return null;
  const date = parseDate(transaction.dataTransacao ?? transaction.data);
  const amount = parseAmount(transaction.valor);
  if (!date || amount === null) return null;
  return {
    type: rawType,
    date,
    amount,
    party: String(transaction.favorecido ?? transaction.descricaoOriginalExtrato ?? transaction.descricaoExtrato ?? ""),
    control: String(transaction.controleNumero ?? transaction.documentoNumero ?? ""),
    balance: parseAmount(transaction.saldoAposTransacao),
    rubricName: String(transaction.rubricaNome ?? ""),
    rubricCode: String(transaction.idRubricaVinculada ?? transaction.matchedRubricId ?? ""),
    sourceSheet: "system",
    sourceRow: 0,
    sourceRef: String(transaction.id ?? "system"),
  };
}

const movementKey = (movement: Pick<CanonicalMovement, "type" | "date" | "amount">): string => `${movement.type}|${movement.date}|${movement.amount.toFixed(2)}`;
const sequenceKey = (movement: Pick<CanonicalMovement, "type" | "amount" | "party">): string => `${movement.type}|${movement.amount.toFixed(2)}|${normalizeText(movement.party)}`;

function sourceTransaction(projectId: string, movement: CanonicalMovement): Record<string, unknown> {
  const identity = crypto.createHash("sha256").update(`${projectId}|${movementKey(movement)}|${movement.control}|${movement.sourceRow}`).digest("hex").slice(0, 16);
  return {
    id: `tx-evaluator-${identity}`,
    contaTipo: movement.type === "CREDITO" ? "Conta Captação" : "Conta Movimento",
    dataTransacao: movement.date,
    tipo: movement.type,
    documentoNumero: movement.control,
    controleNumero: movement.control,
    descricaoOriginalExtrato: movement.type === "CREDITO" ? `CRÉDITO / ENTRADA - ${movement.party}` : `PAGAMENTO - ${movement.party}`,
    valor: movement.amount,
    saldoAposTransacao: movement.balance ?? 0,
    favorecido: movement.party,
    cnpjCpfFavorecido: "",
    statusConciliacao: "PENDENTE",
    rubricaNome: movement.rubricName,
    fonteLancamento: "PLANILHA_CONTROLE_AVALIADA",
    avaliacao: {
      sourceRef: movement.sourceRef,
      sourceSheet: movement.sourceSheet,
      sourceRow: movement.sourceRow,
    },
  };
}

export function evaluateProject(source: SourceInventory, workspace: WorkspaceData): ProjectEvaluation {
  const findings: Finding[] = [];
  const corrections: CorrectionOperation[] = [];
  const project = workspace.projects.find((item) => String(item.id ?? "") === source.projectId);
  const sourceMetrics = movementMetrics(source.movements);
  const rawSystemTransactions = workspace.transactions[source.projectId] ?? [];
  const systemEntries = rawSystemTransactions.map((raw) => ({ raw, movement: systemMovement(raw) }))
    .filter((entry): entry is { raw: Record<string, unknown>; movement: CanonicalMovement } => entry.movement !== null);
  const systemTransactions = systemEntries.map((entry) => entry.movement);
  const systemMetrics = project ? movementMetrics(systemTransactions) : null;

  if (source.incompleteRows.length) {
    findings.push({
      ruleId: "SOURCE_INCOMPLETE_ROWS",
      severity: "MEDIUM",
      status: "QUARANTINE",
      message: "A planilha-fonte contém linhas de movimento sem campos obrigatórios; elas não foram corrigidas nem descartadas silenciosamente.",
      evidence: {
        records: source.incompleteRows.length,
        rows: source.incompleteRows.map((item) => ({ sheet: item.sourceSheet, row: item.sourceRow, type: item.intendedType, missingFields: item.missingFields })),
      },
    });
  }

  if (!project) {
    findings.push({
      ruleId: "PROJECT_NOT_FOUND",
      severity: "HIGH",
      status: "QUARANTINE",
      message: "O projeto existe nos arquivos-fonte, mas não existe no conjunto de dados avaliado.",
      evidence: { inferredTitle: source.title, inferredPronac: source.pronac, sourceMovements: source.movements.length },
    });
  } else {
    for (const type of ["CREDITO", "DEBITO"] as const) {
      const sourceCount = source.movements.filter((movement) => movement.type === type).length;
      const systemCount = systemTransactions.filter((movement) => movement.type === type).length;
      const sourceTotal = type === "CREDITO" ? sourceMetrics.creditTotal : sourceMetrics.debitTotal;
      const systemTotal = type === "CREDITO" ? systemMetrics!.creditTotal : systemMetrics!.debitTotal;
      if (sourceCount !== systemCount) findings.push({
        ruleId: `${type}_COUNT_MISMATCH`, severity: "HIGH", status: "ACTIONABLE",
        message: `Contagem de ${type.toLowerCase()}s diverge entre a fonte e o sistema.`,
        evidence: { sourceCount, systemCount },
      });
      if (sourceTotal !== systemTotal) findings.push({
        ruleId: `${type}_TOTAL_MISMATCH`, severity: "HIGH", status: "ACTIONABLE",
        message: `Total de ${type.toLowerCase()}s diverge entre a fonte e o sistema.`,
        evidence: { sourceTotal, systemTotal, difference: roundMoney(sourceTotal - systemTotal) },
      });
    }

    const systemByKey = new Map<string, Array<{ raw: Record<string, unknown>; movement: CanonicalMovement }>>();
    for (const entry of systemEntries) {
      const key = movementKey(entry.movement);
      systemByKey.set(key, [...(systemByKey.get(key) ?? []), entry]);
    }
    const missingByType: Record<MovementType, CanonicalMovement[]> = { CREDITO: [], DEBITO: [] };
    for (const movement of source.movements) {
      const key = movementKey(movement);
      const matches = systemByKey.get(key) ?? [];
      if (matches.length) {
        matches.pop();
        systemByKey.set(key, matches);
        continue;
      }
      missingByType[movement.type].push(movement);
    }

    for (const type of ["CREDITO", "DEBITO"] as const) {
      const missing = missingByType[type];
      const extra = [...systemByKey.values()].flat().filter((entry) => entry.movement.type === type);
      const amountSequenceAligned = missing.length > 0 && missing.length === extra.length
        && missing.every((movement, index) => movement.type === extra[index].movement.type && movement.amount === extra[index].movement.amount);
      const partyMatchRatio = missing.length
        ? missing.filter((movement, index) => sequenceKey(movement) === sequenceKey(extra[index]?.movement ?? movement)).length / missing.length
        : 0;
      // Importações legadas preservaram a ordem e os valores da planilha, mas
      // normalizaram alguns nomes de favorecidos. O alinhamento só é aceito se
      // TODA a sequência monetária coincidir e pelo menos 80% dos nomes também.
      const sequenceAligned = amountSequenceAligned && partyMatchRatio >= 0.8;
      const alignedPairs: Array<{ movement: CanonicalMovement; entry: { raw: Record<string, unknown>; movement: CanonicalMovement } }> = [];
      if (sequenceAligned) missing.forEach((movement, index) => alignedPairs.push({ movement, entry: extra[index] }));
      if (!sequenceAligned) {
        const missingGroups = new Map<string, CanonicalMovement[]>();
        const extraGroups = new Map<string, Array<{ raw: Record<string, unknown>; movement: CanonicalMovement }>>();
        for (const movement of missing) missingGroups.set(sequenceKey(movement), [...(missingGroups.get(sequenceKey(movement)) ?? []), movement]);
        for (const entry of extra) extraGroups.set(sequenceKey(entry.movement), [...(extraGroups.get(sequenceKey(entry.movement)) ?? []), entry]);
        for (const [key, sourceGroup] of missingGroups) {
          const systemGroup = extraGroups.get(key) ?? [];
          if (sourceGroup.length !== systemGroup.length) continue;
          sourceGroup.forEach((movement, index) => alignedPairs.push({ movement, entry: systemGroup[index] }));
        }
      }

      const alignedMovements = new Set(alignedPairs.map((pair) => pair.movement));
      alignedPairs.forEach(({ movement, entry }) => {
          const before: Record<string, unknown> = {};
          const after: Record<string, unknown> = {};
          const setField = (field: string, expected: unknown) => {
            if (entry.raw[field] !== expected) {
              before[field] = entry.raw[field] ?? null;
              after[field] = expected;
            }
          };
          setField("data", movement.date);
          if ("dataTransacao" in entry.raw) setField("dataTransacao", movement.date);
          setField("documentoBancario", movement.control);
          if ("documentoNumero" in entry.raw) setField("documentoNumero", movement.control);
          if (Object.keys(after).length) corrections.push({
            operationId: crypto.createHash("sha256").update(`UPDATE|${source.projectId}|${entry.raw.id}|${movement.sourceRow}`).digest("hex"),
            action: "UPDATE_TRANSACTION_FIELDS",
            projectId: source.projectId,
            entityId: String(entry.raw.id),
            confidence: 1,
            ruleId: "SOURCE_FIELDS_DIVERGE",
            before,
            after,
            sourceRef: `${movement.sourceRef}#${movement.sourceSheet}!${movement.sourceRow}`,
          });
          const values = systemByKey.get(movementKey(entry.movement)) ?? [];
          const position = values.indexOf(entry);
          if (position >= 0) values.splice(position, 1);
      });
      for (const movement of missing) {
        if (!alignedMovements.has(movement)) {
          const key = movementKey(movement);
          const after = sourceTransaction(source.projectId, movement);
          corrections.push({
            operationId: crypto.createHash("sha256").update(`ADD|${source.projectId}|${key}|${movement.sourceRow}`).digest("hex"),
            action: "ADD_TRANSACTION",
            projectId: source.projectId,
            confidence: 1,
            ruleId: "SOURCE_MOVEMENT_MISSING",
            before: null,
            after,
            sourceRef: `${movement.sourceRef}#${movement.sourceSheet}!${movement.sourceRow}`,
          });
        }
      }
    }
    const extras = [...systemByKey.entries()].filter(([, values]) => values.length > 0);
    if (extras.length) findings.push({
      ruleId: "SYSTEM_MOVEMENT_NOT_IN_SOURCE",
      severity: "MEDIUM",
      status: "QUARANTINE",
      message: "Há lançamentos no sistema sem correspondência por tipo, data e valor na planilha-fonte; nenhuma exclusão automática foi proposta.",
      evidence: { groups: extras.length, records: extras.reduce((sum, [, values]) => sum + values.length, 0) },
    });
    const additions = corrections.filter((item) => item.action === "ADD_TRANSACTION");
    const updates = corrections.filter((item) => item.action === "UPDATE_TRANSACTION_FIELDS");
    if (additions.length) findings.push({
      ruleId: "SOURCE_MOVEMENT_MISSING",
      severity: "HIGH",
      status: "ACTIONABLE",
      message: "Há movimentos da fonte ausentes no sistema; inclusões determinísticas foram preparadas para staging.",
      evidence: { records: additions.length },
    });
    if (updates.length) findings.push({
      ruleId: "SOURCE_FIELDS_DIVERGE",
      severity: "HIGH",
      status: "ACTIONABLE",
      message: "Os movimentos existem, mas campos determinísticos divergem da planilha-fonte; atualizações foram preparadas para staging.",
      evidence: { records: updates.length, fields: ["data", "documentoBancario"] },
    });
  }

  if (!findings.length) findings.push({
    ruleId: "SOURCE_SYSTEM_BALANCED",
    severity: "LOW",
    status: "INFORMATIONAL",
    message: "Contagens, totais e movimentos por tipo/data/valor conferem com a fonte.",
    evidence: { sourceMetrics, systemMetrics },
  });

  return {
    projectId: source.projectId,
    source: {
      directory: source.sourceDirectory,
      workbook: source.workbookPath,
      workbookSha256: source.workbookSha256,
      sheet: source.workbookSheet,
      title: source.title,
      pronac: source.pronac,
      fileCount: source.fileCount,
      pdfCount: source.pdfCount,
      incompleteRows: source.incompleteRows.length,
    },
    sourceMetrics,
    systemMetrics,
    findings,
    deterministicCorrections: corrections,
    quarantine: findings.filter((finding) => finding.status === "QUARANTINE"),
  };
}

export function applyCorrectionsToStaging(workspace: WorkspaceData, evaluations: ProjectEvaluation[]): WorkspaceData {
  const staged = structuredClone(workspace);
  for (const evaluation of evaluations) {
    const existing = staged.transactions[evaluation.projectId];
    if (!existing) continue;
    const existingIds = new Set(existing.map((item) => String(item.id ?? "")));
    for (const correction of evaluation.deterministicCorrections) {
      if (correction.action === "UPDATE_TRANSACTION_FIELDS") {
        const target = existing.find((item) => String(item.id ?? "") === correction.entityId);
        if (target) Object.assign(target, correction.after);
        continue;
      }
      const id = String(correction.after.id ?? "");
      if (!existingIds.has(id)) {
        existing.push(correction.after);
        existingIds.add(id);
      }
    }
  }
  return staged;
}

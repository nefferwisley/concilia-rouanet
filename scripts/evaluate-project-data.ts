import fs from "node:fs/promises";
import path from "node:path";
import { initialProjects, initialTransactions } from "../src/data/mockData";
import {
  applyCorrectionsToStaging,
  evaluateProject,
  inventorySource,
  type WorkspaceData,
} from "./lib/project-data-evaluator";

interface Arguments {
  sources: Array<{ projectId: string; directory: string }>;
  snapshotPath?: string;
  outputDirectory: string;
  writeStaging: boolean;
}

function usage(): never {
  console.error([
    "Uso:",
    "  npm run evaluate:data -- --source <projectId=pasta> [--source ...] [--snapshot export.json] [--output pasta] [--write-staging]",
    "",
    "Sem --snapshot, a comparação usa os dados iniciais atualmente embarcados no aplicativo.",
    "--write-staging nunca altera a fonte nem o snapshot de entrada; cria snapshot.staged.json.",
  ].join("\n"));
  process.exit(2);
}

function parseArgs(argv: string[]): Arguments {
  const result: Arguments = {
    sources: [],
    outputDirectory: path.resolve("artifacts", "data-evaluator"),
    writeStaging: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--source") {
      const value = argv[++index] ?? "";
      const separator = value.indexOf("=");
      if (separator <= 0) usage();
      result.sources.push({ projectId: value.slice(0, separator), directory: value.slice(separator + 1) });
    } else if (arg === "--snapshot") {
      result.snapshotPath = path.resolve(argv[++index] ?? "");
    } else if (arg === "--output") {
      result.outputDirectory = path.resolve(argv[++index] ?? "");
    } else if (arg === "--write-staging") {
      result.writeStaging = true;
    } else {
      usage();
    }
  }
  if (!result.sources.length) usage();
  return result;
}

async function loadWorkspace(snapshotPath?: string): Promise<{ workspace: WorkspaceData; source: string }> {
  if (!snapshotPath) {
    return {
      workspace: {
        projects: structuredClone(initialProjects) as unknown as Array<Record<string, unknown>>,
        transactions: structuredClone(initialTransactions) as unknown as Record<string, Array<Record<string, unknown>>>,
      },
      source: "src/data/mockData.ts",
    };
  }
  const parsed = JSON.parse(await fs.readFile(snapshotPath, "utf8"));
  const workspace = (parsed?.snapshot ?? parsed) as WorkspaceData;
  if (!Array.isArray(workspace?.projects) || !workspace?.transactions || typeof workspace.transactions !== "object") {
    throw new Error("O snapshot precisa conter projects[] e transactions{} (diretamente ou dentro de snapshot).");
  }
  return { workspace, source: snapshotPath };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { workspace, source } = await loadWorkspace(args.snapshotPath);
  const inventories = [];
  for (const item of args.sources) inventories.push(await inventorySource(item.projectId, item.directory));
  const evaluations = inventories.map((inventory) => evaluateProject(inventory, workspace));
  const timestamp = new Date().toISOString();
  const report = {
    schemaVersion: 1,
    generatedAt: timestamp,
    evaluator: "local-deterministic-v1",
    comparisonSource: source,
    privacy: "local-only",
    zeroDataLoss: true,
    projects: evaluations,
  };
  const correctionPlan = {
    schemaVersion: 1,
    generatedAt: timestamp,
    mode: "STAGING_ONLY",
    operations: evaluations.flatMap((evaluation) => evaluation.deterministicCorrections),
  };
  const quarantine = {
    schemaVersion: 1,
    generatedAt: timestamp,
    requiresHumanReview: evaluations.flatMap((evaluation) => evaluation.quarantine.map((finding) => ({ projectId: evaluation.projectId, ...finding }))),
  };

  await fs.mkdir(args.outputDirectory, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(args.outputDirectory, "evaluation-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    fs.writeFile(path.join(args.outputDirectory, "correction-plan.json"), `${JSON.stringify(correctionPlan, null, 2)}\n`, "utf8"),
    fs.writeFile(path.join(args.outputDirectory, "quarantine.json"), `${JSON.stringify(quarantine, null, 2)}\n`, "utf8"),
  ]);
  if (args.writeStaging) {
    const staged = applyCorrectionsToStaging(workspace, evaluations);
    await fs.writeFile(path.join(args.outputDirectory, "snapshot.staged.json"), `${JSON.stringify(staged, null, 2)}\n`, "utf8");
  }

  console.log(JSON.stringify({
    outputDirectory: args.outputDirectory,
    projects: evaluations.map((evaluation) => ({
      projectId: evaluation.projectId,
      sourceMetrics: evaluation.sourceMetrics,
      systemMetrics: evaluation.systemMetrics,
      findings: evaluation.findings.length,
      corrections: evaluation.deterministicCorrections.length,
      quarantine: evaluation.quarantine.length,
    })),
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

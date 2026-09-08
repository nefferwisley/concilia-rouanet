import fs from "node:fs/promises";
import path from "node:path";

const [xlsxPath, outputPath, projectId = "proj-1961"] = process.argv.slice(2);

if (!xlsxPath || !outputPath) {
  console.error("Uso: node scripts/build-project-snapshot-restore.mjs <planilha.xlsx> <saida.sql> [projectId]");
  process.exit(1);
}

const spreadsheet = await fs.readFile(xlsxPath);
const response = await fetch("http://127.0.0.1:3000/api/gemini/extract-project-files", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    files: [{
      name: path.basename(xlsxPath),
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      base64: spreadsheet.toString("base64"),
    }],
  }),
});

if (!response.ok) {
  throw new Error(`Falha na extração determinística: HTTP ${response.status} ${await response.text()}`);
}

const body = await response.json();
const transactions = body?.data?.transactions;
const rubrics = body?.data?.rubrics;

if (!Array.isArray(transactions) || !transactions.length || !Array.isArray(rubrics) || !rubrics.length) {
  throw new Error("A planilha não produziu lançamentos e rubricas; restauração cancelada.");
}

const quoteJson = (value) => {
  const json = JSON.stringify(value);
  let tag = "$snapshot$";
  while (json.includes(tag)) tag = `$snapshot_${tag.length}$`;
  return `${tag}${json}${tag}`;
};

const quoteText = (value) => {
  const text = String(value);
  let tag = "$text$";
  while (text.includes(tag)) tag = `$text_${tag.length}$`;
  return `${tag}${text}${tag}`;
};

const sql = `begin;

update public.project_snapshots
set payload = jsonb_set(
  jsonb_set(
    coalesce(payload, '{}'::jsonb),
    array['transactions', ${quoteText(projectId)}],
    ${quoteJson(transactions)}::jsonb,
    true
  ),
  array['rubrics', ${quoteText(projectId)}],
  ${quoteJson(rubrics)}::jsonb,
  true
)
where project_id = ${quoteText(projectId)};

do $$
declare
  restored_transactions integer;
  restored_rubrics integer;
begin
  select
    jsonb_array_length(payload #> array['transactions', ${quoteText(projectId)}]),
    jsonb_array_length(payload #> array['rubrics', ${quoteText(projectId)}])
  into restored_transactions, restored_rubrics
  from public.project_snapshots
  where project_id = ${quoteText(projectId)};

  if restored_transactions <> ${transactions.length} or restored_rubrics <> ${rubrics.length} then
    raise exception 'Contagens restauradas divergentes: lançamentos %, rubricas %', restored_transactions, restored_rubrics;
  end if;
end $$;

commit;
`;

await fs.writeFile(outputPath, sql, "utf8");

const buildAppendStatement = (collection, items) => `update public.project_snapshots
set payload = jsonb_set(
  payload,
  array[${quoteText(collection)}, ${quoteText(projectId)}],
  coalesce(payload #> array[${quoteText(collection)}, ${quoteText(projectId)}], '[]'::jsonb) || ${quoteJson(items)}::jsonb,
  true
)
where project_id = ${quoteText(projectId)};`;

const chunkSize = 20;
const chunks = [
  `update public.project_snapshots
set payload = jsonb_set(
  jsonb_set(payload, array['transactions', ${quoteText(projectId)}], '[]'::jsonb, true),
  array['rubrics', ${quoteText(projectId)}], '[]'::jsonb, true
)
where project_id = ${quoteText(projectId)};`,
];

for (let index = 0; index < transactions.length; index += chunkSize) {
  chunks.push(buildAppendStatement("transactions", transactions.slice(index, index + chunkSize)));
}
for (let index = 0; index < rubrics.length; index += chunkSize) {
  chunks.push(buildAppendStatement("rubrics", rubrics.slice(index, index + chunkSize)));
}
chunks.push(`select jsonb_build_object(
  'transactions', jsonb_array_length(payload #> array['transactions', ${quoteText(projectId)}]),
  'rubrics', jsonb_array_length(payload #> array['rubrics', ${quoteText(projectId)}]),
  'documents', jsonb_array_length(payload #> array['documents', ${quoteText(projectId)}])
) as restored_state
from public.project_snapshots
where project_id = ${quoteText(projectId)};`);

const chunksPath = outputPath.replace(/\.sql$/i, ".chunks.json");
await fs.writeFile(chunksPath, JSON.stringify(chunks), "utf8");

const debits = transactions.filter((item) => item.tipo === "DEBITO");
console.log(JSON.stringify({
  projectId,
  transactions: transactions.length,
  debits: debits.length,
  credits: transactions.length - debits.length,
  rubrics: rubrics.length,
  debitTotal: debits.reduce((sum, item) => sum + Number(item.valor || 0), 0),
  outputPath,
  chunksPath,
  chunks: chunks.length,
}));

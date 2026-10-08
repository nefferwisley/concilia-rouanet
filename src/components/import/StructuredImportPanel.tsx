import React, { useEffect, useRef, useState } from "react";
import { apiClient } from "../../services/apiClient";
import { canConfirmInput, type StructuredFormat, type StructuredInput, type ValidatedInput } from "../../contracts/importValidation";

const normalizePronac = (value: string) => value.trim().replace(/\./g, "");

export function StructuredImportPanel({ projectId, pronac }: { projectId: string; pronac: string }) {
  const [format, setFormat] = useState<StructuredFormat>("xlsx");
  const [file, setFile] = useState<File>();
  const [config, setConfig] = useState<File>();
  const [preview, setPreview] = useState<ValidatedInput | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const context = useRef({ projectId, pronac });
  context.current = { projectId, pronac };
  const requestGeneration = useRef(0);

  useEffect(() => {
    requestGeneration.current++;
    setPreview(null); setMessage(""); setError(""); setBusy(false);
  }, [projectId, pronac, format, file, config]);

  const current = file ? { projectId: preview?.input.projectId || projectId, format, file, config } : null;
  const approved = current && preview && canConfirmInput(preview, current);

  async function execute(confirm: boolean) {
    if (!file || (format === "json" && !config)) return;
    const selected = { projectId, pronac };
    const generation = ++requestGeneration.current;
    const stillCurrent = () => generation === requestGeneration.current &&
      context.current.projectId === selected.projectId && context.current.pronac === selected.pronac;
    setBusy(true); setError(""); setMessage("");
    try {
      if (!await apiClient.getValidToken()) throw new Error("Entre na sua conta para validar/importar. O modo demonstração não grava arquivos online.");
      // PRONAC é conferido mesmo quando o ID local ainda não é o UUID online.
      // Nunca criar um projeto silenciosamente nem escolher o primeiro candidato.
      const list = await apiClient.listProjects();
      const candidates = list.projetos.filter(p => normalizePronac(p.pronac) === normalizePronac(pronac));
      if (candidates.length !== 1) throw new Error("Selecione um projeto online com PRONAC único. Nenhum projeto será criado automaticamente.");
      if (!stillCurrent()) return;
      const input: StructuredInput = { projectId: candidates[0].id, format, file, config };
      if (!confirm) {
        const report = await apiClient.validateStructuredInput(input);
        if (stillCurrent()) setPreview({ input, report });
      } else {
        if (!canConfirmInput(preview, input)) throw new Error("Os arquivos ou o projeto mudaram. Valide novamente.");
        const result = await apiClient.importStructuredInput(input);
        if (!stillCurrent()) return;
        setPreview(null);
        setMessage(format === "xlsx"
          ? `Planilha revisada salva: ${String(result.importadas)} linha(s). A planilha existente foi substituída.`
          : `Importação enfileirada (não concluída): ${String(result.importacao_id)}. Acompanhe o processamento antes de usar os resultados.`);
      }
    } catch (cause) {
      if (stillCurrent()) { setError(cause instanceof Error ? cause.message : "Falha no processamento."); setPreview(null); }
    } finally {
      if (stillCurrent()) setBusy(false);
    }
  }

  const report = preview?.report;
  return <details className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
    <summary className="cursor-pointer font-semibold text-emerald-300">Pré-validar planilha XLSX ou JSON + YAML</summary>
    <div className="mt-3 space-y-3 text-sm text-slate-200">
      <p>Destino: PRONAC {pronac}. A validação não grava dados nem chama IA. Este fluxo não valida PDFs ou pastas.</p>
      <label className="block">Formato
        <select aria-label="Formato estruturado" value={format} disabled={busy} onChange={e => { setFormat(e.target.value as StructuredFormat); setFile(undefined); setConfig(undefined); setPreview(null); }} className="ml-2 rounded bg-slate-800 p-2">
          <option value="xlsx">Planilha revisada XLSX</option><option value="json">Lançamentos JSON + configuração YAML</option>
        </select>
      </label>
      <label className="block">Arquivo {format === "xlsx" ? "XLSX" : "JSON"}
        <input key={format} aria-label="Arquivo estruturado" type="file" accept={format === "xlsx" ? ".xlsx" : ".json"} disabled={busy} onChange={e => { setFile(e.target.files?.[0]); setPreview(null); }} className="mt-1 block w-full" />
      </label>
      {format === "json" && <label className="block">Configuração YAML
        <input aria-label="Configuração YAML" type="file" accept=".yaml,.yml" disabled={busy} onChange={e => { setConfig(e.target.files?.[0]); setPreview(null); }} className="mt-1 block w-full" />
      </label>}
      {report && <div className="space-y-2 rounded border border-slate-700 p-3" role="status">
        <p>{report.linhas_validas} linha(s) válida(s); {report.linhas_invalidas || 0} inválida(s); {report.linhas_alerta || 0} com alerta.</p>
        {report.aba && <p>Aba: {report.aba}</p>}
        <p>Campos reconhecidos: {(report.colunas_reconhecidas?.map(c => `${c.cabecalho} → ${c.conceito}`) || report.mapeamento?.map(c => `${c.chave} → ${c.conceito}`) || []).join("; ")}</p>
        <p>Campos não importados: {(report.colunas_nao_importadas?.map(c => c.cabecalho) || report.campos_nao_mapeados || []).join(", ") || "Nenhum"}</p>
        {report.linhas_ignoradas?.map(row => <p key={row.linha}>Linha {row.linha}: {row.motivo}</p>)}
        {report.erros?.map(row => <p key={row.linha} className="text-rose-300">Linha {row.linha}: {row.motivos.join("; ")}</p>)}
        {report.alertas?.map(row => <p key={row.linha} className="text-amber-300">Alerta na linha {row.linha}: {row.motivos.join("; ")}</p>)}
        {format === "xlsx" && <p className="text-amber-300">Confirmar substitui a planilha revisada atual do projeto. Não altera automaticamente o painel financeiro.</p>}
      </div>}
      {error && <p role="alert" className="text-rose-300">{error}</p>}
      {message && <p role="status" className="text-emerald-300">{message}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={busy || !file || (format === "json" && !config)} onClick={() => void execute(false)} className="rounded bg-slate-700 px-3 py-2 disabled:opacity-50">{busy ? "Processando…" : "Validar sem gravar"}</button>
        <button type="button" disabled={busy || !approved} onClick={() => void execute(true)} className="rounded bg-emerald-500 px-3 py-2 font-bold text-slate-950 disabled:opacity-50">Confirmar importação</button>
        <button type="button" disabled={busy} onClick={() => { requestGeneration.current++; setPreview(null); setMessage(""); setError(""); }} className="px-3 py-2">Cancelar prévia</button>
      </div>
    </div>
  </details>;
}

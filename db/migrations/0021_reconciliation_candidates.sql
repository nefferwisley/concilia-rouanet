-- ============================================================
-- 0021_reconciliation_candidates.sql
-- Candidatos a conciliação, regras avaliadas, pontuação, decisão e evidência
-- ============================================================

create table if not exists reconciliation_candidates (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos(id) on delete cascade,
  lancamento_id uuid not null,
  file_id uuid references import_files(id) on delete cascade,
  document_id uuid references documentos_projeto(id) on delete set null,
  extraction_result_id uuid references extraction_results(id) on delete set null,
  rule_applied text not null, -- 'EXACT_BANK_DOC_ID', 'VALUE_DATE_CNPJ', 'NORMALIZED_RUBRIC', 'PROBABILISTIC_SPLINK'
  rule_version text not null default '2.0.0',
  score numeric(5,4) not null default 0.0000,
  decision text not null default 'PENDING', -- 'PENDING', 'AUTO_MATCHED', 'MANUAL_APPROVED', 'REJECTED', 'AMBIGUOUS'
  decision_reason text,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  candidate_details jsonb,
  is_deleted boolean not null default false,
  source_system text not null default 'pipeline_v2',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ativar RLS
alter table reconciliation_candidates enable row level security;

drop policy if exists p_reconciliation_candidates on reconciliation_candidates;
create policy p_reconciliation_candidates on reconciliation_candidates for all
  using (pode_acessar_projeto(projeto_id))
  with check (pode_acessar_projeto(projeto_id));

-- Índices de consulta rápida e auditoria
create index if not exists idx_reconcil_cand_proj_lanc on reconciliation_candidates(projeto_id, lancamento_id);
create index if not exists idx_reconcil_cand_file on reconciliation_candidates(file_id);
create index if not exists idx_reconcil_cand_decision on reconciliation_candidates(decision);
create index if not exists idx_reconcil_cand_created on reconciliation_candidates(created_at desc);

-- Trigger updated_at
do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at') then
    drop trigger if exists trg_reconciliation_candidates_updated_at on reconciliation_candidates;
    create trigger trg_reconciliation_candidates_updated_at before update on reconciliation_candidates
      for each row execute function set_updated_at();
  end if;
end $$;

-- ============================================================
-- 0020_extraction_results.sql
-- Resultado normalizado por arquivo, confiança, erro e versão do extrator
-- ============================================================

create table if not exists extraction_results (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references import_files(id) on delete cascade,
  projeto_id uuid not null references projetos(id) on delete cascade,
  extractor_name text not null,
  extractor_version text not null default '2.0.0',
  document_type text,
  numero_documento text,
  data_emissao date,
  valor_bruto numeric(15,2),
  valor_liquido numeric(15,2),
  valor_retencoes numeric(15,2) default 0.00,
  iss numeric(15,2) default 0.00,
  irrf numeric(15,2) default 0.00,
  inss numeric(15,2) default 0.00,
  cnpj_cpf_emissor text,
  nome_emissor text,
  cnpj_cpf_destinatario text,
  nome_destinatario text,
  codigo_autenticacao text,
  recibo_numero text,
  confidence numeric(5,4) not null default 0.0000,
  raw_payload jsonb,
  error_code text,
  error_message text,
  is_deleted boolean not null default false,
  source_system text not null default 'pipeline_v2',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (file_id, extractor_name, extractor_version)
);

-- Ativar RLS
alter table extraction_results enable row level security;

drop policy if exists p_extraction_results on extraction_results;
create policy p_extraction_results on extraction_results for all
  using (pode_acessar_projeto(projeto_id))
  with check (pode_acessar_projeto(projeto_id));

-- Índices de consulta
create index if not exists idx_extraction_results_proj on extraction_results(projeto_id);
create index if not exists idx_extraction_results_file on extraction_results(file_id);
create index if not exists idx_extraction_results_cnpj on extraction_results(cnpj_cpf_emissor);
create index if not exists idx_extraction_results_valor on extraction_results(valor_liquido);

-- Trigger updated_at
do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at') then
    drop trigger if exists trg_extraction_results_updated_at on extraction_results;
    create trigger trg_extraction_results_updated_at before update on extraction_results
      for each row execute function set_updated_at();
  end if;
end $$;

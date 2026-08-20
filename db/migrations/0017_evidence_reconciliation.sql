-- Evidence, regulatory package, and tripartite reconciliation schema.
-- Leaves transaction ownership to the runner; contains no BEGIN/COMMIT.

create table public.regulatory_packages (
  id uuid primary key default gen_random_uuid(),
  pacote text not null check (pacote in ('ROUANET', 'FSA_ANCINE')),
  versao text not null,
  nome text not null,
  descricao text,
  regras_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (pacote, versao)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  file_id uuid not null references public.import_files(id) on delete cascade,
  document_type text not null check (document_type in ('INVOICE', 'PAYMENT_PROOF', 'CONTRACT', 'TAX_RECEIPT', 'BANK_STATEMENT', 'COMPLEMENTARY', 'UNKNOWN')),
  classification_method text not null default 'DETERMINISTIC',
  confidence numeric(5,4) not null default 1.0000,
  status text not null default 'IDENTIFIED' check (status in ('IDENTIFIED', 'EXTRACTING', 'EXTRACTED', 'ERROR')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (projeto_id, file_id)
);

create index if not exists documents_projeto_idx on public.documents(projeto_id);

create table public.document_extraction_runs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  model_version text not null,
  prompt_version text,
  status text not null default 'SUCCESS' check (status in ('SUCCESS', 'FAILED')),
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists document_extraction_runs_doc_idx on public.document_extraction_runs(document_id);

create table public.document_fields (
  id uuid primary key default gen_random_uuid(),
  extraction_run_id uuid not null references public.document_extraction_runs(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  field_name text not null,
  field_value text,
  source_locator jsonb not null default '{}'::jsonb,
  confidence numeric(5,4) not null default 1.0000,
  created_at timestamptz not null default now()
);

create index if not exists document_fields_doc_idx on public.document_fields(document_id);

create table public.reconciliations (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  declared_entry_id uuid references public.declared_entries(id) on delete set null,
  valor_declarado numeric(15,2),
  valor_conciliado numeric(15,2),
  status text not null default 'PENDING' check (status in ('PENDING', 'HUMAN_CONFIRMATION_REQUIRED', 'APPROVED', 'REJECTED', 'DIVERGENT')),
  confidence numeric(5,4) default 0.0000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reconciliations_projeto_idx on public.reconciliations(projeto_id);

create table public.evidence_links (
  id uuid primary key default gen_random_uuid(),
  reconciliation_id uuid not null references public.reconciliations(id) on delete cascade,
  evidence_type text not null check (evidence_type in ('DECLARED_ROW', 'BANK_MOVEMENT', 'FISCAL_DOCUMENT', 'PAYMENT_PROOF', 'CONTRACT')),
  evidence_id uuid not null,
  match_type text not null default 'DETERMINISTIC' check (match_type in ('DETERMINISTIC', 'PROBABILISTIC', 'MANUAL')),
  score numeric(5,4) not null default 1.0000,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create unique index evidence_link_unique_active_idx
  on public.evidence_links (reconciliation_id, evidence_type, evidence_id)
  where revoked_at is null;

create table public.issues (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projetos(id) on delete cascade,
  reconciliation_id uuid references public.reconciliations(id) on delete cascade,
  issue_code text not null,
  severity text not null check (severity in ('BLOCKER', 'WARNING', 'INFO')),
  status text not null default 'OPEN' check (status in ('OPEN', 'RESOLVED', 'JUSTIFIED')),
  description text not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index issues_open_project_idx
  on public.issues (project_id, created_at, id)
  where status = 'OPEN';

alter table public.regulatory_packages enable row level security;
alter table public.documents enable row level security;
alter table public.document_extraction_runs enable row level security;
alter table public.document_fields enable row level security;
alter table public.reconciliations enable row level security;
alter table public.evidence_links enable row level security;
alter table public.issues enable row level security;

create policy p_regulatory_packages_select on public.regulatory_packages
  for select to authenticated
  using (true);

create policy p_documents_select on public.documents
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and public.pode_acessar_projeto(projeto_id)
  );

create policy p_document_extraction_runs_select on public.document_extraction_runs
  for select to authenticated
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id
        and (select auth.uid()) is not null
        and public.pode_acessar_projeto(d.projeto_id)
    )
  );

create policy p_document_fields_select on public.document_fields
  for select to authenticated
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id
        and (select auth.uid()) is not null
        and public.pode_acessar_projeto(d.projeto_id)
    )
  );

create policy p_reconciliations_select on public.reconciliations
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and public.pode_acessar_projeto(projeto_id)
  );

create policy p_evidence_links_select on public.evidence_links
  for select to authenticated
  using (
    exists (
      select 1 from public.reconciliations r
      where r.id = reconciliation_id
        and (select auth.uid()) is not null
        and public.pode_acessar_projeto(r.projeto_id)
    )
  );

create policy p_issues_select on public.issues
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and public.pode_acessar_projeto(project_id)
  );

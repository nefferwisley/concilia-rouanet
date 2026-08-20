-- Real import pipeline: files, declared sheets, declared entries, private job queue and progress events.
-- Leaves transaction ownership to the runner; contains no BEGIN/COMMIT.

create table public.import_files (
  id uuid primary key default gen_random_uuid(),
  importacao_id uuid not null references public.importacoes(id) on delete cascade,
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  relative_path text not null,
  original_name text not null,
  storage_key text not null unique,
  browser_mime text,
  detected_type text,
  size_bytes bigint not null check (size_bytes >= 0),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  status text not null default 'RECEIVING' check (status in ('RECEIVING', 'UPLOADED', 'PROCESSING', 'PARSED', 'FAILED')),
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (projeto_id, sha256)
);

create index if not exists import_files_importacao_idx on public.import_files(importacao_id);
create index if not exists import_files_projeto_idx on public.import_files(projeto_id);

create table public.source_sheets (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.import_files(id) on delete cascade,
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  sheet_name text not null,
  header_row integer not null check (header_row >= 1),
  column_map jsonb not null default '{}'::jsonb,
  confidence double precision not null default 0.0,
  status text not null default 'DETECTED' check (status in ('DETECTED', 'CONFIRMED', 'REJECTED')),
  created_at timestamptz not null default now(),
  unique (file_id, sheet_name)
);

create index if not exists source_sheets_projeto_idx on public.source_sheets(projeto_id);

create table public.declared_entries (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  source_sheet_id uuid not null references public.source_sheets(id) on delete cascade,
  row_number integer not null check (row_number >= 1),
  valor_declarado numeric(15,2),
  data_declarada text,
  fornecedor_declarado text,
  rubrica_declarada text,
  documento_declarado text,
  descricao_declarada text,
  cell_locators jsonb not null default '{}'::jsonb,
  raw_values jsonb not null default '{}'::jsonb,
  status text not null default 'DECLARED' check (status in ('DECLARED', 'MATCHED', 'DIVERGENT', 'IGNORED')),
  created_at timestamptz not null default now(),
  unique (source_sheet_id, row_number)
);

create index if not exists declared_entries_projeto_idx on public.declared_entries(projeto_id);

create schema if not exists private;

create table private.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.import_files(id) on delete cascade,
  job_type text not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRY')),
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  available_at timestamptz not null default now(),
  locked_by text,
  locked_at timestamptz,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists processing_jobs_claim_idx
  on private.processing_jobs (available_at, created_at)
  where status in ('PENDING', 'RETRY');

revoke all on schema private from public, anon, authenticated;
revoke all on table private.processing_jobs from public, anon, authenticated;

create table public.processing_events (
  id uuid primary key default gen_random_uuid(),
  importacao_id uuid not null references public.importacoes(id) on delete cascade,
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  file_id uuid references public.import_files(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists processing_events_importacao_idx on public.processing_events(importacao_id, created_at desc);
create index if not exists processing_events_projeto_idx on public.processing_events(projeto_id, created_at desc);

alter table public.import_files enable row level security;
alter table public.source_sheets enable row level security;
alter table public.declared_entries enable row level security;
alter table public.processing_events enable row level security;

create policy p_import_files_select on public.import_files
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and public.pode_acessar_projeto(projeto_id)
  );

create policy p_import_files_insert on public.import_files
  for insert to authenticated
  with check (
    (select auth.uid()) is not null
    and public.pode_acessar_projeto(projeto_id)
  );

create policy p_import_files_update on public.import_files
  for update to authenticated
  using (
    (select auth.uid()) is not null
    and public.pode_acessar_projeto(projeto_id)
  )
  with check (
    (select auth.uid()) is not null
    and public.pode_acessar_projeto(projeto_id)
  );

create policy p_import_files_delete on public.import_files
  for delete to authenticated
  using (
    (select auth.uid()) is not null
    and public.pode_acessar_projeto(projeto_id)
  );

create policy p_source_sheets_select on public.source_sheets
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and public.pode_acessar_projeto(projeto_id)
  );

create policy p_declared_entries_select on public.declared_entries
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and public.pode_acessar_projeto(projeto_id)
  );

create policy p_processing_events_select on public.processing_events
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and public.pode_acessar_projeto(projeto_id)
  );

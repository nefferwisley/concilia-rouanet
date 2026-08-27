create table if not exists import_files (
  id uuid primary key default gen_random_uuid(),
  importacao_id uuid not null references importacoes(id) on delete cascade,
  projeto_id uuid not null references projetos(id) on delete cascade,
  relative_path text not null,
  original_name text not null,
  storage_key text not null unique,
  browser_mime text,
  detected_type text,
  size_bytes bigint not null check (size_bytes >= 0),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  status text not null default 'RECEIVING',
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (projeto_id, sha256)
);

alter table import_files enable row level security;
create policy p_import_files on import_files for all
  using (pode_acessar_projeto(projeto_id))
  with check (pode_acessar_projeto(projeto_id));

create table if not exists processing_jobs (
  id uuid primary key default gen_random_uuid(),
  file_id uuid references import_files(id) on delete cascade,
  job_type text not null,
  status text not null default 'PENDING',
  attempts int not null default 0,
  max_attempts int not null default 3,
  available_at timestamptz not null default now(),
  locked_by text,
  locked_at timestamptz,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists processing_events (
  id uuid primary key default gen_random_uuid(),
  file_id uuid references import_files(id) on delete cascade,
  status text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

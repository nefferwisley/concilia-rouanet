create table if not exists evidence_links (
  id uuid primary key default gen_random_uuid(),
  lancamento_id uuid not null, -- references either extrato or spreadsheet, but this depends on schema.
  file_id uuid references import_files(id),
  document_id uuid references documentos_projeto(id),
  evidence_type text not null, -- 'FISCAL_DOCUMENT', etc.
  match_type text not null default 'AUTO', -- 'AUTO', 'MANUAL'
  revoked_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check ((file_id is not null) or (document_id is not null))
);


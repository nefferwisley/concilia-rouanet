create table if not exists review_decisions (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos(id) on delete cascade,
  lancamento_id uuid not null,
  file_id uuid references import_files(id),
  document_id uuid references documentos_projeto(id),
  action text not null, -- 'APPROVE', 'REJECT', 'REPLACE', 'MANUAL_LINK'
  reason text,
  actor_id uuid references auth.users(id),
  idempotency_key text unique,
  created_at timestamptz not null default now()
);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos(id) on delete cascade,
  entity_type text not null, -- 'EVIDENCE_LINK', 'TRANSACTION', 'DOCUMENT'
  entity_id uuid not null,
  action text not null,
  before_state jsonb,
  after_state jsonb,
  reason text,
  actor_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_review_decisions_proj on review_decisions(projeto_id, created_at);
create index if not exists idx_audit_events_proj on audit_events(projeto_id, created_at);

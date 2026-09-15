-- Compatibilidade entre o importador web (IDs de projeto textuais) e o
-- armazenamento privado de evidências. O snapshot não guarda bytes/base64.
-- Algumas instalações receberam primeiro a migration Supabase, que criou
-- project_snapshots sem as colunas usadas pelo backend FastAPI. Complete o
-- contrato aqui de forma idempotente antes de atender uma requisição.
alter table if exists project_snapshots
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists snapshot_hash text,
  add column if not exists source_system text not null default 'web_client',
  add column if not exists is_deleted boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists uq_project_snapshots_row_id on project_snapshots(id);
create unique index if not exists uq_project_snapshots_owner_project_active
  on project_snapshots(project_id, owner_id)
  where is_deleted = false;

grant select, insert, update, delete on table project_snapshots to authenticated, service_role;

create table if not exists document_assets (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  document_id text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  object_path text not null unique,
  file_name text not null,
  mime_type text not null,
  byte_size bigint not null check (byte_size > 0 and byte_size <= 26214400),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, document_id)
);

alter table document_assets enable row level security;

drop policy if exists p_document_assets_owner on document_assets;
create policy p_document_assets_owner on document_assets for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

grant select, insert, update, delete on table document_assets to authenticated, service_role;

drop trigger if exists trg_document_assets_updated_at on document_assets;
create trigger trg_document_assets_updated_at before update on document_assets
for each row execute function set_updated_at();

create index if not exists idx_document_assets_owner_project
  on document_assets(owner_id, project_id, created_at);

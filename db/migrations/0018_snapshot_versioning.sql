-- ============================================================
-- 0018_snapshot_versioning.sql
-- Versionamento, controle de concorrência otimista, hash e auditoria de snapshots
-- ============================================================

create table if not exists project_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  version integer not null default 1,
  snapshot_hash text,
  source_system text not null default 'web_client',
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Caso a tabela já existia (ex: vinda de migrações anteriores do Supabase),
-- garantimos que todas as novas colunas e constraints existam.
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'project_snapshots' and column_name = 'version') then
    alter table project_snapshots add column version integer not null default 1;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'project_snapshots' and column_name = 'snapshot_hash') then
    alter table project_snapshots add column snapshot_hash text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'project_snapshots' and column_name = 'source_system') then
    alter table project_snapshots add column source_system text not null default 'web_client';
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'project_snapshots' and column_name = 'is_deleted') then
    alter table project_snapshots add column is_deleted boolean not null default false;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'project_snapshots' and column_name = 'updated_at') then
    alter table project_snapshots add column updated_at timestamptz not null default now();
  end if;
end $$;

-- Índice e restrição de unicidade para chave lógica (project_id, owner_id)
create unique index if not exists uq_project_snapshots_owner_proj
  on project_snapshots(project_id, owner_id)
  where is_deleted = false;

-- Ativar RLS
alter table project_snapshots enable row level security;

drop policy if exists p_project_snapshots_owner on project_snapshots;
create policy p_project_snapshots_owner on project_snapshots for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Trigger para updated_at se a função set_updated_at existir
do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at') then
    drop trigger if exists trg_project_snapshots_updated_at on project_snapshots;
    create trigger trg_project_snapshots_updated_at before update on project_snapshots
      for each row execute function set_updated_at();
  end if;
end $$;

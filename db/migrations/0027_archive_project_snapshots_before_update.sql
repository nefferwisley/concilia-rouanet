-- Conserva uma cópia do snapshot anterior antes de qualquer atualização.
-- Isso permite recuperação auditável mesmo se a aplicação cliente falhar.
create table if not exists public.project_snapshot_history (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  version integer not null,
  archived_at timestamptz not null default now()
);

create index if not exists idx_project_snapshot_history_owner_project_archived
  on public.project_snapshot_history (owner_id, project_id, archived_at desc);

alter table public.project_snapshot_history enable row level security;

drop policy if exists p_project_snapshot_history_owner_read on public.project_snapshot_history;
create policy p_project_snapshot_history_owner_read
  on public.project_snapshot_history for select to authenticated
  using (owner_id = auth.uid());

create or replace function public.archive_project_snapshot_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.payload is distinct from new.payload then
    insert into public.project_snapshot_history (project_id, owner_id, payload, version)
    values (old.project_id, old.owner_id, old.payload, old.version);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_archive_project_snapshot_before_update on public.project_snapshots;
create trigger trg_archive_project_snapshot_before_update
before update on public.project_snapshots
for each row execute function public.archive_project_snapshot_before_update();

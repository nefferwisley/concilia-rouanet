-- Estado do projeto e referências de documentos. Os objetos ficam no bucket
-- privado documentos-1961; esta tabela nunca armazena PDF/base64.
create extension if not exists pgcrypto;

create table if not exists public.project_snapshots (
  project_id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_assets (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  document_id text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  object_path text not null unique,
  file_name text not null,
  mime_type text not null check (mime_type in ('application/pdf', 'image/png', 'image/jpeg')),
  byte_size bigint not null check (byte_size > 0 and byte_size <= 26214400),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, document_id)
);

alter table public.project_snapshots enable row level security;
alter table public.document_assets enable row level security;

drop policy if exists "owners manage their project snapshots" on public.project_snapshots;
create policy "owners manage their project snapshots"
  on public.project_snapshots for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "owners manage their document references" on public.document_assets;
create policy "owners manage their document references"
  on public.document_assets for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists project_snapshots_updated_at on public.project_snapshots;
create trigger project_snapshots_updated_at before update on public.project_snapshots
  for each row execute function public.set_updated_at();

drop trigger if exists document_assets_updated_at on public.document_assets;
create trigger document_assets_updated_at before update on public.document_assets
  for each row execute function public.set_updated_at();

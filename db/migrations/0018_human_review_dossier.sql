-- Migration 0018: Human review decisions, immutable append-only audit events, and frozen dossier snapshots.
-- Leaves transaction ownership to runner; contains no BEGIN/COMMIT.

alter table public.reconciliations add column if not exists version bigint not null default 1;

create table public.review_decisions (
  id uuid primary key default gen_random_uuid(),
  reconciliation_id uuid not null references public.reconciliations(id) on delete cascade,
  action text not null check (action in ('APPROVE', 'REJECT', 'REPLACE', 'CORRECT')),
  evidence_link_id uuid references public.evidence_links(id) on delete restrict,
  reason text not null default '',
  idempotency_key text not null,
  actor_id uuid not null,
  created_at timestamptz not null default now(),
  unique (reconciliation_id, idempotency_key)
);

create index if not exists review_decisions_rec_idx on public.review_decisions(reconciliation_id);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projetos(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  actor_id uuid not null,
  reason text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_project_created_idx
  on public.audit_events(project_id, created_at, id);

create table public.dossier_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projetos(id) on delete cascade,
  package_name text not null,
  package_version text not null,
  sha256_hash text not null,
  canonical_payload jsonb not null,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create index if not exists dossier_snapshots_project_idx
  on public.dossier_snapshots(project_id, created_at desc);

-- RLS Enforcement
alter table public.review_decisions enable row level security;
alter table public.audit_events enable row level security;
alter table public.dossier_snapshots enable row level security;

create policy p_review_decisions_select on public.review_decisions
  for select to authenticated
  using (
    exists (
      select 1 from public.reconciliations r
      where r.id = reconciliation_id
        and (select auth.uid()) is not null
        and public.pode_acessar_projeto(r.projeto_id)
    )
  );

create policy p_audit_events_select on public.audit_events
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and public.pode_acessar_projeto(project_id)
  );

create policy p_dossier_snapshots_select on public.dossier_snapshots
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and public.pode_acessar_projeto(project_id)
  );

-- Revoke update and delete to preserve append-only immutability
revoke update, delete on public.audit_events from authenticated, anon;
revoke update, delete on public.dossier_snapshots from authenticated, anon;

-- Foundation for real, tenant-isolated project imports.
-- Existing projects are classified in place; this migration never seeds projects.

begin;

alter table public.projetos
  add column if not exists pacote_regulatorio text default 'FSA_ANCINE',
  add column if not exists status_processamento text default 'EMPTY';

update public.projetos
set pacote_regulatorio = 'FSA_ANCINE'
where pacote_regulatorio is null;

update public.projetos
set status_processamento = 'EMPTY'
where status_processamento is null;

alter table public.projetos
  alter column pacote_regulatorio set default 'FSA_ANCINE',
  alter column pacote_regulatorio set not null,
  alter column status_processamento set default 'EMPTY',
  alter column status_processamento set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.projetos'::regclass
      and conname = 'projetos_pacote_regulatorio_check'
  ) then
    alter table public.projetos
      add constraint projetos_pacote_regulatorio_check
      check (pacote_regulatorio in ('ROUANET', 'FSA_ANCINE'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.projetos'::regclass
      and conname = 'projetos_status_processamento_check'
  ) then
    alter table public.projetos
      add constraint projetos_status_processamento_check
      check (status_processamento in ('EMPTY', 'IMPORTING', 'REVIEW', 'READY'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.projetos'::regclass
      and conname = 'projetos_proponente_nonblank_check'
  ) then
    alter table public.projetos
      add constraint projetos_proponente_nonblank_check
      check (proponente is not null and btrim(proponente) <> '') not valid;
  end if;
end;
$$;

create index if not exists membros_projeto_user_project_idx
  on public.membros_projeto (user_id, projeto_id);

drop function if exists public.criar_projeto_com_membro(text, text, text, text, text);

create or replace function public.pode_acessar_projeto(p_projeto_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.membros_projeto as mp
      where mp.projeto_id = p_projeto_id
        and mp.user_id = (select auth.uid())
    );
$$;

revoke all on function public.pode_acessar_projeto(uuid) from public, anon;
grant execute on function public.pode_acessar_projeto(uuid) to authenticated;

alter table public.membros_projeto enable row level security;
alter table public.projetos enable row level security;

drop policy if exists p_membros on public.membros_projeto;
create policy p_membros on public.membros_projeto for all
  using (
    (select auth.uid()) is not null
    and (
      user_id = (select auth.uid())
      or public.pode_acessar_projeto(projeto_id)
    )
  )
  with check (
    (select auth.uid()) is not null
    and public.pode_acessar_projeto(projeto_id)
  );

drop policy if exists p_projetos_select on public.projetos;
create policy p_projetos_select on public.projetos for select
  using (
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.membros_projeto as mp
      where mp.projeto_id = projetos.id
        and mp.user_id = (select auth.uid())
    )
  );

drop policy if exists p_projetos_update on public.projetos;
create policy p_projetos_update on public.projetos for update
  using (
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.membros_projeto as mp
      where mp.projeto_id = projetos.id
        and mp.user_id = (select auth.uid())
    )
  )
  with check (
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.membros_projeto as mp
      where mp.projeto_id = projetos.id
        and mp.user_id = (select auth.uid())
    )
  );

drop policy if exists p_projetos_delete on public.projetos;
create policy p_projetos_delete on public.projetos for delete
  using (
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.membros_projeto as mp
      where mp.projeto_id = projetos.id
        and mp.user_id = (select auth.uid())
    )
  );

create or replace function public.criar_projeto_com_membro(
  p_pronac text,
  p_nome text,
  p_proponente text,
  p_controller text,
  p_banco text,
  p_pacote_regulatorio text
) returns public.projetos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_projeto public.projetos;
  v_existing_id uuid;
  v_user_id uuid;
begin
  v_user_id := (select auth.uid());

  if v_user_id is null then
    raise exception 'authentication required'
      using errcode = 'insufficient_privilege';
  end if;

  if p_proponente is null or btrim(p_proponente) = '' then
    raise exception 'proponent is required'
      using errcode = 'check_violation';
  end if;

  if p_pacote_regulatorio is null
     or p_pacote_regulatorio not in ('ROUANET', 'FSA_ANCINE') then
    raise exception 'invalid regulatory package: %', p_pacote_regulatorio
      using errcode = 'check_violation';
  end if;

  select id
  into v_existing_id
  from public.projetos
  where pronac = p_pronac;

  if v_existing_id is not null then
    if not exists (
      select 1
      from public.membros_projeto
      where projeto_id = v_existing_id
        and user_id = v_user_id
    ) then
      raise exception 'pronac % já pertence a outro projeto', p_pronac
        using errcode = 'unique_violation';
    end if;

    select *
    into v_projeto
    from public.projetos
    where id = v_existing_id;

    return v_projeto;
  end if;

  insert into public.projetos (
    pronac,
    nome,
    proponente,
    controller,
    banco,
    pacote_regulatorio
  )
  values (
    p_pronac,
    p_nome,
    p_proponente,
    p_controller,
    p_banco,
    p_pacote_regulatorio
  )
  returning * into v_projeto;

  insert into public.membros_projeto (projeto_id, user_id, papel)
  values (v_projeto.id, v_user_id, 'admin')
  on conflict (projeto_id, user_id) do nothing;

  return v_projeto;
exception
  when unique_violation then
    raise exception 'pronac % já pertence a outro projeto', p_pronac
      using errcode = 'unique_violation';
end;
$$;

revoke all on function public.criar_projeto_com_membro(text, text, text, text, text, text)
  from public, anon;
grant execute on function public.criar_projeto_com_membro(text, text, text, text, text, text)
  to authenticated;

commit;

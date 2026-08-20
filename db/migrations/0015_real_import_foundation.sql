-- Foundation for real, tenant-isolated project imports.
-- Existing projects are classified in place; this migration never seeds projects.

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

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.membros_projeto'::regclass
      and conname = 'membros_projeto_papel_check'
  ) then
    alter table public.membros_projeto
      add constraint membros_projeto_papel_check
      check (papel in ('admin', 'membro')) not valid;
  end if;
end;
$$;

alter table public.membros_projeto
  validate constraint membros_projeto_papel_check;

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

create or replace function public.eh_admin_projeto(p_projeto_id uuid)
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
        and mp.papel = 'admin'
    );
$$;

revoke all on function public.eh_admin_projeto(uuid) from public, anon;
grant execute on function public.eh_admin_projeto(uuid) to authenticated;

create or replace function public.proteger_ultimo_admin_projeto()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.papel <> 'admin' then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE'
     and new.papel = 'admin'
     and new.projeto_id = old.projeto_id
     and new.user_id = old.user_id then
    return new;
  end if;

  -- Serializa remoções/rebaixamentos por projeto para que dois admins não
  -- consigam se remover simultaneamente após ambos observarem o outro.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(old.projeto_id::text, 0)
  );

  -- Cascata da exclusão do próprio projeto não é uma mutação isolada da
  -- composição administrativa e deve continuar permitida.
  if not exists (
    select 1 from public.projetos where id = old.projeto_id
  ) then
    return old;
  end if;

  if not exists (
    select 1
    from public.membros_projeto as mp
    where mp.projeto_id = old.projeto_id
      and mp.papel = 'admin'
      and mp.id <> old.id
  ) then
    raise exception 'project must keep at least one admin'
      using errcode = 'check_violation';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.proteger_ultimo_admin_projeto() from public, anon;

drop trigger if exists membros_projeto_proteger_ultimo_admin_delete
  on public.membros_projeto;
create trigger membros_projeto_proteger_ultimo_admin_delete
before delete on public.membros_projeto
for each row execute function public.proteger_ultimo_admin_projeto();

drop trigger if exists membros_projeto_proteger_ultimo_admin_update
  on public.membros_projeto;
create trigger membros_projeto_proteger_ultimo_admin_update
before update of papel, projeto_id, user_id on public.membros_projeto
for each row execute function public.proteger_ultimo_admin_projeto();

alter table public.membros_projeto enable row level security;
alter table public.projetos enable row level security;

drop policy if exists p_membros on public.membros_projeto;
drop policy if exists p_membros_select on public.membros_projeto;
drop policy if exists p_membros_insert on public.membros_projeto;
drop policy if exists p_membros_update on public.membros_projeto;
drop policy if exists p_membros_delete on public.membros_projeto;

create policy p_membros_select on public.membros_projeto
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and public.pode_acessar_projeto(projeto_id)
  );

create policy p_membros_insert on public.membros_projeto
  for insert to authenticated
  with check (
    public.eh_admin_projeto(projeto_id)
    and papel in ('admin', 'membro')
  );

create policy p_membros_update on public.membros_projeto
  for update to authenticated
  using (public.eh_admin_projeto(projeto_id))
  with check (
    public.eh_admin_projeto(projeto_id)
    and papel in ('admin', 'membro')
  );

create policy p_membros_delete on public.membros_projeto
  for delete to authenticated
  using (public.eh_admin_projeto(projeto_id));

drop policy if exists p_projetos_select on public.projetos;
create policy p_projetos_select on public.projetos
  for select to authenticated
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
create policy p_projetos_update on public.projetos
  for update to authenticated
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
create policy p_projetos_delete on public.projetos
  for delete to authenticated
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

  if p_pronac is null or btrim(p_pronac) = '' then
    raise exception 'project identifier is required'
      using errcode = 'check_violation';
  end if;

  if p_nome is null or btrim(p_nome) = '' then
    raise exception 'project name is required'
      using errcode = 'check_violation';
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
  where pronac = btrim(p_pronac);

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
    btrim(p_pronac),
    btrim(p_nome),
    btrim(p_proponente),
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

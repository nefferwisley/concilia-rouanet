-- 0030_integridade_linhagem_importacao.sql
-- Idempotencia de ingestao, linhagem minima, sincronizacao versionada e
-- integridade entre projetos. Expand-only e tolerante ao fork legado 0015-0018.

alter table importacoes
  add column if not exists arquivo_sha256 text,
  add column if not exists linhas_duplicadas integer not null default 0;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'ck_importacoes_linhas_duplicadas') then
    alter table importacoes add constraint ck_importacoes_linhas_duplicadas
      check (linhas_duplicadas >= 0) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ck_importacoes_arquivo_sha256') then
    alter table importacoes add constraint ck_importacoes_arquivo_sha256
      check (arquivo_sha256 is null or arquivo_sha256 ~ '^[0-9a-f]{64}$') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ck_importacoes_status') then
    alter table importacoes add constraint ck_importacoes_status
      check (status in ('iniciando', 'em_progresso', 'sucesso', 'erro')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ck_importacoes_modo') then
    alter table importacoes add constraint ck_importacoes_modo
      check (modo in ('dry_run', 'commit')) not valid;
  end if;
end $$;

alter table importacoes validate constraint ck_importacoes_linhas_duplicadas;
alter table importacoes validate constraint ck_importacoes_arquivo_sha256;
alter table importacoes validate constraint ck_importacoes_status;
alter table importacoes validate constraint ck_importacoes_modo;

alter table transacoes
  add column if not exists source_system text,
  add column if not exists source_record_key text,
  add column if not exists source_importacao_id uuid references importacoes(id) on delete set null,
  add column if not exists data_quality_score numeric(4,3),
  add column if not exists deleted_at timestamptz;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'ck_transacoes_source_record_key') then
    alter table transacoes add constraint ck_transacoes_source_record_key
      check (source_record_key is null or source_record_key ~ '^[0-9a-f]{64}$') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ck_transacoes_data_quality_score') then
    alter table transacoes add constraint ck_transacoes_data_quality_score
      check (data_quality_score is null or data_quality_score between 0 and 1) not valid;
  end if;
end $$;

alter table transacoes validate constraint ck_transacoes_source_record_key;
alter table transacoes validate constraint ck_transacoes_data_quality_score;

create unique index if not exists uq_transacoes_fonte_registro
  on transacoes (projeto_id, source_system, source_record_key)
  where source_system is not null and source_record_key is not null;

alter table documentos_transacao
  add column if not exists source_system text,
  add column if not exists deleted_at timestamptz;

alter table despesas
  add column if not exists source_system text,
  add column if not exists deleted_at timestamptz;

-- Falha antes do DDL relacional se dados legados cruzarem tenants.
do $$
declare inconsistencias bigint;
begin
  select count(*) into inconsistencias from transacoes t join etapas e on e.id = t.etapa_id
   where e.projeto_id <> t.projeto_id;
  if inconsistencias > 0 then raise exception 'integridade: % transacoes referenciam etapa de outro projeto', inconsistencias; end if;

  select count(*) into inconsistencias from despesas d join transacoes t on t.id = d.transacao_id
   where t.projeto_id <> d.projeto_id;
  if inconsistencias > 0 then raise exception 'integridade: % despesas referenciam transacao de outro projeto', inconsistencias; end if;

  select count(*) into inconsistencias from despesas d join etapas e on e.id = d.etapa_id
   where e.projeto_id <> d.projeto_id;
  if inconsistencias > 0 then raise exception 'integridade: % despesas referenciam etapa de outro projeto', inconsistencias; end if;

  select count(*) into inconsistencias from despesas d join rubricas r on r.id = d.rubrica_id
   where r.projeto_id <> d.projeto_id;
  if inconsistencias > 0 then raise exception 'integridade: % despesas referenciam rubrica de outro projeto', inconsistencias; end if;
end $$;

create unique index if not exists uq_etapas_id_projeto on etapas (id, projeto_id);
create unique index if not exists uq_rubricas_id_projeto on rubricas (id, projeto_id);
create unique index if not exists uq_transacoes_id_projeto_integridade on transacoes (id, projeto_id);
create unique index if not exists uq_despesas_id_projeto_integridade on despesas (id, projeto_id);
create unique index if not exists uq_contas_id_projeto_integridade on contas_captadoras (id, projeto_id);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'fk_transacoes_etapa_projeto') then
    alter table transacoes add constraint fk_transacoes_etapa_projeto
      foreign key (etapa_id, projeto_id) references etapas(id, projeto_id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'fk_despesas_transacao_projeto') then
    alter table despesas add constraint fk_despesas_transacao_projeto
      foreign key (transacao_id, projeto_id) references transacoes(id, projeto_id) on delete cascade not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'fk_despesas_etapa_projeto') then
    alter table despesas add constraint fk_despesas_etapa_projeto
      foreign key (etapa_id, projeto_id) references etapas(id, projeto_id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'fk_despesas_rubrica_projeto') then
    alter table despesas add constraint fk_despesas_rubrica_projeto
      foreign key (rubrica_id, projeto_id) references rubricas(id, projeto_id) not valid;
  end if;
end $$;

alter table transacoes validate constraint fk_transacoes_etapa_projeto;
alter table despesas validate constraint fk_despesas_transacao_projeto;
alter table despesas validate constraint fk_despesas_etapa_projeto;
alter table despesas validate constraint fk_despesas_rubrica_projeto;

alter table extrato_movimentos add column if not exists projeto_id uuid;
update extrato_movimentos m set projeto_id = c.projeto_id
  from contas_captadoras c where c.id = m.conta_id and m.projeto_id is null;

do $$ begin
  if exists (select 1 from extrato_movimentos where projeto_id is null) then
    raise exception 'integridade: extrato possui movimentos sem conta/projeto valido';
  end if;
end $$;

alter table extrato_movimentos alter column projeto_id set not null;
create unique index if not exists uq_extrato_id_projeto_integridade on extrato_movimentos (id, projeto_id);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'fk_extrato_conta_projeto') then
    alter table extrato_movimentos add constraint fk_extrato_conta_projeto
      foreign key (conta_id, projeto_id) references contas_captadoras(id, projeto_id) on delete cascade not valid;
  end if;
end $$;
alter table extrato_movimentos validate constraint fk_extrato_conta_projeto;

create or replace function validar_extrato_projeto()
returns trigger language plpgsql set search_path = public as $$
declare conta_projeto uuid;
begin
  select projeto_id into conta_projeto from contas_captadoras where id = new.conta_id;
  if conta_projeto is null then raise exception 'conta captadora % inexistente', new.conta_id; end if;
  if new.projeto_id is not null and new.projeto_id <> conta_projeto then
    raise exception 'movimento e conta pertencem a projetos diferentes';
  end if;
  new.projeto_id := conta_projeto;
  return new;
end $$;

drop trigger if exists trg_extrato_validar_projeto on extrato_movimentos;
create trigger trg_extrato_validar_projeto before insert or update of conta_id, projeto_id
  on extrato_movimentos for each row execute function validar_extrato_projeto();

alter table conciliacao_extrato add column if not exists projeto_id uuid;
update conciliacao_extrato ce set projeto_id = m.projeto_id
  from extrato_movimentos m where m.id = ce.movimento_id and ce.projeto_id is null;

do $$
declare inconsistencias bigint;
begin
  select count(*) into inconsistencias
    from conciliacao_extrato ce
    join extrato_movimentos m on m.id = ce.movimento_id
    left join transacoes t on t.id = ce.transacao_id
    left join despesas d on d.id = ce.despesa_id
   where ce.projeto_id <> m.projeto_id
      or (t.id is not null and t.projeto_id <> ce.projeto_id)
      or (d.id is not null and d.projeto_id <> ce.projeto_id);
  if inconsistencias > 0 then raise exception 'integridade: % conciliacoes cruzam projetos diferentes', inconsistencias; end if;
  if exists (select 1 from conciliacao_extrato where projeto_id is null) then
    raise exception 'integridade: conciliacao possui movimento sem projeto valido';
  end if;
end $$;

alter table conciliacao_extrato alter column projeto_id set not null;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'fk_conciliacao_movimento_projeto') then
    alter table conciliacao_extrato add constraint fk_conciliacao_movimento_projeto
      foreign key (movimento_id, projeto_id) references extrato_movimentos(id, projeto_id) on delete cascade not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'fk_conciliacao_transacao_projeto') then
    alter table conciliacao_extrato add constraint fk_conciliacao_transacao_projeto
      foreign key (transacao_id, projeto_id) references transacoes(id, projeto_id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'fk_conciliacao_despesa_projeto') then
    alter table conciliacao_extrato add constraint fk_conciliacao_despesa_projeto
      foreign key (despesa_id, projeto_id) references despesas(id, projeto_id) not valid;
  end if;
end $$;

alter table conciliacao_extrato validate constraint fk_conciliacao_movimento_projeto;
alter table conciliacao_extrato validate constraint fk_conciliacao_transacao_projeto;
alter table conciliacao_extrato validate constraint fk_conciliacao_despesa_projeto;

create or replace function validar_conciliacao_projeto()
returns trigger language plpgsql set search_path = public as $$
declare movimento_projeto uuid; transacao_projeto uuid; despesa_projeto uuid;
begin
  select projeto_id into movimento_projeto from extrato_movimentos where id = new.movimento_id;
  if movimento_projeto is null then raise exception 'movimento % inexistente', new.movimento_id; end if;
  if new.transacao_id is not null then
    select projeto_id into transacao_projeto from transacoes where id = new.transacao_id;
    if transacao_projeto is distinct from movimento_projeto then
      raise exception 'conciliacao vincula movimento e transacao de projetos diferentes';
    end if;
  end if;
  if new.despesa_id is not null then
    select projeto_id into despesa_projeto from despesas where id = new.despesa_id;
    if despesa_projeto is distinct from movimento_projeto then
      raise exception 'conciliacao vincula movimento e despesa de projetos diferentes';
    end if;
  end if;
  new.projeto_id := movimento_projeto;
  return new;
end $$;

drop trigger if exists trg_conciliacao_validar_projeto on conciliacao_extrato;
create trigger trg_conciliacao_validar_projeto
before insert or update of movimento_id, transacao_id, despesa_id, projeto_id
on conciliacao_extrato for each row execute function validar_conciliacao_projeto();

-- O fork legado já criou parte desta estrutura; os comandos são expand-only.
alter table planilha_revisada
  add column if not exists sync_id text,
  add column if not exists sync_version integer not null default 1,
  add column if not exists sync_hash text,
  add column if not exists sync_updated_by text,
  add column if not exists sync_updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

update planilha_revisada set sync_id = case
  when nullif(trim(controle), '') is not null then 'controle:' || trim(controle)
  else 'linha:' || linha::text end
where sync_id is null;
alter table planilha_revisada alter column sync_id set not null;

create unique index if not exists uq_planilha_sync_id on planilha_revisada (projeto_id, sync_id);

create table if not exists planilha_sync_auditoria (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos(id) on delete cascade,
  sync_id text not null,
  op_id text not null,
  versao_anterior integer,
  versao_nova integer,
  origem text not null check (origem in ('site', 'planilha', 'importacao')),
  alterado_por text,
  antes jsonb,
  depois jsonb,
  criado_em timestamptz not null default now(),
  unique (projeto_id, op_id)
);

-- Compatibilidade com o fork legado, que usou identificadores acentuados.
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='planilha_sync_auditoria' and column_name='versão_anterior')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='planilha_sync_auditoria' and column_name='versao_anterior') then
    alter table planilha_sync_auditoria rename column "versão_anterior" to versao_anterior;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='planilha_sync_auditoria' and column_name='versão_nova')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='planilha_sync_auditoria' and column_name='versao_nova') then
    alter table planilha_sync_auditoria rename column "versão_nova" to versao_nova;
  end if;
end $$;

create table if not exists planilha_sync_conflitos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos(id) on delete cascade,
  sync_id text not null,
  op_id text not null,
  versao_esperada integer not null,
  versao_encontrada integer not null,
  alteracao_proposta jsonb not null,
  detectado_por text,
  status text not null default 'PENDENTE' check (status in ('PENDENTE', 'RESOLVIDO', 'DESCARTADO')),
  criado_em timestamptz not null default now(),
  resolvido_em timestamptz,
  unique (projeto_id, op_id)
);

do $$ begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='planilha_sync_conflitos' and column_name='versão_esperada')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='planilha_sync_conflitos' and column_name='versao_esperada') then
    alter table planilha_sync_conflitos rename column "versão_esperada" to versao_esperada;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='planilha_sync_conflitos' and column_name='versão_encontrada')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='planilha_sync_conflitos' and column_name='versao_encontrada') then
    alter table planilha_sync_conflitos rename column "versão_encontrada" to versao_encontrada;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='planilha_sync_conflitos' and column_name='alteração_proposta')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='planilha_sync_conflitos' and column_name='alteracao_proposta') then
    alter table planilha_sync_conflitos rename column "alteração_proposta" to alteracao_proposta;
  end if;
end $$;

alter table planilha_sync_auditoria enable row level security;
alter table planilha_sync_conflitos enable row level security;
drop policy if exists p_planilha_sync_auditoria on planilha_sync_auditoria;
create policy p_planilha_sync_auditoria on planilha_sync_auditoria for all
  using (pode_acessar_projeto(projeto_id)) with check (pode_acessar_projeto(projeto_id));
drop policy if exists p_planilha_sync_conflitos on planilha_sync_conflitos;
create policy p_planilha_sync_conflitos on planilha_sync_conflitos for all
  using (pode_acessar_projeto(projeto_id)) with check (pode_acessar_projeto(projeto_id));

create index if not exists ix_planilha_sync_auditoria_projeto
  on planilha_sync_auditoria (projeto_id, criado_em desc);
create index if not exists ix_planilha_sync_conflitos_pendentes
  on planilha_sync_conflitos (projeto_id, criado_em desc) where status = 'PENDENTE';

alter table planilha_revisada drop constraint if exists planilha_revisada_projeto_id_linha_key;
create unique index if not exists uq_planilha_revisada_linha_ativa
  on planilha_revisada (projeto_id, linha) where deleted_at is null;

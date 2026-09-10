-- ============================================================
-- 0019_processing_job_idempotency.sql
-- Chave idempotente, índices de alta performance para fila e timestamps de execução
-- ============================================================

do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'processing_jobs' and column_name = 'idempotency_key') then
    alter table processing_jobs add column idempotency_key text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'processing_jobs' and column_name = 'source_system') then
    alter table processing_jobs add column source_system text not null default 'pipeline_v2';
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'processing_jobs' and column_name = 'extractor_version') then
    alter table processing_jobs add column extractor_version text default '2.0.0';
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'processing_jobs' and column_name = 'last_attempt_at') then
    alter table processing_jobs add column last_attempt_at timestamptz;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'processing_jobs' and column_name = 'completed_at') then
    alter table processing_jobs add column completed_at timestamptz;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'processing_jobs' and column_name = 'is_deleted') then
    alter table processing_jobs add column is_deleted boolean not null default false;
  end if;
end $$;

-- Índice único de idempotência (impede duplicar o mesmo job de extração)
create unique index if not exists uq_processing_jobs_idempotency
  on processing_jobs(idempotency_key)
  where idempotency_key is not null and is_deleted = false;

-- Índice para polling eficiente de jobs pendentes
create index if not exists idx_processing_jobs_queue_poll
  on processing_jobs(status, available_at)
  where status in ('PENDING', 'PROCESSING') and is_deleted = false;

-- Índice para relacionamento com arquivo
create index if not exists idx_processing_jobs_file_id
  on processing_jobs(file_id);

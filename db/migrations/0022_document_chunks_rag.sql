-- ============================================================
-- 0018_document_chunks_rag.sql
-- RAG Documental de Produção - Corpus, Embeddings e Observabilidade
-- ============================================================

-- Garante que a extensão pgvector existe (tenta em public e extensões)
do $$
begin
  create extension if not exists vector;
exception
  when others then
    begin
      create extension if not exists vector with schema extensions;
    exception
      when others then
        raise notice 'pgvector extension could not be created automatically; proceeding if already installed.';
    end;
end $$;

-- 1. Tabela de Chunks Documentais
create table if not exists document_chunks (
  id           uuid primary key default gen_random_uuid(),
  project_id   text not null,
  document_id  text not null,
  chunk_index  integer not null,
  content      text not null,
  embedding    vector(768),
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  constraint uq_document_chunks_project_doc_chunk unique (project_id, document_id, chunk_index)
);

-- Índices de consulta rápida e isolamento multi-tenant
create index if not exists ix_document_chunks_project_id on document_chunks(project_id);
create index if not exists ix_document_chunks_document_id on document_chunks(document_id);

-- Índice GIN em metadados para busca lexical de CNPJ, CPF, datas, valores e identificadores
create index if not exists ix_document_chunks_metadata on document_chunks using gin(metadata);

-- Índice HNSW para busca vetorial com métrica de distância cosseno
do $$
begin
  if not exists (
    select 1 from pg_indexes where indexname = 'ix_document_chunks_embedding'
  ) then
    create index ix_document_chunks_embedding
      on document_chunks using hnsw (embedding vector_cosine_ops);
  end if;
exception
  when others then
    raise notice 'HNSW index could not be created directly (vector type or memory limit); will use ivfflat or sequential search if needed.';
end $$;

-- 2. Tabela Observável de Logs de Consulta RAG (Fase 7 - Telemetria Auditável)
create table if not exists rag_query_logs (
  id                   uuid primary key default gen_random_uuid(),
  project_id           text not null,
  query_normalized     text not null,
  filters              jsonb not null default '{}'::jsonb,
  corpus_version       text not null default '1.0',
  retrieved_chunk_ids  jsonb not null default '[]'::jsonb,
  scores               jsonb not null default '[]'::jsonb,
  latency_embedding_ms real default 0,
  latency_search_ms    real default 0,
  latency_generation_ms real default 0,
  total_latency_ms     real default 0,
  model                text,
  feedback             text,
  needs_human_review   boolean not null default false,
  human_review_reason  text,
  created_at           timestamptz not null default now()
);

create index if not exists ix_rag_query_logs_project on rag_query_logs(project_id);
create index if not exists ix_rag_query_logs_created_at on rag_query_logs(created_at desc);

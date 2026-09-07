-- RLS decide quais linhas cada pessoa pode acessar; estes GRANTs apenas
-- permitem que o PostgREST execute as operações já restringidas pelas policies.
grant select, insert, update, delete on table public.project_snapshots to authenticated, service_role;
grant select, insert, update, delete on table public.document_assets to authenticated, service_role;

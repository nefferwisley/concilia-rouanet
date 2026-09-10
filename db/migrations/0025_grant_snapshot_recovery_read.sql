-- Recuperação de projetos legados: a API lê snapshots somente do próprio
-- owner_id autenticado e a RLS reforça a mesma condição. Este privilégio é
-- exclusivamente de leitura e não permite listar snapshots de outra conta.
grant select on table public.project_snapshots to authenticated;

-- A rota usa a tabela apenas como fonte de recuperação durante a migração.

